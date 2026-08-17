import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(name)=>`phase26-${name}-${crypto.randomUUID()}`;

function containsInternalIdentity(value){
  if(Array.isArray(value))return value.some(containsInternalIdentity);
  if(!value||typeof value!=='object')return false;
  const denied=new Set(['requester_user_id','subject_user_id','student_profile_id','user_id','student_id']);
  return Object.entries(value).some(([name,item])=>denied.has(name)||containsInternalIdentity(item));
}

test('student can submit, inspect, replay, list, and cancel a data-right request safely',async()=>{
  const issued=await fetch(`${baseUrl}/api/v1/local-demo/session`,{
    method:'POST',headers:{'content-type':'application/json'},body:'{}'
  });
  const session=await issued.json();
  assert.equal(issued.status,201);
  const authorization=`Bearer ${session.data.access_token}`;
  const createKey=key('create');
  const createBody=JSON.stringify({request_type:'ACCESS',locale:'ko'});
  const created=await fetch(`${baseUrl}/api/v1/privacy/requests`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':createKey},body:createBody
  });
  const createdPayload=await created.json();
  assert.equal(created.status,201);
  assert.equal(createdPayload.data.status,'RECEIVED');
  assert.equal(createdPayload.data.boundary.direct_deletion_performed,false);
  assert.equal(createdPayload.data.boundary.guardian_channel_status,'BLOCKED_MANAGED_IDENTITY_AND_ACTIVE_LINK');
  assert.equal(containsInternalIdentity(createdPayload.data),false);

  const replayed=await fetch(`${baseUrl}/api/v1/privacy/requests`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':createKey},body:createBody
  });
  const replayedPayload=await replayed.json();
  assert.equal(replayed.status,200);
  assert.equal(replayedPayload.data.id,createdPayload.data.id);
  assert.equal(replayedPayload.meta.replayed,true);

  const listed=await fetch(`${baseUrl}/api/v1/privacy/requests`,{headers:{authorization}});
  const listedPayload=await listed.json();
  assert.equal(listed.status,200);
  assert.equal(listedPayload.data.requests.some(({id})=>id===createdPayload.data.id),true);
  assert.equal(containsInternalIdentity(listedPayload.data),false);

  const detail=await fetch(`${baseUrl}/api/v1/privacy/requests/${createdPayload.data.id}`,{headers:{authorization}});
  const detailPayload=await detail.json();
  assert.equal(detail.status,200);
  assert.deepEqual(detailPayload.data.events.map(({to_status})=>to_status),['RECEIVED']);

  const cancelled=await fetch(`${baseUrl}/api/v1/privacy/requests/${createdPayload.data.id}/cancel`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key('cancel')},body:'{}'
  });
  const cancelledPayload=await cancelled.json();
  assert.equal(cancelled.status,200);
  assert.equal(cancelledPayload.data.status,'CANCELLED');

  const invalid=await fetch(`${baseUrl}/api/v1/privacy/requests`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key('invalid')},
    body:JSON.stringify({request_type:'DELETE_NOW',locale:'ko'})
  });
  const invalidPayload=await invalid.json();
  assert.equal(invalid.status,400);
  assert.equal(invalidPayload.error.code,'INVALID_PRIVACY_REQUEST_TYPE');

  const absent=await fetch(`${baseUrl}/api/v1/privacy/requests/99999999-9999-4999-8999-999999999999`,{headers:{authorization}});
  assert.equal(absent.status,404);
});
