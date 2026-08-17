import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;
async function request(path,{method='GET',token,body,key}={}){
  const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'&&token?{'idempotency-key':key??unique('phase16')}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const payload=await response.json();
  return {response,payload};
}

test('formula recall check stays gated, server-scored, and updates recall progress',async()=>{
  const page=await fetch(`${baseUrl}/curriculum/index.html?locale=ko&grade=E6`);
  assert.equal(page.status,200);
  assert.match(await page.text(),/id="recallPanel"/);

  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});
  assert.equal(bootstrap.response.status,201);
  const token=bootstrap.payload.data.access_token;
  const formulas=await request('/api/v1/curriculum/grades/E6/formulas?locale=ko',{token});
  const formula=formulas.payload.data.formulas[0];
  const check=await request(`/api/v1/curriculum/formulas/${formula.id}/recall-check?locale=ko`,{token});
  assert.equal(check.response.status,200);
  assert.equal(check.payload.data.assessment_kind,'FORMULA_RECOGNITION');
  assert.equal(check.payload.data.choices.length,4);
  assert.doesNotMatch(JSON.stringify(check.payload),/answer_schema|correct_value/);

  const created=await request('/api/v1/curriculum/collaboration-plans',{method:'POST',token,body:{formula_catalog_id:formula.id,adaptive_route:'CORE'}});
  assert.equal(created.response.status,201);
  const sessionId=created.payload.data.session.id;
  const gated=await request(`/api/v1/curriculum/recall-checks/${check.payload.data.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,selected_value:formula.semantic_key,duration_ms:800}});
  assert.equal(gated.response.status,409);

  const signals=['CONFIDENT','CONNECTED','DERIVED','APPLIED','VERIFIED'];
  for(let index=0;index<signals.length;index++){
    const evidence=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/phase-evidence`,{method:'POST',token,body:{phase_no:index+1,signal:signals[index],hint_level:0,duration_ms:500+index}});
    assert.equal(evidence.response.status,201);
  }
  const completed=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/complete`,{method:'POST',token,body:{}});
  assert.equal(completed.response.status,200);
  assert.equal(completed.payload.data.session.status,'COMPLETED');

  const correctBody={collaboration_session_id:sessionId,selected_value:formula.semantic_key,duration_ms:900};
  const correctKey=unique('phase16-correct');
  const correct=await request(`/api/v1/curriculum/recall-checks/${check.payload.data.id}/attempts`,{method:'POST',token,key:correctKey,body:correctBody});
  assert.equal(correct.response.status,201);
  assert.equal(correct.payload.data.outcome,'CORRECT');
  assert.ok(Number(correct.payload.data.progress.recall_score)>0);
  assert.ok(Number(correct.payload.data.progress.recall_score)<=1);
  assert.equal(correct.payload.data.next_review_days,7);
  assert.doesNotMatch(JSON.stringify(correct.payload),/answer_schema|correct_value/);
  const replay=await request(`/api/v1/curriculum/recall-checks/${check.payload.data.id}/attempts`,{method:'POST',token,key:correctKey,body:correctBody});
  assert.equal(replay.response.status,200);
  assert.equal(replay.payload.data.id,correct.payload.data.id);
  assert.equal(replay.payload.data.progress.total_attempts,correct.payload.data.progress.total_attempts);
  assert.equal(replay.payload.data.replayed,true);

  const wrongChoice=check.payload.data.choices.find((choice)=>choice.value!==formula.semantic_key);
  const incorrect=await request(`/api/v1/curriculum/recall-checks/${check.payload.data.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,selected_value:wrongChoice.value,duration_ms:1000}});
  assert.equal(incorrect.response.status,201);
  assert.equal(incorrect.payload.data.outcome,'INCORRECT');
  assert.equal(incorrect.payload.data.progress.total_attempts,correct.payload.data.progress.total_attempts+1);
  assert.equal(incorrect.payload.data.progress.correct_attempts,correct.payload.data.progress.correct_attempts);
  const expectedScore=incorrect.payload.data.progress.correct_attempts/incorrect.payload.data.progress.total_attempts;
  assert.ok(Math.abs(Number(incorrect.payload.data.progress.recall_score)-expectedScore)<0.0001);
  assert.equal(incorrect.payload.data.next_review_days,1);
});
