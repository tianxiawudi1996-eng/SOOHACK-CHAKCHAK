import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';
const locales=['ko','zh-CN','ja','en','es','fr','it','ru'];
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;
const hasHangul=(value)=>/[가-힣]/u.test(String(value));
async function request(path,{method='GET',token,body,key}={}){const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'&&token?{'idempotency-key':key??unique('phase19')}:{})},body:body===undefined?undefined:JSON.stringify(body)});const payload=await response.json();return {response,payload};}

test('formula catalog, collaboration, and recall preserve all eight locales',async()=>{
  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});
  assert.equal(bootstrap.response.status,201);const token=bootstrap.payload.data.access_token;
  let target;
  for(const locale of locales){
    const formulas=await request(`/api/v1/curriculum/grades/E1/formulas?locale=${encodeURIComponent(locale)}`,{token});
    assert.equal(formulas.response.status,200);assert.equal(formulas.payload.data.formulas.length,6);
    assert.equal(formulas.payload.data.content_locale,locale);
    if(locale!=='ko'){
      assert.equal(formulas.payload.data.translation_status,'TRANSLATION_REVIEW_REQUIRED');
      for(const formula of formulas.payload.data.formulas){
        assert.equal(hasHangul(formula.title),false);assert.equal(hasHangul(formula.notation),false);assert.equal(hasHangul(formula.explanation),false);
      }
    }
    if(locale==='ru')target=formulas.payload.data.formulas.find((formula)=>formula.semantic_key==='kr.e1.number.compose');
  }
  assert.ok(target);
  const created=await request('/api/v1/curriculum/collaboration-plans',{method:'POST',token,body:{formula_catalog_id:target.id,adaptive_route:'CORE',locale:'ru'}});
  assert.equal(created.response.status,201);assert.equal(created.payload.data.formula.content_locale,'ru');assert.equal(hasHangul(created.payload.data.formula.title),false);assert.equal(hasHangul(created.payload.data.formula.notation),false);
  const sessionId=created.payload.data.session.id;
  for(const [index,signal] of ['CONFIDENT','CONNECTED','DERIVED','APPLIED','VERIFIED'].entries()){
    const evidence=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/phase-evidence`,{method:'POST',token,body:{phase_no:index+1,signal,hint_level:0,duration_ms:250}});
    assert.equal(evidence.response.status,201);
  }
  const completed=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/complete`,{method:'POST',token,body:{}});assert.equal(completed.response.status,200);
  const recall=await request(`/api/v1/curriculum/formulas/${target.id}/recall-check?locale=ru`,{token});
  assert.equal(recall.response.status,200);assert.equal(recall.payload.data.content_locale,'ru');assert.equal(recall.payload.data.translation_status,'TRANSLATION_REVIEW_REQUIRED');assert.equal(recall.payload.data.choices.length,4);
  for(const value of [recall.payload.data.prompt,recall.payload.data.formula_title,...recall.payload.data.choices.map((choice)=>choice.label)])assert.equal(hasHangul(value),false);
  assert.doesNotMatch(JSON.stringify(recall.payload),/answer_schema|correct_value|accepted_values/);
  const attempt=await request(`/api/v1/curriculum/recall-checks/${recall.payload.data.id}/attempts`,{method:'POST',token,body:{collaboration_session_id:sessionId,selected_value:target.semantic_key,duration_ms:300}});
  assert.equal(attempt.response.status,201);assert.equal(attempt.payload.data.outcome,'CORRECT');
});
