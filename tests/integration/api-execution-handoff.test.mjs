import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase31-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('execution handoff issues immutable instructions but accepts no external evidence or execution authority',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase31-identity',evidence_sha256:'f'.repeat(64)})).response.status,200);
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
  assert.equal(readiness.payload.data.status,'BLOCKED_EXTERNAL');
  const reviewId=readiness.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${reviewId}/handoff-packets`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${reviewId}/handoff-packets`,securityAuth,'packet-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'AWAITING_EXTERNAL_SUBMISSION');
  assert.equal(first.payload.data.revision,1);
  assert.match(first.payload.data.packet_sha256,/^[0-9a-f]{64}$/);
  assert.equal(hashCanonical(first.payload.data.packet_manifest),first.payload.data.packet_sha256);
  assert.equal(first.payload.data.requirements.length,6);
  assert.equal(new Set(first.payload.data.requirements.map(({owner_role})=>owner_role)).size,6);
  assert.equal(first.payload.data.requirements.reduce((sum,item)=>sum+item.required_evidence.length,0),12);
  assert.equal(first.payload.data.requirements.every((item)=>item.status==='EXTERNAL_SUBMISSION_REQUIRED'&&item.submission_route_status==='MISSING_EXTERNAL'),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.required_approver_roles.join(',')==='PRIVACY_APPROVER,SECURITY_APPROVER'),true);
  assert.equal(first.payload.data.kill_switch_engaged,true);
  assert.equal(first.payload.data.execution_authorized,false);
  assert.equal(first.payload.data.boundary.external_submission_write_enabled,false);
  assert.equal(first.payload.data.boundary.external_evidence_verification_enabled,false);

  const second=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${reviewId}/handoff-packets`,securityAuth,'packet-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_packet_id,first.payload.data.id);

  const newerReadiness=await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/execution-readiness-reviews`,securityAuth,'newer-readiness');
  assert.equal(newerReadiness.response.status,201);
  const staleHandoff=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${reviewId}/handoff-packets`,securityAuth,'stale-handoff');
  assert.equal(staleHandoff.response.status,409);
  assert.equal(staleHandoff.payload.error.code,'EXECUTION_HANDOFF_READINESS_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/execution-handoff-packets/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/execution-handoff-packets/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  const unsupportedEvidenceWrite=await post(`/api/v1/privacy-operations/execution-handoff-packets/${second.payload.data.id}/evidence`,securityAuth,'unsupported-evidence',{evidence_reference:'SHOULD-NOT-BE-ACCEPTED'});
  assert.equal(unsupportedEvidenceWrite.response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'HANDOFF_PACKET_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase31',evidence_sha256:'1'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
