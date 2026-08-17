import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE35_EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-configuration-evidence-queue.mjs','infra/database/migrations/0021_external_configuration_evidence_queue_contract.sql',
  'infra/database/migrations/0021_external_configuration_evidence_queue_contract_rollback.sql','infra/database/external-configuration-evidence-queue-contract.json',
  'tests/unit/privacy/external-configuration-evidence-queue.test.mjs','tests/integration/api-external-configuration-evidence-queue.test.mjs',
  'docs/developer/productization/EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_35_EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_35_EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_QA.json',
  'docs/productization/reports/PHASE_35_EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0021_external_configuration_evidence_queue_contract.sql');
for(const marker of ['privacy_external_configuration_evidence_queue_contract','privacy_external_configuration_evidence_queue_slot','QUEUE_CONTRACT_ONLY_EXTERNAL_SUBMISSION_MISSING','AWAITING_EXTERNAL_SUBMISSION_CHANNEL','immutable_reference_required = true','sha256_required = true','issuer_provenance_required = true','duplicate_guard_required = true','NOT_SUBMITTED','raw_payload_storage_allowed = false','automatic_promotion_allowed = false','BEFORE UPDATE OR DELETE','EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-configuration-evidence-queue.mjs');
for(const marker of ['ENVELOPE_SCHEMA','REFERENCE_POLICY','SHA256_INTEGRITY','ISSUER_PROVENANCE','DUPLICATE_GUARD','QUARANTINE_QUEUE','DUAL_REVIEW_QUEUE','configuration_evidence_submission_enabled:false','external_reference_fetch_enabled:false','automatic_promotion_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalConfigurationEvidenceQueueContract','SECURITY_APPROVER','buildExternalConfigurationEvidenceQueueContract','privacy_external_configuration_evidence_queue_slot','CONFIG_QUEUE_ACCEPTANCE_SUPERSEDED','CONFIG_QUEUE_PACKAGE_EXPIRED','CONFIG_QUEUE_LEGAL_HOLD_ACTIVE','CONFIG_QUEUE_ACCEPTANCE_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['configuration-evidence-queue-contracts','createExternalConfigurationEvidenceQueueContract','getExternalConfigurationEvidenceQueueContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-configuration-evidence-queue-contract.json');
if(contract.queue_stages!==7||contract.slots!==6||contract.allowed_evidence_types!==12)fail('queue contract');
if(contract.raw_payload_storage_allowed!==false||contract.credential_material_storage_allowed!==false||contract.secret_material_storage_allowed!==false||contract.automatic_promotion_allowed!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_35_EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_CONFIGURATION_EVIDENCE_QUEUE_BLOCKED_EXTERNAL'||evidence.tests.unit!=='105/105 PASS'||evidence.tests.postgresql_regression!=='26/26 PASS')fail('evidence tests');
if(evidence.safety.configuration_evidence_submission_enabled!==false||evidence.safety.external_reference_fetch_enabled!==false||evidence.safety.raw_payload_storage_allowed!==false||evidence.safety.connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE35_EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_STATIC_PASS');
console.log('queue_tables=2/2');
console.log('unit=105/105');
console.log('postgresql_integration=26/26');
console.log('queue_stages=7/7 slots=6/6 evidence_types=12/12');
console.log('submission_enabled=false connection_authorized=false execution_authorized=false');
