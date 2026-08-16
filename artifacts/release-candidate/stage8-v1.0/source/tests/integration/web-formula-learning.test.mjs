import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL || 'http://127.0.0.1:4180';
const unique=(scope)=>`${scope}-${crypto.randomUUID()}`;

async function request(path,{method='GET',token,body}={}) {
  const response=await fetch(`${baseUrl}${path}`,{
    method,
    headers:{
      ...(token?{authorization:`Bearer ${token}`}:{
      }),
      ...(body===undefined?{}:{'content-type':'application/json'}),
      ...(method==='POST'&&token?{'idempotency-key':unique('web-ui')}:{})
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const payload=await response.json();
  return {response,payload};
}

test('student formula screen uses same-origin web to PostgreSQL API journey',async()=>{
  const page=await fetch(`${baseUrl}/math-learning/index.html?locale=ko`);
  assert.equal(page.status,200);
  assert.match(await page.text(),/id="answerForm"/);

  const bootstrap=await request('/api/v1/local-demo/session',{method:'POST',body:{}});
  assert.equal(bootstrap.response.status,201);
  assert.equal(bootstrap.payload.data.environment,'LOCAL_SYNTHETIC_ONLY');
  const token=bootstrap.payload.data.access_token;

  const lesson=await request(`/api/v1/concepts/${bootstrap.payload.data.concept_id}/lesson?locale=ko`,{token});
  assert.equal(lesson.response.status,200);
  assert.equal(lesson.payload.data.lesson.steps.length,5);
  assert.equal(JSON.stringify(lesson.payload).includes('expected_response'),false);

  const learning=await request('/api/v1/learning-sessions',{method:'POST',token,body:{learning_path_item_id:bootstrap.payload.data.learning_path_item_id,locale:'ko'}});
  assert.equal(learning.response.status,201);
  const formula=await request(`/api/v1/learning-sessions/${learning.payload.data.id}/formula-lessons`,{method:'POST',token,body:{lesson_definition_id:lesson.payload.data.lesson.id}});
  assert.equal(formula.response.status,201);
  const formulaId=formula.payload.data.id;

  const responses=[
    {value:'same_size_pieces'},
    {value:'common_denominator_6'},
    {numerator:5,denominator:6},
    {numerator_rule:'cross_products_sum',denominator_rule:'product'},
    {numerator:7,denominator:10}
  ];
  for (const response_value of responses) {
    const result=await request(`/api/v1/formula-lessons/${formulaId}/responses`,{method:'POST',token,body:{response_value,hint_level:0}});
    assert.equal(result.response.status,201);
    assert.equal(result.payload.data.outcome,'CORRECT');
  }
  const complete=await request(`/api/v1/formula-lessons/${formulaId}/complete`,{method:'POST',token,body:{}});
  assert.equal(complete.payload.data.status,'COMPLETED');
  assert.equal(complete.payload.data.mastery_score,1);
});
