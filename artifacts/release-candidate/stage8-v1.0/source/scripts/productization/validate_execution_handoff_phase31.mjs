import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE31_EXECUTION_HANDOFF_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/execution-handoff.mjs','infra/database/migrations/0017_execution_handoff_packet.sql',
  'infra/database/migrations/0017_execution_handoff_packet_rollback.sql','infra/database/execution-handoff-contract.json',
  'tests/unit/privacy/execution-handoff.test.mjs','tests/integration/api-execution-handoff.test.mjs',
  'docs/developer/productization/EXECUTION_HANDOFF_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_31_EXECUTION_HANDOFF_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_31_EXECUTION_HANDOFF_QA.json',
  'docs/productization/reports/PHASE_31_EXECUTION_HANDOFF_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0017_execution_handoff_packet.sql');
for(const marker of ['privacy_execution_handoff_packet','privacy_execution_handoff_requirement','AWAITING_EXTERNAL_SUBMISSION','EXTERNAL_SUBMISSION_REQUIRED','MISSING_EXTERNAL','kill_switch_engaged = true','execution_authorized = false','BEFORE UPDATE OR DELETE','EXECUTION_HANDOFF_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/execution-handoff.mjs');
for(const marker of ['IDENTITY_PLATFORM_OWNER','PRIVILEGED_ACCESS_OWNER','BACKUP_RECOVERY_OWNER','CHANGE_MANAGER','INCIDENT_CONTROL_OWNER','AUDIT_ARCHIVE_OWNER','external_submission_write_enabled:false','execution_authorized:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExecutionHandoffPacket','SECURITY_APPROVER','buildExecutionHandoffPacket','privacy_execution_handoff_requirement','EXECUTION_HANDOFF_READINESS_SUPERSEDED','EXECUTION_HANDOFF_PACKAGE_EXPIRED','EXECUTION_HANDOFF_LEGAL_HOLD_ACTIVE'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['handoff-packets','createExecutionHandoffPacket','getExecutionHandoffPacket'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/execution-handoff-contract.json');
if(contract.requirements!==6||contract.required_evidence_per_control!==2||contract.required_approver_roles.length!==2||contract.kill_switch_engaged!==true||contract.execution_authorized!==false)fail('handoff contract');
const evidence=json('docs/productization/evidence/PHASE_31_EXECUTION_HANDOFF_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_HANDOFF_PACKET_BLOCKED_EXTERNAL'||evidence.tests.unit!=='89/89 PASS'||evidence.tests.postgresql_regression!=='22/22 PASS')fail('evidence tests');
if(evidence.safety.external_submission_write_enabled!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE31_EXECUTION_HANDOFF_STATIC_PASS');
console.log('handoff_tables=2/2');
console.log('unit=89/89');
console.log('postgresql_integration=22/22');
console.log('external_requirements=6/6_REQUIRED');
console.log('execution_authorized=false');
