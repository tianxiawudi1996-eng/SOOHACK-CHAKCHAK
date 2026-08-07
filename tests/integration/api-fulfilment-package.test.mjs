import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase29-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('sealed package expires into an immutable revalidated successor without source mutation',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase29-identity',evidence_sha256:'e'.repeat(64)})).response.status,200);
  assert.equal((await transition('IN_REVIEW')).response.status,200);
  assert.equal((await transition('APPROVED',{reason_code:'REQUEST_AND_SCOPE_VERIFIED'})).response.status,200);
  const plan=await post(`/api/v1/privacy-operations/requests/${requestId}/fulfilment-plans`,operatorAuth,'plan');
  const planId=plan.payload.data.id;
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/impact-assessment`,operatorAuth,'impact')).response.status,200);

  const premature=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/package-manifests`,operatorAuth,'premature');
  assert.equal(premature.response.status,409);
  assert.equal(premature.payload.error.code,'FULFILMENT_PLAN_NOT_DUAL_APPROVED');

  const privacyIssued=await post('/api/v1/local-demo/privacy-approver/privacy/session','','privacy-session');
  const securityIssued=await post('/api/v1/local-demo/privacy-approver/security/session','','security-session');
  const privacyAuth=`Bearer ${privacyIssued.payload.data.access_token}`;
  const securityAuth=`Bearer ${securityIssued.payload.data.access_token}`;
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,privacyAuth,'privacy-approval',{decision:'APPROVE',reason_code:'PRIVACY_SCOPE_VERIFIED'})).response.status,200);
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,securityAuth,'security-approval',{decision:'APPROVE',reason_code:'SECURITY_SCOPE_VERIFIED'})).payload.data.status,'DUAL_APPROVED');

  const sealed=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/package-manifests`,operatorAuth,'seal');
  assert.equal(sealed.response.status,201);
  const manifestId=sealed.payload.data.id;
  assert.equal(sealed.payload.data.revision,1);
  assert.equal(sealed.payload.data.lifecycle_status,'SEALED_VALID');
  assert.match(sealed.payload.data.manifest_sha256,/^[0-9a-f]{64}$/);
  assert.equal(sealed.payload.data.boundary.destructive_executor_enabled,false);

  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/package-manifests/${manifestId}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  const tooEarly=await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/revalidate`,operatorAuth,'too-early');
  assert.equal(tooEarly.response.status,409);
  assert.equal(tooEarly.payload.error.code,'FULFILMENT_PACKAGE_NOT_EXPIRED');

  const checkpoint=await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/recovery-checkpoints`,operatorAuth,'checkpoint');
  assert.equal(checkpoint.response.status,201);
  assert.equal(checkpoint.payload.data.recovery_checkpoint.recovery_mode,'NO_MUTATION_BASELINE');
  assert.match(checkpoint.payload.data.recovery_checkpoint.checkpoint_sha256,/^[0-9a-f]{64}$/);

  await new Promise((resolve)=>setTimeout(resolve,2200));
  const expired=await fetch(`${baseUrl}/api/v1/privacy-operations/package-manifests/${manifestId}`,{headers:{authorization:operatorAuth}}).then((response)=>response.json());
  assert.equal(expired.data.lifecycle_status,'EXPIRED_REVALIDATION_REQUIRED');
  const revalidated=await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/revalidate`,operatorAuth,'revalidate');
  assert.equal(revalidated.response.status,201);
  assert.equal(revalidated.payload.data.revision,2);
  assert.equal(revalidated.payload.data.predecessor_manifest_id,manifestId);
  assert.equal(revalidated.payload.data.lifecycle_status,'SEALED_VALID');
  assert.notEqual(revalidated.payload.data.manifest_sha256,sealed.payload.data.manifest_sha256);

  const predecessor=await fetch(`${baseUrl}/api/v1/privacy-operations/package-manifests/${manifestId}`,{headers:{authorization:operatorAuth}}).then((response)=>response.json());
  assert.equal(predecessor.data.lifecycle_status,'SUPERSEDED');
  assert.equal(predecessor.data.successor_manifest_id,revalidated.payload.data.id);
  const detail=await fetch(`${baseUrl}/api/v1/privacy/requests/${requestId}`,{headers:{authorization:studentAuth}}).then((response)=>response.json());
  assert.equal(detail.data.status,'APPROVED');
});
