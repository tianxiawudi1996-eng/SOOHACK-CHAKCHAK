import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const fail=(message)=>{console.error(`COLLABORATION_RUNTIME_FAIL: ${message}`);process.exit(1);};
const contract=JSON.parse(read('infra/database/collaboration-runtime-contract.json'));
const migration=read(contract.migration);const rollback=read(contract.rollback);
const runtime=read('developer/src/learning/collaboration-runtime.mjs');const repository=read('developer/src/api/repository.mjs');const server=read('developer/src/api/server.mjs');
const app=read('client/curriculum/app.js');const html=read('client/curriculum/index.html');const css=read('client/curriculum/styles.css');const compose=read('infra/deployment/compose.api-staging.yaml');
if(contract.database!=='PostgreSQL'||contract.phase_count!==5||contract.evidence_kind!=='STRUCTURED_SELF_REPORT'||contract.mathematical_mastery_claimed!==false||contract.free_text_collected!==false)fail('runtime contract boundary invalid');
for(const table of ['collaboration_phase_evidence','student_formula_collaboration_progress']){if(!migration.includes(`CREATE TABLE mathchakchak.${table}`))fail(`migration missing ${table}`);if(!rollback.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))fail(`rollback missing ${table}`);}
for(const column of ['started_at','completed_at','evidence_score']){if(!migration.includes(`ADD COLUMN ${column}`))fail(`session column missing ${column}`);if(!rollback.includes(`DROP COLUMN IF EXISTS ${column}`))fail(`rollback column missing ${column}`);}
for(const signal of ['CONFIDENT','NEEDS_REVIEW','CONNECTED','NEEDS_EXAMPLE','DERIVED','NEEDS_GUIDANCE','APPLIED','NEEDS_HINT','VERIFIED','REVIEW_REQUIRED'])if(!runtime.includes(signal)||!migration.includes(signal))fail(`structured signal missing ${signal}`);
for(const token of ['FIVE_PHASE_EVIDENCE_REQUIRED','next_review_days','PHASE_WEIGHTS'])if(!runtime.includes(token))fail(`runtime rule missing ${token}`);
for(const method of ['getCurriculumCollaborationPlan','addCurriculumCollaborationEvidence','completeCurriculumCollaborationPlan'])if(!repository.includes(method))fail(`repository method missing ${method}`);
for(const endpoint of ['/phase-evidence','/complete'])if(!server.includes(endpoint))fail(`runtime endpoint missing ${endpoint}`);
if(!repository.includes('student_formula_collaboration_progress')||!repository.includes('FOR UPDATE'))fail('progress persistence or row lock missing');
if(/localStorage|sessionStorage|document\.cookie/.test(app))fail('browser persistence forbidden');
for(const id of ['activityPanel','activityPrompt','signalChoices','activityResult'])if(!html.includes(`id="${id}"`))fail(`activity UI missing ${id}`);
if(!app.includes('duration_ms')||!app.includes('phase-evidence')||!app.includes('/complete'))fail('activity API wiring incomplete');
if(!/@media\(max-width:760px\)/.test(css)||!/@media\(prefers-reduced-motion:reduce\)/.test(css))fail('responsive or reduced motion rule missing');
if(!compose.includes('0006_collaboration_learning_runtime.sql'))fail('compose migration mount missing');
for(const doc of ['docs/developer/productization/COLLABORATION_LEARNING_RUNTIME_DESIGN_v1.0.md','docs/productization/prompts/PHASE_15_COLLABORATION_LEARNING_RUNTIME_METAPROMPT_v1.0.md'])for(const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering'])if(!read(doc).includes(section))fail(`global section missing ${section}`);
console.log('COLLABORATION_RUNTIME_STATIC_PASS');
console.log('phases=5/5');console.log('structured_signals=10/10');console.log('free_text=0');console.log('mastery_claim=false');
