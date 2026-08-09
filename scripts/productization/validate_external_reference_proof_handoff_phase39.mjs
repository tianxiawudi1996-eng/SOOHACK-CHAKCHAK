import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE39_EXTERNAL_REFERENCE_PROOF_HANDOFF_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-reference-proof-handoff.mjs','infra/database/migrations/0025_external_reference_proof_handoff_contract.sql',
  'infra/database/migrations/0025_external_reference_proof_handoff_contract_rollback.sql','infra/database/external-reference-proof-handoff-contract.json',
  'tests/unit/privacy/external-reference-proof-handoff.test.mjs','tests/integration/api-external-reference-proof-handoff.test.mjs',
  'docs/developer/productization/EXTERNAL_REFERENCE_PROOF_HANDOFF_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_39_EXTERNAL_REFERENCE_PROOF_HANDOFF_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_39_EXTERNAL_REFERENCE_PROOF_HANDOFF_QA.json',
  'docs/productization/reports/PHASE_39_EXTERNAL_REFERENCE_PROOF_HANDOFF_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0025_external_reference_proof_handoff_contract.sql');
for(const marker of ['privacy_external_reference_proof_handoff_contract','privacy_external_reference_proof_handoff_requirement','PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING','POLICY_DEFINED_EVIDENCE_MISSING','jsonb_array_length(proof_required_fields) = 12','jsonb_array_length(issuer_trust_requirements) = 8','jsonb_array_length(lifecycle_states) = 7','jsonb_array_length(revalidation_triggers) = 8','metadata_only = true','signature_required = true','revocation_check_required = true','raw_evidence_storage_allowed = false','BEFORE UPDATE OR DELETE','EXTERNAL_REFERENCE_PROOF_HANDOFF_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-reference-proof-handoff.mjs');
for(const marker of ['REFERENCE_PROOF_REQUIRED_FIELDS','REFERENCE_PROOF_ISSUER_TRUST_REQUIREMENTS','REFERENCE_PROOF_LIFECYCLE_STATES','REFERENCE_PROOF_REVALIDATION_TRIGGERS','REFERENCE_DNS_SNAPSHOT_REQUIRED_FIELDS','REVOCATION_EVENT_RECEIVED','proof_handoff_submission_enabled:false','dns_snapshot_capture_enabled:false','revocation_polling_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalReferenceProofHandoffContract','SECURITY_APPROVER','buildExternalReferenceProofHandoffContract','privacy_external_reference_proof_handoff_requirement','PROOF_HANDOFF_TARGET_VALIDATION_SUPERSEDED','PROOF_HANDOFF_PACKAGE_EXPIRED','PROOF_HANDOFF_LEGAL_HOLD_ACTIVE','PROOF_HANDOFF_TARGET_VALIDATION_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['reference-proof-handoff-contracts','createExternalReferenceProofHandoffContract','getExternalReferenceProofHandoffContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-reference-proof-handoff-contract.json');
if(contract.contract_tables!==2||contract.control_requirements!==6||contract.proof_required_fields!==12||contract.issuer_trust_requirements!==8||contract.lifecycle_states!==7||contract.revalidation_triggers!==8||contract.dns_snapshot_required_fields!==8)fail('proof handoff contract');
if(contract.proofs_present!==0||contract.issuers_present!==0||contract.dns_snapshots_present!==0||contract.proof_intake_enabled!==false||contract.dns_resolution_enabled!==false||contract.revocation_polling_enabled!==false||contract.allowlist_write_enabled!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_39_EXTERNAL_REFERENCE_PROOF_HANDOFF_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_PROOF_HANDOFF_BLOCKED_EXTERNAL'||evidence.tests.unit!=='121/121 PASS'||evidence.tests.postgresql_regression!=='30/30 PASS')fail('evidence tests');
if(evidence.safety.proof_handoff_submission_enabled!==false||evidence.safety.proof_validation_execution_enabled!==false||evidence.safety.dns_snapshot_capture_enabled!==false||evidence.safety.dns_resolution_enabled!==false||evidence.safety.revocation_polling_enabled!==false||evidence.safety.allowlist_write_enabled!==false||evidence.safety.network_connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE39_EXTERNAL_REFERENCE_PROOF_HANDOFF_STATIC_PASS');
console.log('handoff_tables=2/2');
console.log('unit=121/121');
console.log('postgresql_integration=30/30');
console.log('requirements=6/6 proof_fields=12/12 issuer_trust=8/8 lifecycle=7/7 revalidation=8/8 dns_fields=8/8');
console.log('proofs=0 issuers=0 dns_snapshots=0 proof_intake=false execution_authorized=false');
