import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase37-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('reference scheme governance remains proposal-only with separation, exact targets, expiry, and revocation controls',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase37-identity',evidence_sha256:'d'.repeat(64)})).response.status,200);
  assert.equal((await transition('IN_REVIEW')).response.status,200);
  assert.equal((await transition('APPROVED',{reason_code:'REQUEST_AND_SCOPE_VERIFIED'})).response.status,200);
  const plan=await post(`/api/v1/privacy-operations/requests/${requestId}/fulfilment-plans`,operatorAuth,'plan');
  const planId=plan.payload.data.id;
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/impact-assessment`,operatorAuth,'impact')).response.status,200);

  const privacyIssued=await post('/api/v1/local-demo/privacy-approver/privacy/session','','privacy-session');
  const securityIssued=await post('/api/v1/local-demo/privacy-approver/security/session','','security-session');
  const privacyAuth=`Bearer ${privacyIssued.payload.data.access_token}`;
  const securityAuth=`Bearer ${securityIssued.payload.data.access_token}`;
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,privacyAuth,'privacy-approval',{decision:'APPROVE',reason_code:'PRIVACY_SCOPE_VERIFIED'})).response.status,200);
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,securityAuth,'security-approval',{decision:'APPROVE',reason_code:'SECURITY_SCOPE_VERIFIED'})).payload.data.status,'DUAL_APPROVED');
  const sealed=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/package-manifests`,operatorAuth,'seal');
  const manifestId=sealed.payload.data.id;
  assert.equal((await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/recovery-checkpoints`,operatorAuth,'checkpoint')).response.status,201);
  const readiness=await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/execution-readiness-reviews`,securityAuth,'readiness');
  const handoff=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${readiness.payload.data.id}/handoff-packets`,securityAuth,'handoff');
  const validation=await post(`/api/v1/privacy-operations/execution-handoff-packets/${handoff.payload.data.id}/evidence-validation-contracts`,securityAuth,'validation');
  const adapter=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validation.payload.data.id}/intake-adapter-contracts`,securityAuth,'adapter');
  const acceptance=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapter.payload.data.id}/connection-acceptance-packets`,securityAuth,'acceptance');
  const queue=await post(`/api/v1/privacy-operations/connection-acceptance-packets/${acceptance.payload.data.id}/configuration-evidence-queue-contracts`,securityAuth,'queue');
  const envelope=await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${queue.payload.data.id}/submission-envelope-contracts`,securityAuth,'envelope');
  assert.equal(envelope.response.status,201);
  const envelopeId=envelope.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/submission-envelope-contracts/${envelopeId}/reference-scheme-governance-contracts`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/submission-envelope-contracts/${envelopeId}/reference-scheme-governance-contracts`,securityAuth,'governance-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'SCHEME_GOVERNANCE_ONLY_PROPOSAL_MISSING_EXTERNAL');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.equal(first.payload.data.contract_manifest.proposal_required_fields.length,10);
  assert.equal(first.payload.data.contract_manifest.target_restriction_fields.length,6);
  assert.equal(first.payload.data.contract_manifest.lifecycle_states.length,7);
  assert.equal(first.payload.data.contract_manifest.reapproval_triggers.length,6);
  assert.equal(first.payload.data.policies.length,6);
  assert.equal(first.payload.data.policies.every((policy)=>policy.required_approver_roles.length===2&&policy.approvers_must_be_distinct&&policy.proposer_must_differ_from_approvers),true);
  assert.equal(first.payload.data.policies.every((policy)=>policy.target_scope_must_be_exact&&!policy.wildcard_authority_allowed&&!policy.unrestricted_path_allowed),true);
  assert.equal(first.payload.data.policies.every((policy)=>policy.revocation_required&&policy.expiry_required&&policy.reapproval_required),true);
  assert.equal(first.payload.data.policies.every((policy)=>policy.maximum_validity_status==='MISSING_EXTERNAL'&&policy.maximum_validity_seconds===null),true);
  assert.equal(first.payload.data.policies.every((policy)=>policy.proposal_status==='MISSING_EXTERNAL'&&policy.current_lifecycle_state==='NOT_PROPOSED'),true);
  assert.equal(first.payload.data.policies.every((policy)=>policy.proposal_id===null&&policy.proposed_scheme_name===null&&policy.authority_pattern===null&&policy.bucket_or_container===null&&policy.path_prefix===null&&policy.region===null&&policy.tenant_reference===null),true);
  assert.equal(first.payload.data.policies.every((policy)=>policy.proposer_identity_reference===null&&policy.privacy_reviewer_identity_reference===null&&policy.security_reviewer_identity_reference===null&&policy.approved_at===null&&policy.expires_at===null&&policy.revoked_at===null),true);
  assert.equal(first.payload.data.policies.every((policy)=>!policy.allowlist_activation_allowed&&!policy.metadata_submission_allowed&&!policy.automatic_promotion_allowed),true);
  assert.equal(first.payload.data.boundary.scheme_proposal_submission_enabled,false);
  assert.equal(first.payload.data.boundary.scheme_approval_decision_write_enabled,false);
  assert.equal(first.payload.data.boundary.allowlist_activation_enabled,false);
  assert.equal(first.payload.data.boundary.metadata_submission_enabled,false);
  assert.equal(first.payload.data.connection_authorized,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(`/api/v1/privacy-operations/submission-envelope-contracts/${envelopeId}/reference-scheme-governance-contracts`,securityAuth,'governance-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);

  const newerEnvelope=await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${queue.payload.data.id}/submission-envelope-contracts`,securityAuth,'newer-envelope');
  assert.equal(newerEnvelope.response.status,201);
  const staleGovernance=await post(`/api/v1/privacy-operations/submission-envelope-contracts/${envelopeId}/reference-scheme-governance-contracts`,securityAuth,'stale-governance');
  assert.equal(staleGovernance.response.status,409);
  assert.equal(staleGovernance.payload.error.code,'SCHEME_GOVERNANCE_ENVELOPE_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/reference-scheme-governance-contracts/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/reference-scheme-governance-contracts/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  assert.equal((await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${second.payload.data.id}/proposals`,securityAuth,'unsupported-proposal',{scheme_name:'forbidden'})).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${second.payload.data.id}/approvals`,securityAuth,'unsupported-approval')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${second.payload.data.id}/activate`,securityAuth,'unsupported-activate')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${second.payload.data.id}/revoke`,securityAuth,'unsupported-revoke')).response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'SCHEME_POLICY_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase37',evidence_sha256:'3'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
