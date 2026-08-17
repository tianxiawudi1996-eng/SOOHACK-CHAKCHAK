import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE27_PRIVACY_OPERATIONS_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/privacy-operations.mjs','infra/database/migrations/0013_privacy_operations.sql',
  'infra/database/migrations/0013_privacy_operations_rollback.sql','infra/database/privacy-operations-contract.json',
  'tests/unit/privacy/privacy-operations.test.mjs','tests/integration/api-privacy-operations.test.mjs',
  'docs/developer/productization/PRIVACY_OPERATIONS_WORKFLOW_v1.0.md',
  'docs/productization/prompts/PHASE_27_PRIVACY_OPERATIONS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_27_PRIVACY_OPERATIONS_QA.json',
  'docs/productization/reports/PHASE_27_PRIVACY_OPERATIONS_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0013_privacy_operations.sql');
for(const marker of ['privacy_request_assignment','privacy_request_evidence','privacy_request_decision','ON DELETE RESTRICT','evidence_sha256'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/privacy-operations.mjs');
for(const marker of ['IDENTITY_EVIDENCE_REQUIRED','DECISION_REASON_REQUIRED','PRIVACY_FULFILMENT_EXECUTOR_DISABLED','destructive_fulfilment_enabled:false','managed_identity_ready:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['/api/v1/privacy-operations/requests','localDemoPrivacyOperatorSession','transitionPrivacyOperation'])if(!server.includes(marker))fail(`API ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['assertPrivacyOperator','FOR UPDATE','privacy_request_assignment','privacy_request_decision','privacy_request_event'])if(!repository.includes(marker))fail(`repository ${marker}`);
const contract=json('infra/database/privacy-operations-contract.json');
if(contract.destructive_fulfilment_enabled!==false||contract.completion_transition_enabled!==false||contract.managed_identity_ready!==false)fail('safety contract');
const evidence=json('docs/productization/evidence/PHASE_27_PRIVACY_OPERATIONS_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_PRIVACY_OPERATIONS'||evidence.tests.unit!=='71/71 PASS'||evidence.tests.postgresql_regression!=='18/18 PASS')fail('evidence tests');
if(evidence.safety.destructive_fulfilment_enabled!==false||evidence.safety.completion_transition!=='409 BLOCKED')fail('evidence safety');
console.log('PHASE27_PRIVACY_OPERATIONS_STATIC_PASS');
console.log('operator_tables=3/3');
console.log('unit=71/71');
console.log('postgresql_integration=18/18');
console.log('fulfilment_executor=DISABLED');
