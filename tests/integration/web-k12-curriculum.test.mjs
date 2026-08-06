import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;
async function request(path,{method='GET',token,body}={}){const response=await fetch(`${baseUrl}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'}),...(method==='POST'&&token?{'idempotency-key':unique('phase14')}:{})},body:body===undefined?undefined:JSON.stringify(body)});const payload=await response.json();return {response,payload};}

test('K12 curriculum UI exposes 12 grades, canonical formulas, and a five-phase pet collaboration plan',async()=>{
  const page=await fetch(`${baseUrl}/curriculum/index.html?locale=ko&grade=H3`);
  assert.equal(page.status,200);assert.match(await page.text(),/id="gradeGroups"/);
  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});
  assert.equal(bootstrap.response.status,201);const token=bootstrap.payload.data.access_token;
  const grades=await request('/api/v1/curriculum/grades',{token});
  assert.equal(grades.response.status,200);assert.equal(grades.payload.data.grades.length,12);
  assert.ok(grades.payload.data.grades.every((grade)=>grade.formula_count>=6));
  const early=await request('/api/v1/curriculum/grades/E1/formulas?locale=en',{token});
  assert.equal(early.response.status,200);assert.equal(early.payload.data.translation_status,'CANONICAL_KO_FALLBACK');
  assert.ok(early.payload.data.formulas.some((formula)=>formula.knowledge_type==='RELATION'));
  const high=await request('/api/v1/curriculum/grades/H3/formulas?locale=ko',{token});
  assert.equal(high.response.status,200);assert.equal(high.payload.data.formulas.length,6);
  assert.ok(high.payload.data.formulas.every((formula)=>formula.course_name));
  const formula=high.payload.data.formulas[0];
  const plan=await request('/api/v1/curriculum/collaboration-plans',{method:'POST',token,body:{formula_catalog_id:formula.id,adaptive_route:'EXTEND'}});
  assert.equal(plan.response.status,201);assert.equal(plan.payload.data.plan.phases.length,5);
  assert.equal(plan.payload.data.plan.route,'EXTEND');
  assert.ok(plan.payload.data.plan.roles.CHAKCHAKI.includes('visualize_concept'));
  assert.ok(plan.payload.data.plan.roles.GONGSICKYI.includes('derive_formula'));
});
