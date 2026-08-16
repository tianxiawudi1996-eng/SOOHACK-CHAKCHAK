import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const paths=[
  'developer/contracts/content-corpus-v1.0.json',
  'developer/src/content/corpus-readiness.mjs',
  'infra/database/migrations/0032_content_corpus_governance.sql',
  'infra/database/migrations/0032_content_corpus_governance_rollback.sql',
  'infra/database/tests/0032_content_corpus_governance_smoke.sql',
  'docs/developer/productization/CONTENT_CORPUS_GOVERNANCE_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_67_LICENSED_CONTENT_CORPUS_METAPROMPT_v1.0.md',
  'tests/unit/content/corpus-readiness.test.mjs'
  ,'docs/productization/evidence/PHASE_67_CONTENT_CORPUS_QA.json'
  ,'docs/productization/reports/PHASE_67_CONTENT_CORPUS_FOUNDATION_REPORT.md'
];
const missing=paths.filter((path)=>!existsSync(resolve(root,path)));
if(missing.length)throw new Error(`missing: ${missing.join(', ')}`);
const contract=JSON.parse(readFileSync(resolve(root,paths[0]),'utf8'));
if(contract.target_published_items!==30000||contract.publication_gates.length!==5||contract.truth_boundary.licensed_items_currently_supplied!==0)throw new Error('corpus contract invalid');
const up=readFileSync(resolve(root,paths[2]),'utf8');
const down=readFileSync(resolve(root,paths[3]),'utf8');
const tables=['content_license','content_import_batch','content_problem','content_problem_revision','content_problem_review','content_quality_finding'];
for(const table of tables){
  if(!up.includes(`CREATE TABLE mathchakchak.${table}`))throw new Error(`up missing ${table}`);
  if(!down.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))throw new Error(`rollback missing ${table}`);
}
for(const token of ['CONTENT_PUBLICATION_GATE_BLOCKED','count(DISTINCT reviewer_identity_reference)','status = \'ACTIVE\'','severity IN (\'ERROR\',\'CRITICAL\')','content_problem_published_idx','content_quality_finding_open_idx']){
  if(!up.includes(token))throw new Error(`publication control missing: ${token}`);
}
console.log('CONTENT_CORPUS_PHASE67_STATIC_PASS');
console.log('tables=6/6');
console.log('publication_gates=5/5');
console.log('target=30000');
console.log('licensed_items_supplied=0/30000');
console.log('status=BLOCKED_EXTERNAL_CONTENT_EVIDENCE');
