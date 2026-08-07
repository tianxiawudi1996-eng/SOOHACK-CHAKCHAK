import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE28_FULFILMENT_CONTROLS_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/fulfilment-controls.mjs','infra/database/migrations/0014_fulfilment_controls.sql',
  'infra/database/migrations/0014_fulfilment_controls_rollback.sql','infra/database/fulfilment-controls-contract.json',
  'tests/unit/privacy/fulfilment-controls.test.mjs','tests/integration/api-fulfilment-controls.test.mjs',
  'docs/developer/productization/PRIVACY_FULFILMENT_CONTROLS_v1.0.md',
  'docs/productization/prompts/PHASE_28_FULFILMENT_CONTROLS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_28_FULFILMENT_CONTROLS_QA.json',
  'docs/productization/reports/PHASE_28_FULFILMENT_CONTROLS_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0014_fulfilment_controls.sql');
for(const marker of ['privacy_operator_authorization','privacy_fulfilment_plan','privacy_impact_assessment','privacy_legal_hold','privacy_fulfilment_approval','DRY_RUN_ONLY','UNIQUE (fulfilment_plan_id,approver_user_id)'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/fulfilment-controls.mjs');
for(const marker of ['PRIVACY_APPROVER','SECURITY_APPROVER','destructive_executor_enabled:false','completion_transition_enabled:false','dual_approval_required:true'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['assessFulfilmentImpact','ACTIVE_LEGAL_HOLD','DUAL_APPROVAL_DISTINCT_APPROVER_REQUIRED','privacy_impact_assessment','DUAL_APPROVED'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['createFulfilmentPlan','assessFulfilmentImpact','setPrivacyLegalHold','releasePrivacyLegalHold','decideFulfilmentApproval'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/fulfilment-controls-contract.json');
if(contract.execution_mode!=='DRY_RUN_ONLY'||contract.destructive_executor_enabled!==false||contract.completion_transition_enabled!==false)fail('execution boundary');
const evidence=json('docs/productization/evidence/PHASE_28_FULFILMENT_CONTROLS_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_FULFILMENT_CONTROLS'||evidence.tests.unit!=='74/74 PASS'||evidence.tests.postgresql_regression!=='19/19 PASS')fail('evidence tests');
if(evidence.safety.source_data_mutations!==0||evidence.controls.active_legal_hold!=='409 BLOCKED')fail('evidence safety');
console.log('PHASE28_FULFILMENT_CONTROLS_STATIC_PASS');
console.log('control_tables=5/5');
console.log('unit=74/74');
console.log('postgresql_integration=19/19');
console.log('source_data_mutations=0');
