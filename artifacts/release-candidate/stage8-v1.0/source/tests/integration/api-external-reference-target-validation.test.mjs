import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase38-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('reference target validation remains a fail-closed policy without DNS, fetch, or allowlist writes',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase38-identity',evidence_sha256:'d'.repeat(64)})).response.status,200);
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
  const governance=await post(`/api/v1/privacy-operations/submission-envelope-contracts/${envelope.payload.data.id}/reference-scheme-governance-contracts`,securityAuth,'governance');
  assert.equal(governance.response.status,201);
  const governanceId=governance.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${governanceId}/reference-target-validation-contracts`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${governanceId}/reference-target-validation-contracts`,securityAuth,'target-validation-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'TARGET_VALIDATION_POLICY_ONLY_EXTERNAL_PROOF_MISSING');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.equal(first.payload.data.contract_manifest.normalization_steps.length,8);
  assert.equal(first.payload.data.contract_manifest.rejection_rules.length,14);
  assert.equal(first.payload.data.contract_manifest.ownership_proof_types.length,6);
  assert.equal(first.payload.data.contract_manifest.forbidden_address_classes.length,8);
  assert.equal(first.payload.data.rules.length,6);
  assert.equal(first.payload.data.rules.every((rule)=>rule.fail_closed&&rule.single_parse_required&&rule.idna_ascii_required&&rule.unicode_confusable_check_required),true);
  assert.equal(first.payload.data.rules.every((rule)=>!rule.wildcard_allowed&&!rule.userinfo_allowed&&!rule.ip_literal_allowed&&!rule.path_traversal_allowed&&!rule.encoded_separator_allowed),true);
  assert.equal(first.payload.data.rules.every((rule)=>!rule.redirect_allowed&&rule.maximum_redirects===0&&rule.dns_rebinding_guard_required&&!rule.private_network_allowed),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.target_status==='MISSING_EXTERNAL'&&rule.dns_proof_status==='MISSING_EXTERNAL'&&rule.ownership_proof_status==='MISSING_EXTERNAL'),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.normalized_scheme===null&&rule.normalized_authority===null&&rule.normalized_path_prefix===null&&rule.ownership_evidence_reference===null&&rule.dns_snapshot_reference===null),true);
  assert.equal(first.payload.data.rules.every((rule)=>!rule.proposal_validation_execution_allowed&&!rule.dns_lookup_allowed&&!rule.external_reference_fetch_allowed&&!rule.allowlist_write_allowed),true);
  assert.equal(first.payload.data.boundary.target_value_write_enabled,false);
  assert.equal(first.payload.data.boundary.dns_resolution_enabled,false);
  assert.equal(first.payload.data.boundary.redirect_follow_enabled,false);
  assert.equal(first.payload.data.network_connection_authorized,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${governanceId}/reference-target-validation-contracts`,securityAuth,'target-validation-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);

  const newerGovernance=await post(`/api/v1/privacy-operations/submission-envelope-contracts/${envelope.payload.data.id}/reference-scheme-governance-contracts`,securityAuth,'newer-governance');
  assert.equal(newerGovernance.response.status,201);
  const staleValidation=await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${governanceId}/reference-target-validation-contracts`,securityAuth,'stale-validation');
  assert.equal(staleValidation.response.status,409);
  assert.equal(staleValidation.payload.error.code,'TARGET_VALIDATION_GOVERNANCE_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/reference-target-validation-contracts/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/reference-target-validation-contracts/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  assert.equal((await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${second.payload.data.id}/targets`,securityAuth,'unsupported-target',{authority:'127.0.0.1'})).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${second.payload.data.id}/ownership-proofs`,securityAuth,'unsupported-proof')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${second.payload.data.id}/dns-validate`,securityAuth,'unsupported-dns')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${second.payload.data.id}/activate`,securityAuth,'unsupported-activate')).response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'TARGET_POLICY_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase38',evidence_sha256:'3'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
