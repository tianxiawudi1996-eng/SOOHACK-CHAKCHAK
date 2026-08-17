import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.WEB_BASE_URL||'http://127.0.0.1:4180';

async function request(path,{method='GET',token}={}){
  const response=await fetch(`${baseUrl}${path}`,{method,headers:token?{authorization:`Bearer ${token}`}:{}});
  const payload=await response.json();
  return {response,payload};
}

test('staged operations screen serves role-aware teacher and parent aggregate views',async()=>{
  const page=await fetch(`${baseUrl}/operations/index.html?locale=ko&role=teacher`);
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/id="teacherActions"/);
  assert.match(html,/id="assignmentList"/);
  assert.match(html,/id="interventionList"/);

  const teacher=await request('/api/v1/local-demo/teacher/session',{method:'POST'});
  assert.equal(teacher.response.status,201);
  const teacherView=await request(`/api/v1/operations/students/${teacher.payload.data.student_id}/overview`,{token:teacher.payload.data.access_token});
  assert.equal(teacherView.response.status,200);
  assert.equal(teacherView.payload.data.capabilities.assign,true);

  const parent=await request('/api/v1/local-demo/parent/session',{method:'POST'});
  assert.equal(parent.response.status,201);
  const parentView=await request(`/api/v1/operations/students/${parent.payload.data.student_id}/overview`,{token:parent.payload.data.access_token});
  assert.equal(parentView.response.status,200);
  assert.equal(parentView.payload.data.capabilities.assign,false);
  assert.deepEqual(parentView.payload.data.interventions,[]);
  assert.equal(JSON.stringify(parentView.payload).includes('accepted_values'),false);
});
