import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';

async function request(path,{method='GET',token}={}){
  const response=await fetch(`${baseUrl}${path}`,{method,headers:token?{authorization:`Bearer ${token}`}:{}});
  const payload=await response.json();
  return {response,payload};
}

test('academy screen exposes a same-origin evidence-gated six-formula journey',async()=>{
  const page=await fetch(`${baseUrl}/academy/index.html?locale=ko`);
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/id="curriculumFormulaGrid"/);
  assert.match(html,/id="curriculumJourney"/);

  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST'});
  assert.equal(bootstrap.response.status,201);
  const {access_token:token,student_id:studentId}=bootstrap.payload.data;
  const result=await request(`/api/v1/students/${studentId}/academy-curriculum?target=ADVANCED_REASONING&locale=ko`,{token});
  assert.equal(result.response.status,200);
  const data=result.payload.data;
  assert.equal(data.formulas.length,6);
  assert.equal(data.journey.length,4);
  assert.equal(data.access_mode,'EVIDENCE_GATED_FALLBACK');
  assert.equal(data.privacy.raw_answers_included,false);
  assert.equal(JSON.stringify(data).includes('accepted_values'),false);
});
