import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase36-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('submission envelope policy defines fail-closed metadata validation without accepting evidence or activating schemes',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase36-identity',evidence_sha256:'e'.repeat(64)})).response.status,200);
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
  assert.equal(queue.response.status,201);
  const queueId=queue.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${queueId}/submission-envelope-contracts`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${queueId}/submission-envelope-contracts`,securityAuth,'policy-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'ENVELOPE_POLICY_ONLY_ALLOWLIST_APPROVAL_MISSING');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.equal(first.payload.data.contract_manifest.required_envelope_fields.length,10);
  assert.equal(first.payload.data.contract_manifest.reference_scheme_approval_steps.length,4);
  assert.equal(first.payload.data.contract_manifest.rejection_reason_codes.length,10);
  assert.equal(first.payload.data.rules.length,6);
  assert.equal(first.payload.data.rules.flatMap((rule)=>rule.allowed_evidence_types).length,12);
  assert.equal(first.payload.data.rules.every((rule)=>rule.required_envelope_fields.length===10),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.reference_scheme_allowlist_status==='MISSING_EXTERNAL_APPROVAL'&&rule.allowed_reference_schemes.length===0&&!rule.allowlist_activation_allowed),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.submission_id_format==='UUID_V4'&&rule.idempotency_scope==='QUEUE_CONTRACT_CONTROL_KEY_SUBMISSION_ID'),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.idempotency_retention_status==='MISSING_EXTERNAL'&&rule.idempotency_retention_seconds===null),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.rejection_reason_codes.length===10&&rule.ingress_validation_mode==='REJECT_ALL_UNTIL_ALLOWLIST_APPROVED'),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.submission_acceptance_status==='NOT_ACCEPTING'&&rule.submission_id===null&&rule.artifact_reference===null&&rule.artifact_sha256===null&&rule.issuer_reference===null&&rule.submitted_at===null),true);
  assert.equal(first.payload.data.rules.every((rule)=>!rule.raw_payload_storage_allowed&&!rule.credential_material_storage_allowed&&!rule.secret_material_storage_allowed&&!rule.automatic_promotion_allowed),true);
  assert.equal(first.payload.data.boundary.metadata_submission_enabled,false);
  assert.equal(first.payload.data.boundary.reference_scheme_allowlist_write_enabled,false);
  assert.equal(first.payload.data.boundary.allowlist_activation_enabled,false);
  assert.equal(first.payload.data.boundary.external_reference_fetch_enabled,false);
  assert.equal(first.payload.data.connection_authorized,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${queueId}/submission-envelope-contracts`,securityAuth,'policy-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);

  const newerQueue=await post(`/api/v1/privacy-operations/connection-acceptance-packets/${acceptance.payload.data.id}/configuration-evidence-queue-contracts`,securityAuth,'newer-queue');
  assert.equal(newerQueue.response.status,201);
  const stalePolicy=await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${queueId}/submission-envelope-contracts`,securityAuth,'stale-policy');
  assert.equal(stalePolicy.response.status,409);
  assert.equal(stalePolicy.payload.error.code,'SUBMISSION_POLICY_QUEUE_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/submission-envelope-contracts/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/submission-envelope-contracts/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  assert.equal((await post(`/api/v1/privacy-operations/submission-envelope-contracts/${second.payload.data.id}/submissions`,securityAuth,'unsupported-submit',{submission_id:crypto.randomUUID()})).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/submission-envelope-contracts/${second.payload.data.id}/allowlist-approvals`,securityAuth,'unsupported-allowlist')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/submission-envelope-contracts/${second.payload.data.id}/activate`,securityAuth,'unsupported-activate')).response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'SUBMISSION_POLICY_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase36',evidence_sha256:'2'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
