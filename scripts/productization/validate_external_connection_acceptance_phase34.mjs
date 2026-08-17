import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE34_EXTERNAL_CONNECTION_ACCEPTANCE_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-connection-acceptance.mjs','infra/database/migrations/0020_external_connection_acceptance_packet.sql',
  'infra/database/migrations/0020_external_connection_acceptance_packet_rollback.sql','infra/database/external-connection-acceptance-contract.json',
  'tests/unit/privacy/external-connection-acceptance.test.mjs','tests/integration/api-external-connection-acceptance.test.mjs',
  'docs/developer/productization/EXTERNAL_CONNECTION_ACCEPTANCE_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_34_EXTERNAL_CONNECTION_ACCEPTANCE_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_34_EXTERNAL_CONNECTION_ACCEPTANCE_QA.json',
  'docs/productization/reports/PHASE_34_EXTERNAL_CONNECTION_ACCEPTANCE_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0020_external_connection_acceptance_packet.sql');
for(const marker of ['privacy_external_connection_acceptance_packet','privacy_external_connection_acceptance_requirement','PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL','EXTERNAL_CONFIGURATION_REQUIRED','MISSING_EXTERNAL','dual_approval_required = true','credential_material_storage_allowed = false','secret_material_storage_allowed = false','NOT_RUN_EXTERNAL','NOT_REVIEWED_EXTERNAL','connection_enablement_allowed = false','BEFORE UPDATE OR DELETE','EXTERNAL_CONNECTION_ACCEPTANCE_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-connection-acceptance.mjs');
for(const marker of ['CERTIFICATE_LIFECYCLE','TRUST_STORE_GOVERNANCE','SIGNING_KEY_ROTATION','CONNECTION_AUTHORIZATION','FAILURE_RECOVERY_RUNBOOK','OPERATIONAL_ACCEPTANCE','certificate_material_write_enabled:false','acceptance_decision_write_enabled:false','network_connection_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalConnectionAcceptancePacket','SECURITY_APPROVER','buildExternalConnectionAcceptancePacket','privacy_external_connection_acceptance_requirement','CONNECTION_ACCEPTANCE_ADAPTER_SUPERSEDED','CONNECTION_ACCEPTANCE_PACKAGE_EXPIRED','CONNECTION_ACCEPTANCE_LEGAL_HOLD_ACTIVE','CONNECTION_ACCEPTANCE_ADAPTER_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['connection-acceptance-packets','createExternalConnectionAcceptancePacket','getExternalConnectionAcceptancePacket'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-connection-acceptance-contract.json');
if(contract.requirements!==6||contract.required_evidence!==12||contract.required_approver_roles.length!==2)fail('acceptance contract');
if(contract.credential_material_storage_allowed!==false||contract.secret_material_storage_allowed!==false||contract.connection_authorized!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_34_EXTERNAL_CONNECTION_ACCEPTANCE_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL'||evidence.tests.unit!=='101/101 PASS'||evidence.tests.postgresql_regression!=='25/25 PASS')fail('evidence tests');
if(evidence.safety.credential_material_storage_allowed!==false||evidence.safety.secret_material_storage_allowed!==false||evidence.safety.network_connection_enabled!==false||evidence.safety.connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE34_EXTERNAL_CONNECTION_ACCEPTANCE_STATIC_PASS');
console.log('acceptance_tables=2/2');
console.log('unit=101/101');
console.log('postgresql_integration=25/25');
console.log('requirements=6/6 evidence_types=12/12');
console.log('connection_authorized=false execution_authorized=false');
