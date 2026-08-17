import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';
const locales=['ko','zh-CN','ja','en','es','fr','it','ru'];
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;
async function request(path,{method='GET',token,body,key}={}){const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'&&token?{'idempotency-key':key??unique('phase18')}:{})},body:body===undefined?undefined:JSON.stringify(body)});const payload=await response.json();return {response,payload};}

test('expanded formula serves three server-scored tasks in all eight locales',async()=>{
  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});const token=bootstrap.payload.data.access_token;
  const formulas=await request('/api/v1/curriculum/grades/E1/formulas?locale=ko',{token});const formula=formulas.payload.data.formulas.find((item)=>item.semantic_key==='kr.e1.number.compose');assert.ok(formula);
  const created=await request('/api/v1/curriculum/collaboration-plans',{method:'POST',token,body:{formula_catalog_id:formula.id,adaptive_route:'CORE'}});const sessionId=created.payload.data.session.id;
  for(const [index,signal] of ['CONFIDENT','CONNECTED','DERIVED','APPLIED','VERIFIED'].entries())await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/phase-evidence`,{method:'POST',token,body:{phase_no:index+1,signal,hint_level:0,duration_ms:250}});
  await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/complete`,{method:'POST',token,body:{}});
  const recall=await request(`/api/v1/curriculum/formulas/${formula.id}/recall-check?locale=ko`,{token});assert.equal(recall.payload.data.application_available,true);
  await request(`/api/v1/curriculum/recall-checks/${recall.payload.data.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,selected_value:formula.semantic_key,duration_ms:300}});
  let koreanItems;
  for(const locale of locales){
    const checks=await request(`/api/v1/curriculum/formulas/${formula.id}/application-checks?locale=${encodeURIComponent(locale)}&collaboration_session_id=${sessionId}`,{token});
    assert.equal(checks.response.status,200);assert.equal(checks.payload.data.content_locale,locale);assert.equal(checks.payload.data.items.length,3);
    assert.doesNotMatch(JSON.stringify(checks.payload),/answer_schema|accepted_values|misconception_rules/);
    if(locale==='ko')koreanItems=checks.payload.data.items;
  }
  for(const [index,value] of ['4','4','9'].entries()){
    const item=koreanItems[index];
    const attempt=await request(`/api/v1/curriculum/application-checks/${item.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,response_value:{value,unit:''},duration_ms:350}});
    assert.equal(attempt.payload.data.outcome,'CORRECT');
    if(index===2){assert.equal(Number(attempt.payload.data.progress.application_mastery_score),1);assert.equal(attempt.payload.data.progress.mastered,true);}
  }
});
