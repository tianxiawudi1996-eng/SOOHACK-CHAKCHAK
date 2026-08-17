import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase39-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('reference proof handoff defines issuer, TTL, revocation, and DNS metadata without accepting evidence',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;
  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase39-identity',evidence_sha256:'d'.repeat(64)})).response.status,200);
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
  const executionHandoff=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${readiness.payload.data.id}/handoff-packets`,securityAuth,'execution-handoff');
  const validation=await post(`/api/v1/privacy-operations/execution-handoff-packets/${executionHandoff.payload.data.id}/evidence-validation-contracts`,securityAuth,'validation');
  const adapter=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validation.payload.data.id}/intake-adapter-contracts`,securityAuth,'adapter');
  const acceptance=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapter.payload.data.id}/connection-acceptance-packets`,securityAuth,'acceptance');
  const queue=await post(`/api/v1/privacy-operations/connection-acceptance-packets/${acceptance.payload.data.id}/configuration-evidence-queue-contracts`,securityAuth,'queue');
  const envelope=await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${queue.payload.data.id}/submission-envelope-contracts`,securityAuth,'envelope');
  const governance=await post(`/api/v1/privacy-operations/submission-envelope-contracts/${envelope.payload.data.id}/reference-scheme-governance-contracts`,securityAuth,'governance');
  const targetValidation=await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${governance.payload.data.id}/reference-target-validation-contracts`,securityAuth,'target-validation');
  assert.equal(targetValidation.response.status,201);
  const targetValidationId=targetValidation.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${targetValidationId}/reference-proof-handoff-contracts`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${targetValidationId}/reference-proof-handoff-contracts`,securityAuth,'proof-handoff-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.equal(first.payload.data.contract_manifest.proof_required_fields.length,12);
  assert.equal(first.payload.data.contract_manifest.issuer_trust_requirements.length,8);
  assert.equal(first.payload.data.contract_manifest.lifecycle_states.length,7);
  assert.equal(first.payload.data.contract_manifest.revalidation_triggers.length,8);
  assert.equal(first.payload.data.contract_manifest.dns_snapshot_required_fields.length,8);
  assert.equal(first.payload.data.requirements.length,6);
  assert.equal(first.payload.data.requirements.every((item)=>item.metadata_only&&item.immutable_reference_required&&item.signature_required&&item.expiry_required&&item.revocation_check_required),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.issuer_must_differ_from_reviewer&&!item.raw_evidence_storage_allowed&&!item.credential_material_storage_allowed&&!item.secret_material_storage_allowed),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.maximum_proof_ttl_seconds===null&&item.revalidation_sla_seconds===null&&item.proof_id===null&&item.issuer_identity_reference===null),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.evidence_reference===null&&item.dns_snapshot_reference===null&&item.issued_at===null&&item.verified_at===null),true);
  assert.equal(first.payload.data.requirements.every((item)=>!item.handoff_submission_allowed&&!item.proof_validation_execution_allowed&&!item.dns_snapshot_capture_allowed&&!item.revocation_polling_allowed&&!item.allowlist_write_allowed&&!item.automatic_promotion_allowed),true);
  assert.equal(first.payload.data.boundary.proof_handoff_submission_enabled,false);
  assert.equal(first.payload.data.boundary.dns_snapshot_capture_enabled,false);
  assert.equal(first.payload.data.proof_intake_authorized,false);
  assert.equal(first.payload.data.network_connection_authorized,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${targetValidationId}/reference-proof-handoff-contracts`,securityAuth,'proof-handoff-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);
  const newerTarget=await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${governance.payload.data.id}/reference-target-validation-contracts`,securityAuth,'newer-target');
  assert.equal(newerTarget.response.status,201);
  const staleHandoff=await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${targetValidationId}/reference-proof-handoff-contracts`,securityAuth,'stale-handoff');
  assert.equal(staleHandoff.response.status,409);
  assert.equal(staleHandoff.payload.error.code,'PROOF_HANDOFF_TARGET_VALIDATION_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/reference-proof-handoff-contracts/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/reference-proof-handoff-contracts/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  assert.equal((await post(`/api/v1/privacy-operations/reference-proof-handoff-contracts/${second.payload.data.id}/proofs`,securityAuth,'unsupported-proof',{proof_type:'forbidden'})).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-proof-handoff-contracts/${second.payload.data.id}/issuer-decisions`,securityAuth,'unsupported-issuer')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-proof-handoff-contracts/${second.payload.data.id}/dns-snapshots`,securityAuth,'unsupported-dns')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-proof-handoff-contracts/${second.payload.data.id}/revalidate`,securityAuth,'unsupported-revalidate')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-proof-handoff-contracts/${second.payload.data.id}/activate`,securityAuth,'unsupported-activate')).response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'PROOF_POLICY_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase39',evidence_sha256:'3'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
