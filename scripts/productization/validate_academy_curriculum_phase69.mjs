import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const required=[
  'developer/contracts/academy-track-curriculum-v1.0.json','developer/src/learning/academy-curriculum.mjs',
  'infra/database/migrations/0034_academy_track_curriculum.sql','infra/database/migrations/0034_academy_track_curriculum_rollback.sql',
  'infra/database/seeds/0010_academy_track_curriculum.sql','infra/database/tests/0034_academy_track_curriculum_smoke.sql',
  'docs/developer/productization/ACADEMY_TRACK_CURRICULUM_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_69_ACADEMY_TRACK_CURRICULUM_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_69_ACADEMY_CURRICULUM_QA.json','docs/productization/reports/PHASE_69_ACADEMY_TRACK_CURRICULUM_REPORT.md',
  'client/academy/index.html','client/academy/app.js','client/academy/messages.mjs','client/academy/styles.css',
  'tests/unit/learning/academy-curriculum.test.mjs','tests/integration/api-academy-curriculum.test.mjs','tests/integration/web-academy-curriculum.test.mjs'
];
const missing=required.filter(path=>!existsSync(resolve(root,path)));
if(missing.length)throw new Error(`missing: ${missing.join(', ')}`);
const contract=JSON.parse(readFileSync(resolve(root,required[0]),'utf8'));
if(contract.requirement_id!=='D80-04'||contract.grades.length!==12||contract.tracks.length!==4)throw new Error('academy curriculum identity invalid');
if(contract.coverage.plans!==48||contract.coverage.formula_assignments!==288||contract.truth_boundary.production_ready!==false)throw new Error('academy curriculum boundary invalid');
const up=readFileSync(resolve(root,required[2]),'utf8');
const down=readFileSync(resolve(root,required[3]),'utf8');
for(const table of ['academy_track_curriculum','academy_track_formula_assignment']){
  if(!up.includes(`CREATE TABLE mathchakchak.${table}`))throw new Error(`up missing ${table}`);
  if(!down.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))throw new Error(`rollback missing ${table}`);
}
for(const token of ['concept_percent + standard_percent + advanced_percent = 100','academy_track_curriculum_runtime_idx','academy_track_formula_catalog_idx','BLOCKED_EXTERNAL']){
  if(!up.includes(token))throw new Error(`control missing: ${token}`);
}
const ui=readFileSync(resolve(root,'client/academy/app.js'),'utf8');
for(const token of ['academy-curriculum?target=','EVIDENCE_GATED_FALLBACK','curriculumFormulaGrid','textContent=formula.explanation']){
  const source=token==='curriculumFormulaGrid'?readFileSync(resolve(root,'client/academy/index.html'),'utf8'):ui;
  if(!source.includes(token))throw new Error(`academy UI control missing: ${token}`);
}
if(ui.includes('accepted_values'))throw new Error('academy UI must not consume answer schemas');
console.log('ACADEMY_CURRICULUM_PHASE69_STATIC_PASS');
console.log('grades=12/12');
console.log('tracks=4/4');
console.log('plans=48');
console.log('assignments=288');
console.log('expert_reviewed=0/48');
console.log('licensed=0/48');
