import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';

function forbiddenKey(value){
  if(Array.isArray(value))return value.some(forbiddenKey);
  if(!value||typeof value!=='object')return false;
  const denied=new Set(['student_id','user_id','response_value','answer_text','problem_text','token']);
  return Object.entries(value).some(([key,item])=>denied.has(key)||forbiddenKey(item));
}

test('learning quality API returns privacy-minimized PostgreSQL aggregates',async()=>{
  const issued=await fetch(`${baseUrl}/api/v1/local-demo/session`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  const session=await issued.json();
  assert.equal(issued.status,201);
  const token=session.data.access_token;
  const headers={authorization:`Bearer ${token}`};

  const response=await fetch(`${baseUrl}/api/v1/students/${session.data.student_id}/learning-quality`,{headers});
  const payload=await response.json();
  assert.equal(response.status,200);
  assert.deepEqual(Object.keys(payload.data.primary).sort(),['application_mastery_rate','durable_recall_rate','learning_completion_rate']);
  assert.deepEqual(Object.keys(payload.data.drivers).sort(),['collaboration_pass_rate','independent_response_rate']);
  assert.equal(payload.data.target_status,'PROVISIONAL_NO_FIELD_BASELINE');
  assert.deepEqual(payload.data.privacy,{aggregation_only:true,raw_answers_included:false,problem_text_included:false,direct_identifiers_included:false});
  assert.equal(forbiddenKey(payload.data),false);

  const denied=await fetch(`${baseUrl}/api/v1/students/99999999-9999-4999-8999-999999999999/learning-quality`,{headers});
  const deniedPayload=await denied.json();
  assert.equal(denied.status,403);
  assert.equal(deniedPayload.error.code,'FORBIDDEN');
});
