import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;
async function request(path,{method='GET',token,body,key}={}){const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'&&token?{'idempotency-key':key??unique('phase17')}:{})},body:body===undefined?undefined:JSON.stringify(body)});const payload=await response.json();return {response,payload};}

test('application checks require recall and use three latest weighted server-scored items',async()=>{
  const page=await fetch(`${baseUrl}/curriculum/index.html?locale=ko&grade=E5`);assert.equal(page.status,200);assert.match(await page.text(),/id="applicationPanel"/);
  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});const token=bootstrap.payload.data.access_token;
  const formulas=await request('/api/v1/curriculum/grades/E5/formulas?locale=ko',{token});const formula=formulas.payload.data.formulas.find((item)=>item.semantic_key==='kr.e5.plane.area');assert.ok(formula);
  const created=await request('/api/v1/curriculum/collaboration-plans',{method:'POST',token,body:{formula_catalog_id:formula.id,adaptive_route:'CORE'}});const sessionId=created.payload.data.session.id;
  for(const [index,signal] of ['CONFIDENT','CONNECTED','DERIVED','APPLIED','VERIFIED'].entries())await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/phase-evidence`,{method:'POST',token,body:{phase_no:index+1,signal,hint_level:0,duration_ms:500}});
  await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/complete`,{method:'POST',token,body:{}});
  const beforeRecall=await request(`/api/v1/curriculum/formulas/${formula.id}/application-checks?locale=ko&collaboration_session_id=${sessionId}`,{token});assert.equal(beforeRecall.response.status,409);
  const recall=await request(`/api/v1/curriculum/formulas/${formula.id}/recall-check?locale=ko`,{token});assert.equal(recall.payload.data.application_available,true);
  await request(`/api/v1/curriculum/recall-checks/${recall.payload.data.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,selected_value:formula.semantic_key,duration_ms:600}});
  const checks=await request(`/api/v1/curriculum/formulas/${formula.id}/application-checks?locale=ko&collaboration_session_id=${sessionId}`,{token});assert.equal(checks.response.status,200);assert.equal(checks.payload.data.items.length,3);assert.doesNotMatch(JSON.stringify(checks.payload),/answer_schema|accepted_values|misconception_rules/);
  const [rectangle,triangle,trapezoid]=checks.payload.data.items;
  const first=await request(`/api/v1/curriculum/application-checks/${rectangle.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,response_value:{value:'40',unit:'cm2'},duration_ms:700}});assert.equal(first.payload.data.outcome,'CORRECT');assert.ok(first.payload.data.progress.attempted_items>=1&&first.payload.data.progress.attempted_items<=3);if(first.payload.data.progress.attempted_items<3)assert.equal(first.payload.data.progress.mastered,false);
  const wrong=await request(`/api/v1/curriculum/application-checks/${triangle.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,response_value:{value:'60',unit:'cm²'},duration_ms:800}});assert.equal(wrong.payload.data.outcome,'INCORRECT');assert.equal(wrong.payload.data.misconception_code,'MISSED_HALF');
  const third=await request(`/api/v1/curriculum/application-checks/${trapezoid.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,response_value:{value:'32',unit:'㎠'},duration_ms:900}});assert.equal(third.payload.data.progress.attempted_items,3);assert.equal(Number(third.payload.data.progress.application_mastery_score),0.6667);assert.equal(third.payload.data.progress.mastered,false);
  const retryBody={collaboration_session_id:sessionId,response_value:{value:'30',unit:'cm²'},duration_ms:1000};const retryKey=unique('phase17-retry');
  const corrected=await request(`/api/v1/curriculum/application-checks/${triangle.id}/attempts`,{method:'POST',token,key:retryKey,body:retryBody});assert.equal(corrected.payload.data.outcome,'CORRECT');assert.equal(Number(corrected.payload.data.progress.application_mastery_score),1);assert.equal(corrected.payload.data.progress.mastered,true);assert.equal(corrected.payload.data.next_review_days,14);
  const replay=await request(`/api/v1/curriculum/application-checks/${triangle.id}/attempts`,{method:'POST',token,key:retryKey,body:retryBody});assert.equal(replay.response.status,200);assert.equal(replay.payload.data.id,corrected.payload.data.id);assert.equal(replay.payload.data.progress.attempted_items,3);
  assert.doesNotMatch(JSON.stringify(corrected.payload),/answer_schema|accepted_values|accepted_units/);
});
