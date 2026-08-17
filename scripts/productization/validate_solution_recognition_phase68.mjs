import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const paths=[
  'developer/contracts/solution-recognition-v1.0.json',
  'developer/src/learning/solution-recognition.mjs',
  'infra/database/migrations/0033_solution_recognition_confidence.sql',
  'infra/database/migrations/0033_solution_recognition_confidence_rollback.sql',
  'infra/database/tests/0033_solution_recognition_confidence_smoke.sql',
  'docs/developer/productization/SOLUTION_RECOGNITION_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_68_SOLUTION_RECOGNITION_CONFIDENCE_METAPROMPT_v1.0.md',
  'tests/unit/learning/solution-recognition.test.mjs',
  'tests/integration/api-solution-recognition.test.mjs',
  'docs/productization/evidence/PHASE_68_SOLUTION_RECOGNITION_QA.json',
  'docs/productization/reports/PHASE_68_SOLUTION_RECOGNITION_CONFIDENCE_REPORT.md'
];
const missing=paths.filter(path=>!existsSync(resolve(root,path)));
if(missing.length)throw new Error(`missing: ${missing.join(', ')}`);
const contract=JSON.parse(readFileSync(resolve(root,paths[0]),'utf8'));
if(contract.requirement_id!=='D80-03'||contract.truth_boundary.ocr_provider_status!=='NOT_CONFIGURED')throw new Error('truth boundary invalid');
if(contract.decisions.length!==4||contract.persistence.raw_image!==false||contract.safety.automatic_scoring!==false)throw new Error('recognition contract invalid');
const up=readFileSync(resolve(root,paths[2]),'utf8');
const down=readFileSync(resolve(root,paths[3]),'utf8');
for(const table of ['solution_capture','solution_recognition_evaluation','solution_review_queue']){
  if(!up.includes(`CREATE TABLE mathchakchak.${table}`))throw new Error(`up missing ${table}`);
  if(!down.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))throw new Error(`rollback missing ${table}`);
}
for(const token of ['raw_asset_persisted = false','automatic_scoring_allowed = false','solution_review_queue_pending_idx','enqueue_solution_teacher_review']){
  if(!up.includes(token))throw new Error(`control missing: ${token}`);
}
console.log('SOLUTION_RECOGNITION_PHASE68_STATIC_PASS');
console.log('decisions=4/4');
console.log('tables=3/3');
console.log('raw_persistence=false');
console.log('automatic_scoring=false');
console.log('ocr_provider=NOT_CONFIGURED');
