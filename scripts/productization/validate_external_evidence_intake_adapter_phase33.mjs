import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE33_EXTERNAL_EVIDENCE_INTAKE_ADAPTER_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-evidence-intake-adapter.mjs','infra/database/migrations/0019_external_evidence_intake_adapter_contract.sql',
  'infra/database/migrations/0019_external_evidence_intake_adapter_contract_rollback.sql','infra/database/external-evidence-intake-adapter-contract.json',
  'tests/unit/privacy/external-evidence-intake-adapter.test.mjs','tests/integration/api-external-evidence-intake-adapter.test.mjs',
  'docs/developer/productization/EXTERNAL_EVIDENCE_INTAKE_ADAPTER_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_33_EXTERNAL_EVIDENCE_INTAKE_ADAPTER_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_33_EXTERNAL_EVIDENCE_INTAKE_ADAPTER_QA.json',
  'docs/productization/reports/PHASE_33_EXTERNAL_EVIDENCE_INTAKE_ADAPTER_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0019_external_evidence_intake_adapter_contract.sql');
for(const marker of ['privacy_external_evidence_intake_adapter_contract','privacy_external_evidence_intake_port','CONTRACT_ONLY_EXTERNAL_ADAPTER_MISSING','MISSING_EXTERNAL','mtls_required = true','signature_verification_required = true','replay_guard_required = true','quarantine_required = true','automatic_release_allowed = false','raw_payload_storage_allowed = false','BEFORE UPDATE OR DELETE','EXTERNAL_EVIDENCE_INTAKE_ADAPTER_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-evidence-intake-adapter.mjs');
for(const marker of ['ENVELOPE_SCHEMA','SIGNATURE_VERIFICATION','ISSUER_TRUST','REPLAY_GUARD','QUARANTINE','POLICY_HANDOFF','network_connection_enabled:false','evidence_intake_enabled:false','quarantine_release_enabled:false','retry_execution_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalEvidenceIntakeAdapterContract','SECURITY_APPROVER','buildExternalEvidenceIntakeAdapterContract','privacy_external_evidence_intake_port','INTAKE_ADAPTER_VALIDATION_SUPERSEDED','INTAKE_ADAPTER_PACKAGE_EXPIRED','INTAKE_ADAPTER_LEGAL_HOLD_ACTIVE','INTAKE_ADAPTER_VALIDATION_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['intake-adapter-contracts','createExternalEvidenceIntakeAdapterContract','getExternalEvidenceIntakeAdapterContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-evidence-intake-adapter-contract.json');
if(contract.pipeline_stages.length!==6||contract.ports!==6||contract.port_status!=='MISSING_EXTERNAL')fail('adapter contract');
if(contract.network_connection_enabled!==false||contract.raw_payload_storage_allowed!==false||contract.execution_authorized!==false||contract.automatic_release_allowed!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_33_EXTERNAL_EVIDENCE_INTAKE_ADAPTER_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_INTAKE_ADAPTER_CONTRACT_BLOCKED_EXTERNAL'||evidence.tests.unit!=='97/97 PASS'||evidence.tests.postgresql_regression!=='24/24 PASS')fail('evidence tests');
if(evidence.safety.network_connection_enabled!==false||evidence.safety.evidence_intake_enabled!==false||evidence.safety.raw_payload_storage_allowed!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE33_EXTERNAL_EVIDENCE_INTAKE_ADAPTER_STATIC_PASS');
console.log('adapter_tables=2/2');
console.log('unit=97/97');
console.log('postgresql_integration=24/24');
console.log('pipeline_stages=6/6 ports=6/6');
console.log('network_connection_enabled=false execution_authorized=false');
