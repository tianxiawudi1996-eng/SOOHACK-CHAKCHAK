import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase28-${label}-${crypto.randomUUID()}`;
const writeHeaders=(authorization,label)=>({authorization,'content-type':'application/json','idempotency-key':key(label)});
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{method:'POST',headers:writeHeaders(authorization,label),body:JSON.stringify(body)});
  return {response,payload:await response.json()};
};

test('dry-run plan requires legal-hold clearance and two distinct approvals without executing deletion',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','', 'student-session');
  assert.equal(studentIssued.response.status,201);
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'DELETION',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','', 'operator-session');
  assert.equal(operatorIssued.response.status,201);
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=async(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase28-identity',evidence_sha256:'c'.repeat(64)})).response.status,200);
  assert.equal((await transition('IN_REVIEW')).response.status,200);
  assert.equal((await transition('APPROVED',{reason_code:'REQUEST_AND_SCOPE_VERIFIED'})).response.status,200);

  const planCreated=await post(`/api/v1/privacy-operations/requests/${requestId}/fulfilment-plans`,operatorAuth,'plan');
  assert.equal(planCreated.response.status,201);
  const planId=planCreated.payload.data.id;
  assert.equal(planCreated.payload.data.execution_mode,'DRY_RUN_ONLY');
  const assessed=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/impact-assessment`,operatorAuth,'impact');
  assert.equal(assessed.response.status,200);
  assert.equal(assessed.payload.data.status,'IMPACT_ASSESSED');
  assert.equal(assessed.payload.data.impact.profile_rows,1);
  assert.ok(assessed.payload.data.impact.preserved_privacy_records>=1);

  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/fulfilment-plans/${planId}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);

  const privacyIssued=await post('/api/v1/local-demo/privacy-approver/privacy/session','', 'privacy-session');
  const securityIssued=await post('/api/v1/local-demo/privacy-approver/security/session','', 'security-session');
  assert.equal(privacyIssued.response.status,201);
  assert.equal(securityIssued.response.status,201);
  const privacyAuth=`Bearer ${privacyIssued.payload.data.access_token}`;
  const securityAuth=`Bearer ${securityIssued.payload.data.access_token}`;

  const hold=await post(`/api/v1/privacy-operations/requests/${requestId}/legal-holds`,privacyAuth,'hold',{reason_code:'REGULATORY_RETENTION_REVIEW'});
  assert.equal(hold.response.status,201);
  const blocked=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,securityAuth,'blocked-approval',{decision:'APPROVE',reason_code:'SECURITY_SCOPE_VERIFIED'});
  assert.equal(blocked.response.status,409);
  assert.equal(blocked.payload.error.code,'ACTIVE_LEGAL_HOLD');
  const released=await post(`/api/v1/privacy-operations/legal-holds/${hold.payload.data.id}/release`,privacyAuth,'release',{reason_code:'RETENTION_REVIEW_CLEARED'});
  assert.equal(released.response.status,200);

  const privacyApproval=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,privacyAuth,'privacy-approval',{decision:'APPROVE',reason_code:'PRIVACY_SCOPE_VERIFIED'});
  assert.equal(privacyApproval.response.status,200);
  assert.equal(privacyApproval.payload.data.status,'IMPACT_ASSESSED');
  const securityApproval=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,securityAuth,'security-approval',{decision:'APPROVE',reason_code:'SECURITY_SCOPE_VERIFIED'});
  assert.equal(securityApproval.response.status,200);
  assert.equal(securityApproval.payload.data.status,'DUAL_APPROVED');
  assert.deepEqual(securityApproval.payload.data.approvals.map(({approval_role})=>approval_role),['PRIVACY_APPROVER','SECURITY_APPROVER']);
  assert.equal(securityApproval.payload.data.boundary.destructive_executor_enabled,false);

  const completion=await transition('COMPLETED',{reason_code:'DUAL_APPROVAL_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution',evidence_sha256:'d'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
  const detail=await fetch(`${baseUrl}/api/v1/privacy/requests/${requestId}`,{headers:{authorization:studentAuth}}).then((response)=>response.json());
  assert.equal(detail.data.status,'APPROVED');
});
