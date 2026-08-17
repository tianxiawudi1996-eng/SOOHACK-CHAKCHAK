import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase27-${label}-${crypto.randomUUID()}`;
const jsonHeaders=(authorization,label)=>({authorization,'content-type':'application/json','idempotency-key':key(label)});

test('local privacy operator reviews a request but cannot falsely complete fulfilment',async()=>{
  const studentIssued=await fetch(`${baseUrl}/api/v1/local-demo/session`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  const studentSession=await studentIssued.json();
  const studentAuthorization=`Bearer ${studentSession.data.access_token}`;
  const created=await fetch(`${baseUrl}/api/v1/privacy/requests`,{
    method:'POST',headers:jsonHeaders(studentAuthorization,'create'),body:JSON.stringify({request_type:'DELETION',locale:'ko'})
  });
  const createdPayload=await created.json();
  assert.equal(created.status,201);

  const denied=await fetch(`${baseUrl}/api/v1/privacy-operations/requests`,{headers:{authorization:studentAuthorization}});
  assert.equal(denied.status,403);

  const operatorIssued=await fetch(`${baseUrl}/api/v1/local-demo/privacy-operator/session`,{
    method:'POST',headers:{'content-type':'application/json'},body:'{}'
  });
  const operatorSession=await operatorIssued.json();
  assert.equal(operatorIssued.status,201);
  assert.equal(operatorSession.data.environment,'LOCAL_SYNTHETIC_ONLY');
  const operatorAuthorization=`Bearer ${operatorSession.data.access_token}`;

  const queue=await fetch(`${baseUrl}/api/v1/privacy-operations/requests`,{headers:{authorization:operatorAuthorization}});
  const queuePayload=await queue.json();
  assert.equal(queue.status,200);
  assert.equal(queuePayload.data.requests.some(({id})=>id===createdPayload.data.id),true);
  assert.equal(queuePayload.data.boundary.completion_transition_enabled,false);

  const transition=async(to_status,body={})=>{
    const response=await fetch(`${baseUrl}/api/v1/privacy-operations/requests/${createdPayload.data.id}/transition`,{
      method:'POST',headers:jsonHeaders(operatorAuthorization,to_status),body:JSON.stringify({to_status,...body})
    });
    return {response,payload:await response.json()};
  };
  const verified=await transition('IDENTITY_VERIFIED',{
    evidence_reference:'LOCAL-EVIDENCE/identity-phase27',evidence_sha256:'a'.repeat(64)
  });
  assert.equal(verified.response.status,200);
  assert.equal(verified.payload.data.status,'IDENTITY_VERIFIED');
  const reviewing=await transition('IN_REVIEW');
  assert.equal(reviewing.response.status,200);
  const approved=await transition('APPROVED',{reason_code:'REQUEST_AND_SCOPE_VERIFIED'});
  assert.equal(approved.response.status,200);
  assert.equal(approved.payload.data.status,'APPROVED');

  const blocked=await transition('COMPLETED',{
    reason_code:'LOCAL_EXECUTION_COMPLETE',evidence_reference:'LOCAL-EVIDENCE/fulfilment-phase27',evidence_sha256:'b'.repeat(64)
  });
  assert.equal(blocked.response.status,409);
  assert.equal(blocked.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');

  const detail=await fetch(`${baseUrl}/api/v1/privacy/requests/${createdPayload.data.id}`,{headers:{authorization:studentAuthorization}});
  const detailPayload=await detail.json();
  assert.equal(detailPayload.data.status,'APPROVED');
  assert.deepEqual(detailPayload.data.events.map(({to_status})=>to_status),['RECEIVED','IDENTITY_VERIFIED','IN_REVIEW','APPROVED']);
  assert.equal(JSON.stringify(detailPayload.data).includes('33333333-3333-4333-8333-333333333333'),false);
});
