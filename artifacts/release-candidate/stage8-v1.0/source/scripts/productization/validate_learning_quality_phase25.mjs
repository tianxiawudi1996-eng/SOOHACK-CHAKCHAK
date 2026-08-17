import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const json=(relative)=>JSON.parse(read(relative));
const fail=(message)=>{throw new Error(`PHASE25_LEARNING_QUALITY_FAIL: ${message}`);};

for(const file of [
  'developer/src/analytics/learning-quality.mjs',
  'tests/unit/analytics/learning-quality.test.mjs',
  'tests/integration/api-learning-quality.test.mjs',
  'docs/developer/productization/LEARNING_QUALITY_KPI_FRAMEWORK_v1.0.md',
  'docs/productization/prompts/PHASE_25_LEARNING_QUALITY_ANALYTICS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_25_LEARNING_QUALITY_QA.json',
  'docs/productization/reports/PHASE_25_LEARNING_QUALITY_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);

const analytics=read('developer/src/analytics/learning-quality.mjs');
for(const marker of ['learning_completion_rate','application_mastery_rate','durable_recall_rate','independent_response_rate','collaboration_pass_rate','PROVISIONAL_NO_FIELD_BASELINE','raw_answers_included:false','direct_identifiers_included:false'])if(!analytics.includes(marker))fail(`metric ${marker}`);

const repository=read('developer/src/api/repository.mjs');
for(const table of ['formula_learning_session','student_formula_application_progress','formula_recall_attempt','formula_learning_response','collaboration_phase_evidence'])if(!repository.includes(table))fail(`source ${table}`);
if(!repository.includes('if(studentId!==actor.studentId)throw forbidden()'))fail('student ownership');

const server=read('developer/src/api/server.mjs');
if(!server.includes('/learning-quality$')||!server.includes("match.name==='getLearningQuality'"))fail('API route');

const privacy=read('developer/src/privacy/log-policy.mjs');
for(const denied of ["'response_value'","'student_id'","'user_id'","'authorization'","'email'","'ip_address'"])if(!privacy.includes(denied))fail(`privacy ${denied}`);
const events=read('developer/src/observability/event-schema.mjs');
if(!events.includes('PROPERTY_NOT_ALLOWED')||!events.includes('learning.quality.viewed'))fail('event allowlist');

const evidence=json('docs/productization/evidence/PHASE_25_LEARNING_QUALITY_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_ANALYTICS'||evidence.metrics.primary!=='3/3'||evidence.metrics.drivers!=='2/2')fail('evidence metrics');
if(evidence.privacy.direct_identifier_findings!==0||evidence.privacy.raw_answer_findings!==0)fail('privacy evidence');
if(evidence.integration.learning_quality!=='1/1 PASS'||evidence.integration.postgresql_regression!=='16/16 PASS')fail('integration evidence');
if(evidence.field_target_validation.performed!==false||evidence.field_target_validation.status!=='BLOCKED_REAL_TRAFFIC_AND_CONSENT')fail('field boundary');

console.log('PHASE25_LEARNING_QUALITY_STATIC_PASS');
console.log('primary_kpis=3/3');
console.log('driver_metrics=2/2');
console.log('privacy_contracts=PASS');
console.log('field_targets=PROVISIONAL');
