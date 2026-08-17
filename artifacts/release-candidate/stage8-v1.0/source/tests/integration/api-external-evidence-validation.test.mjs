import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase32-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('external evidence validation remains policy-only with expiry, revocation, dual review, and minimized metadata',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase32-identity',evidence_sha256:'f'.repeat(64)})).response.status,200);
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
  assert.equal(sealed.response.status,201);
  assert.equal((await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/recovery-checkpoints`,operatorAuth,'checkpoint')).response.status,201);
  const readiness=await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/execution-readiness-reviews`,securityAuth,'readiness');
  assert.equal(readiness.response.status,201);
  const handoff=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${readiness.payload.data.id}/handoff-packets`,securityAuth,'handoff');
  assert.equal(handoff.response.status,201);
  const packetId=handoff.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/execution-handoff-packets/${packetId}/evidence-validation-contracts`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/execution-handoff-packets/${packetId}/evidence-validation-contracts`,securityAuth,'contract-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.equal(first.payload.data.rules.length,6);
  assert.equal(first.payload.data.rules.every((rule)=>rule.initial_state==='NOT_SUBMITTED'&&rule.current_status==='AWAITING_EXTERNAL_CHANNEL'),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.state_transitions.length===13),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.allowed_metadata_fields.length===6&&rule.forbidden_fields.length===7),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.required_approver_roles.join(',')==='PRIVACY_APPROVER,SECURITY_APPROVER'),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.distinct_reviewers_required&&!rule.self_review_allowed),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.expiry_required&&rule.expiry_policy_status==='MISSING_EXTERNAL'&&rule.max_age_seconds===null),true);
  assert.equal(first.payload.data.rules.every((rule)=>rule.revocation_check_required&&!rule.raw_content_storage_allowed&&rule.submission_channel_status==='MISSING_EXTERNAL'),true);
  assert.equal(first.payload.data.boundary.evidence_submission_enabled,false);
  assert.equal(first.payload.data.boundary.evidence_state_transition_enabled,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(`/api/v1/privacy-operations/execution-handoff-packets/${packetId}/evidence-validation-contracts`,securityAuth,'contract-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);

  const newerHandoff=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${readiness.payload.data.id}/handoff-packets`,securityAuth,'newer-handoff');
  assert.equal(newerHandoff.response.status,201);
  const staleContract=await post(`/api/v1/privacy-operations/execution-handoff-packets/${packetId}/evidence-validation-contracts`,securityAuth,'stale-contract');
  assert.equal(staleContract.response.status,409);
  assert.equal(staleContract.payload.error.code,'EVIDENCE_VALIDATION_HANDOFF_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/evidence-validation-contracts/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/evidence-validation-contracts/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  assert.equal((await post(`/api/v1/privacy-operations/evidence-validation-contracts/${second.payload.data.id}/submissions`,securityAuth,'unsupported-submission',{raw_content:'forbidden'})).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/evidence-validation-contracts/${second.payload.data.id}/transition`,securityAuth,'unsupported-transition',{to_state:'VERIFIED'})).response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'VALIDATION_POLICY_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase32',evidence_sha256:'1'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
