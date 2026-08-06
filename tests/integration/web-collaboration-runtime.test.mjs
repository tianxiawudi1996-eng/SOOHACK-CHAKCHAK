import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;
async function request(path,{method='GET',token,body,key}={}){const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'&&token?{'idempotency-key':key??unique('phase15')}:{})},body:body===undefined?undefined:JSON.stringify(body)});const payload=await response.json();return {response,payload};}

test('five collaboration phases persist structured evidence and completion progress',async()=>{
  const page=await fetch(`${baseUrl}/curriculum/index.html?locale=ko&grade=E6`);assert.equal(page.status,200);assert.match(await page.text(),/id="activityPanel"/);
  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});const token=bootstrap.payload.data.access_token;
  const formulas=await request('/api/v1/curriculum/grades/E6/formulas?locale=ko',{token});const formula=formulas.payload.data.formulas[0];
  const created=await request('/api/v1/curriculum/collaboration-plans',{method:'POST',token,body:{formula_catalog_id:formula.id,adaptive_route:'CORE'}});
  assert.equal(created.response.status,201);const sessionId=created.payload.data.session.id;
  const earlyComplete=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/complete`,{method:'POST',token,body:{}});assert.equal(earlyComplete.response.status,409);
  const outOfOrder=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/phase-evidence`,{method:'POST',token,body:{phase_no:2,signal:'CONNECTED'}});assert.equal(outOfOrder.response.status,409);
  const signals=['CONFIDENT','CONNECTED','DERIVED','NEEDS_HINT','VERIFIED'];
  for(let index=0;index<signals.length;index++){
    const result=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/phase-evidence`,{method:'POST',token,body:{phase_no:index+1,signal:signals[index],hint_level:index===3?1:0,duration_ms:1000+index}});
    assert.equal(result.response.status,201);assert.equal(result.payload.data.evidence.length,index+1);
  }
  const completed=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}/complete`,{method:'POST',token,body:{}});
  assert.equal(completed.response.status,200);assert.equal(completed.payload.data.session.status,'COMPLETED');
  assert.equal(Number(completed.payload.data.session.evidence_score),0.835);assert.equal(completed.payload.data.next_review_days,3);
  const fetched=await request(`/api/v1/curriculum/collaboration-plans/${sessionId}`,{token});
  assert.equal(fetched.response.status,200);assert.equal(fetched.payload.data.evidence.length,5);assert.equal(fetched.payload.data.session.status,'COMPLETED');
});
