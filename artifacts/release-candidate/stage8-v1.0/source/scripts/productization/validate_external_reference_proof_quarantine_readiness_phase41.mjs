import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE41_QUARANTINE_READINESS_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-reference-proof-quarantine-readiness.mjs','infra/database/migrations/0027_external_reference_proof_quarantine_readiness_contract.sql',
  'infra/database/migrations/0027_external_reference_proof_quarantine_readiness_contract_rollback.sql','infra/database/external-reference-proof-quarantine-readiness-contract.json',
  'tests/unit/privacy/external-reference-proof-quarantine-readiness.test.mjs','tests/integration/api-external-reference-proof-quarantine-readiness.test.mjs',
  'docs/developer/productization/EXTERNAL_REFERENCE_PROOF_QUARANTINE_READINESS_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_41_EXTERNAL_REFERENCE_PROOF_QUARANTINE_READINESS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_41_EXTERNAL_REFERENCE_PROOF_QUARANTINE_READINESS_QA.json',
  'docs/productization/reports/PHASE_41_EXTERNAL_REFERENCE_PROOF_QUARANTINE_READINESS_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0027_external_reference_proof_quarantine_readiness_contract.sql');
for(const marker of ['privacy_external_reference_proof_quarantine_readiness_contract','privacy_external_reference_proof_quarantine_requirement','QUARANTINE_READINESS_POLICY_ONLY_EXTERNAL_CONTROLS_MISSING','jsonb_array_length(storage_security_controls) = 8','jsonb_array_length(content_inspection_stages) = 8','jsonb_array_length(content_rejection_codes) = 12','jsonb_array_length(retention_lifecycle_events) = 7','jsonb_array_length(audit_required_fields) = 10',"allowed_content_types = '[]'::jsonb",'malware_scan_required = true','raw_evidence_storage_allowed = false','BEFORE UPDATE OR DELETE','EXTERNAL_REFERENCE_PROOF_QUARANTINE_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-reference-proof-quarantine-readiness.mjs');
for(const marker of ['QUARANTINE_STORAGE_SECURITY_CONTROLS','QUARANTINE_CONTENT_INSPECTION_STAGES','QUARANTINE_CONTENT_REJECTION_CODES','QUARANTINE_RETENTION_LIFECYCLE_EVENTS','QUARANTINE_AUDIT_REQUIRED_FIELDS','MALWARE_DETECTED','quarantine_storage_write_enabled:false','malware_scan_execution_enabled:false','deletion_execution_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalReferenceProofQuarantineReadinessContract','SECURITY_APPROVER','buildExternalReferenceProofQuarantineReadinessContract','privacy_external_reference_proof_quarantine_requirement','QUARANTINE_READINESS_INTAKE_SUPERSEDED','QUARANTINE_READINESS_PACKAGE_EXPIRED','QUARANTINE_READINESS_LEGAL_HOLD_ACTIVE','QUARANTINE_READINESS_INTAKE_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['quarantine-readiness-contracts','createExternalReferenceProofQuarantineReadinessContract','getExternalReferenceProofQuarantineReadinessContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-reference-proof-quarantine-readiness-contract.json');
if(contract.contract_tables!==2||contract.control_requirements!==6||contract.storage_security_controls!==8||contract.content_inspection_stages!==8||contract.content_rejection_codes!==12||contract.retention_lifecycle_events!==7||contract.audit_required_fields!==10||contract.allowed_content_types!==0)fail('quarantine readiness contract');
if(contract.objects_present!==0||contract.scan_results_present!==0||contract.storage_write_enabled!==false||contract.inspection_execution_enabled!==false||contract.deletion_execution_enabled!==false||contract.audit_write_enabled!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_41_EXTERNAL_REFERENCE_PROOF_QUARANTINE_READINESS_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_QUARANTINE_READINESS_POLICY_BLOCKED_EXTERNAL'||evidence.tests.unit!=='129/129 PASS'||evidence.tests.postgresql_regression!=='32/32 PASS')fail('evidence tests');
if(evidence.safety.proof_upload_enabled!==false||evidence.safety.quarantine_storage_write_enabled!==false||evidence.safety.content_inspection_execution_enabled!==false||evidence.safety.malware_scan_execution_enabled!==false||evidence.safety.retention_timer_write_enabled!==false||evidence.safety.deletion_execution_enabled!==false||evidence.safety.audit_event_write_enabled!==false||evidence.safety.quarantine_release_enabled!==false||evidence.safety.network_connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE41_QUARANTINE_READINESS_STATIC_PASS');
console.log('quarantine_tables=2/2');
console.log('unit=129/129');
console.log('postgresql_integration=32/32');
console.log('requirements=6/6 storage=8/8 inspection=8/8 rejection=12/12 retention=7/7 audit=10/10');
console.log('content_types=0 objects=0 scan_results=0 storage=false inspection=false execution_authorized=false');
