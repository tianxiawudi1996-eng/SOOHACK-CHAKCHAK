import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';

async function issueStudent(){
  const response=await fetch(`${baseUrl}/api/v1/local-demo/session`,{method:'POST'});
  assert.equal(response.status,201);
  const data=(await response.json()).data;
  return {studentId:data.student_id,authorization:`Bearer ${data.access_token}`};
}

async function issueAdmin(){
  const response=await fetch(`${baseUrl}/api/v1/local-demo/privacy-operator/session`,{method:'POST'});
  assert.equal(response.status,201);
  return (await response.json()).data.access_token;
}

test('admin readiness verifies complete local coverage while preserving external blockers',async()=>{
  const token=await issueAdmin();
  const response=await fetch(`${baseUrl}/api/v1/admin/academy-curriculum/readiness`,{headers:{authorization:`Bearer ${token}`}});
  assert.equal(response.status,200);
  const data=(await response.json()).data;
  assert.equal(data.local_coverage_complete,true);
  assert.equal(data.production_ready,false);
  assert.deepEqual([data.counts.grades,data.counts.tracks,data.counts.plans,data.counts.assignments],[12,4,48,288]);
  assert.ok(data.blockers.includes('MATH_EXPERT_REVIEW_PENDING'));
});

test('student receives an evidence-gated six-formula journey without answer material',async()=>{
  const {studentId,authorization}=await issueStudent();
  const response=await fetch(`${baseUrl}/api/v1/students/${studentId}/academy-curriculum?target=ADVANCED_REASONING&locale=ko`,{headers:{authorization}});
  assert.equal(response.status,200);
  const data=(await response.json()).data;
  assert.equal(data.requested_track,'ADVANCED_REASONING');
  assert.equal(data.formulas.length,6);
  assert.equal(data.plan.problem_mix.concept+data.plan.problem_mix.standard+data.plan.problem_mix.advanced,100);
  assert.equal(data.privacy.answer_schemas_included,false);
  assert.equal(JSON.stringify(data).includes('accepted_values'),false);
  assert.equal(data.truth_boundary.production_ready,false);
});

test('academy curriculum rejects cross-student access and invalid tracks',async()=>{
  const {studentId,authorization}=await issueStudent();
  const cross=await fetch(`${baseUrl}/api/v1/students/99999999-9999-4999-8999-999999999999/academy-curriculum?target=SCHOOL_EXAM`,{headers:{authorization}});
  assert.equal(cross.status,403);
  const invalid=await fetch(`${baseUrl}/api/v1/students/${studentId}/academy-curriculum?target=SUPER_ELITE`,{headers:{authorization}});
  assert.equal(invalid.status,400);
});
