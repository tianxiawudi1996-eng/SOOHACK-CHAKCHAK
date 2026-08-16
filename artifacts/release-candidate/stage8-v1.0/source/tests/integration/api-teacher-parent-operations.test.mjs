import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;

async function request(path,{method='GET',token,body}={}){
  const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'?{'idempotency-key':unique('p70')}: {})},body:body===undefined?undefined:JSON.stringify(body)});
  return {response,payload:await response.json()};
}

async function session(role){const result=await request(`/api/v1/local-demo/${role}/session`,{method:'POST'});assert.equal(result.response.status,201);return result.payload.data;}

test('teacher assigns a six-formula plan, records intervention, and completes forward workflow',async()=>{
  const auth=await session('teacher');
  const overview=await request(`/api/v1/operations/students/${auth.student_id}/overview`,{token:auth.access_token});
  assert.equal(overview.response.status,200);
  assert.equal(overview.payload.data.viewer_role,'TEACHER');
  assert.equal(overview.payload.data.recommended_plan.formula_count,6);
  assert.equal(overview.payload.data.capabilities.assign,true);
  const dueAt=new Date(Date.now()+7*86400000).toISOString();
  const created=await request(`/api/v1/operations/students/${auth.student_id}/assignments`,{method:'POST',token:auth.access_token,body:{curriculum_id:overview.payload.data.recommended_plan.id,due_at:dueAt}});
  assert.equal(created.response.status,201);
  assert.equal(created.payload.data.item_count,6);
  const intervention=await request(`/api/v1/operations/students/${auth.student_id}/interventions`,{method:'POST',token:auth.access_token,body:{assignment_id:created.payload.data.id,reason_code:'RECALL_GAP',priority:'WATCH',action_code:'SCHEDULE_RECALL'}});
  assert.equal(intervention.response.status,201);
  const started=await request(`/api/v1/operations/students/${auth.student_id}/assignments/${created.payload.data.id}/transition`,{method:'POST',token:auth.access_token,body:{to_status:'IN_PROGRESS'}});
  assert.equal(started.payload.data.status,'IN_PROGRESS');
  const completed=await request(`/api/v1/operations/students/${auth.student_id}/assignments/${created.payload.data.id}/transition`,{method:'POST',token:auth.access_token,body:{to_status:'COMPLETED'}});
  assert.equal(completed.payload.data.status,'COMPLETED');
});

test('parent reads consented aggregates but cannot write or see teacher interventions',async()=>{
  const auth=await session('parent');
  const overview=await request(`/api/v1/operations/students/${auth.student_id}/overview`,{token:auth.access_token});
  assert.equal(overview.response.status,200);
  assert.equal(overview.payload.data.viewer_role,'PARENT');
  assert.equal(overview.payload.data.capabilities.assign,false);
  assert.deepEqual(overview.payload.data.interventions,[]);
  assert.equal(JSON.stringify(overview.payload).includes('response_value'),false);
  const denied=await request(`/api/v1/operations/students/${auth.student_id}/assignments`,{method:'POST',token:auth.access_token,body:{curriculum_id:overview.payload.data.recommended_plan.id,due_at:new Date(Date.now()+86400000).toISOString()}});
  assert.equal(denied.response.status,403);
});

test('operator access is denied outside the linked student scope',async()=>{
  const auth=await session('teacher');
  const denied=await request('/api/v1/operations/students/99999999-9999-4999-8999-999999999999/overview',{token:auth.access_token});
  assert.equal(denied.response.status,403);
});
