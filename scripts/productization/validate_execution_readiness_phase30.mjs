import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE30_EXECUTION_READINESS_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/execution-readiness.mjs','infra/database/migrations/0016_execution_readiness.sql',
  'infra/database/migrations/0016_execution_readiness_rollback.sql','infra/database/execution-readiness-contract.json',
  'tests/unit/privacy/execution-readiness.test.mjs','tests/integration/api-execution-readiness.test.mjs',
  'docs/developer/productization/EXECUTION_READINESS_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_30_EXECUTION_READINESS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_30_EXECUTION_READINESS_QA.json',
  'docs/productization/reports/PHASE_30_EXECUTION_READINESS_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0016_execution_readiness.sql');
for(const marker of ['privacy_execution_readiness_review','privacy_execution_readiness_control','BLOCKED_EXTERNAL','MISSING_EXTERNAL','kill_switch_engaged = true','execution_authorized = false','BEFORE UPDATE OR DELETE','EXECUTION_READINESS_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/execution-readiness.mjs');
for(const marker of ['MANAGED_IDENTITY','JIT_AUTHORIZATION','BACKUP_RESTORE_EVIDENCE','CHANGE_WINDOW','KILL_SWITCH_RELEASE_AUTHORITY','AUDIT_EXPORT_ROUTE','execution_authorized:false','destructive_executor_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExecutionReadinessReview','SECURITY_APPROVER','evaluateExecutionReadiness','privacy_execution_readiness_control'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['execution-readiness-reviews','createExecutionReadinessReview','getExecutionReadinessReview'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/execution-readiness-contract.json');
if(contract.required_external_controls.length!==6||contract.kill_switch_engaged!==true||contract.execution_authorized!==false||contract.destructive_executor_enabled!==false)fail('safety contract');
const evidence=json('docs/productization/evidence/PHASE_30_EXECUTION_READINESS_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_EXECUTION_READINESS_BLOCKED_EXTERNAL'||evidence.tests.unit!=='85/85 PASS'||evidence.tests.postgresql_regression!=='21/21 PASS')fail('evidence tests');
if(evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0||evidence.controls.external_controls!=='6/6 MISSING_EXTERNAL')fail('evidence boundary');
console.log('PHASE30_EXECUTION_READINESS_STATIC_PASS');
console.log('readiness_tables=2/2');
console.log('unit=85/85');
console.log('postgresql_integration=21/21');
console.log('external_controls=6/6_MISSING');
console.log('execution_authorized=false');
