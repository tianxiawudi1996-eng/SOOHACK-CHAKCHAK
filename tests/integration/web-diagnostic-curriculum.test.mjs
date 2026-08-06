import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;

async function request(path,{method='GET',token,body}={}){
  const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'&&token?{'idempotency-key':unique('phase13')}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const payload=await response.json();return {response,payload};
}

test('diagnostic UI selects multiplication and consumes a one-time learning handoff',async()=>{
  const page=await fetch(`${baseUrl}/diagnostic/index.html?locale=ko`);
  assert.equal(page.status,200);assert.match(await page.text(),/id="questionPanel"/);
  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});
  assert.equal(bootstrap.response.status,201);const token=bootstrap.payload.data.access_token;
  const items=await request('/api/v1/diagnostic-items?locale=ko',{token});
  assert.equal(items.response.status,200);assert.equal(items.payload.data.items.length,3);
  assert.equal(JSON.stringify(items.payload).includes('answer_schema'),false);
  assert.equal(new Set(items.payload.data.items.map((item)=>item.topic_key)).size,3);
  const created=await request('/api/v1/diagnostics',{method:'POST',token,body:{locale:'ko'}});
  const answers=['2/4','5/6','0/1'];
  for(const [index,item] of items.payload.data.items.entries()){
    const answered=await request(`/api/v1/diagnostics/${created.payload.data.id}/responses`,{method:'POST',token,body:{problem_item_id:item.id,response_value:{value:answers[index]}}});
    assert.equal(answered.response.status,201);
  }
  const completed=await request(`/api/v1/diagnostics/${created.payload.data.id}/complete`,{method:'POST',token,body:{}});
  assert.equal(completed.payload.data.recommendation.route,'CORE');
  const handoff=await request('/api/v1/local-demo/handoffs',{method:'POST',token,body:{learning_path_item_id:completed.payload.data.learning_path_item_id}});
  assert.equal(handoff.response.status,201);assert.equal(handoff.payload.data.code.length,64);
  const consumed=await request(`/api/v1/local-demo/handoffs/${handoff.payload.data.code}/consume`,{method:'POST'});
  assert.equal(consumed.response.status,200);assert.equal(consumed.payload.data.concept_id,'d0000000-0000-4000-8000-000000000201');
  const replay=await request(`/api/v1/local-demo/handoffs/${handoff.payload.data.code}/consume`,{method:'POST'});
  assert.equal(replay.response.status,404);
  const lesson=await request(`/api/v1/concepts/${consumed.payload.data.concept_id}/lesson?locale=ko`,{token:consumed.payload.data.access_token});
  assert.equal(lesson.payload.data.formula.title,'분수의 곱셈');assert.equal(lesson.payload.data.lesson.steps.length,5);
});
