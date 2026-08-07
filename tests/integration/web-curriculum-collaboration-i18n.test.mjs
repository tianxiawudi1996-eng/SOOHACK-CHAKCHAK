import crypto from 'node:crypto';import test from 'node:test';import assert from 'node:assert/strict';
const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';const locales=['ko','zh-CN','ja','en','es','fr','it','ru'];const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;const hasHangul=(value)=>/[가-힣]/u.test(String(value));
async function request(path,{method='GET',token,body}={}){const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'&&token?{'idempotency-key':unique('phase20')}:{})},body:body===undefined?undefined:JSON.stringify(body)});const payload=await response.json();return {response,payload};}
test('curriculum metadata and five-phase collaboration preserve all eight locales',async()=>{
  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});assert.equal(bootstrap.response.status,201);const token=bootstrap.payload.data.access_token;
  for(const locale of locales){
    const grades=await request(`/api/v1/curriculum/grades?locale=${encodeURIComponent(locale)}`,{token});assert.equal(grades.response.status,200);assert.equal(grades.payload.data.grades.length,12);assert.equal(grades.payload.data.content_locale,locale);
    const grade=grades.payload.data.grades[0];if(locale!=='ko')for(const value of [grade.label,grade.official_band,...grade.course_path])assert.equal(hasHangul(value),false);
    const formulas=await request(`/api/v1/curriculum/grades/E1/formulas?locale=${encodeURIComponent(locale)}`,{token});assert.equal(formulas.response.status,200);const formula=formulas.payload.data.formulas[0];if(locale!=='ko')assert.equal(hasHangul(formula.source_citation),false);
    const plan=await request('/api/v1/curriculum/collaboration-plans',{method:'POST',token,body:{formula_catalog_id:formula.id,adaptive_route:'CORE',locale}});assert.equal(plan.response.status,201);assert.equal(plan.payload.data.plan.content_locale,locale);assert.equal(plan.payload.data.plan.phases.length,5);
    if(locale!=='ko')for(const value of [plan.payload.data.plan.role_descriptions.CHAKCHAKI,plan.payload.data.plan.role_descriptions.GONGSICKYI,...plan.payload.data.plan.phases.flatMap((phase)=>[phase.title,phase.objective])])assert.equal(hasHangul(value),false);
  }
});
