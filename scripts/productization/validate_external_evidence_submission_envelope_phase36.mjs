import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE36_EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-evidence-submission-envelope.mjs','infra/database/migrations/0022_external_evidence_submission_envelope_contract.sql',
  'infra/database/migrations/0022_external_evidence_submission_envelope_contract_rollback.sql','infra/database/external-evidence-submission-envelope-contract.json',
  'tests/unit/privacy/external-evidence-submission-envelope.test.mjs','tests/integration/api-external-evidence-submission-envelope.test.mjs',
  'docs/developer/productization/EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_36_EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_36_EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_QA.json',
  'docs/productization/reports/PHASE_36_EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0022_external_evidence_submission_envelope_contract.sql');
for(const marker of ['privacy_external_evidence_submission_envelope_contract','privacy_external_evidence_submission_envelope_rule','ENVELOPE_POLICY_ONLY_ALLOWLIST_APPROVAL_MISSING','DEFINED_LOCAL_POLICY','MISSING_EXTERNAL_APPROVAL','REJECT_ALL_UNTIL_ALLOWLIST_APPROVED','NOT_ACCEPTING','UUID_V4','idempotency_retention_seconds IS NULL','allowed_reference_schemes = \'[]\'::jsonb','BEFORE UPDATE OR DELETE','EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-evidence-submission-envelope.mjs');
for(const marker of ['SUBMISSION_ENVELOPE_REQUIRED_FIELDS','REFERENCE_SCHEME_APPROVAL_STEPS','SUBMISSION_REJECTION_REASON_CODES','SCHEME_PROPOSAL','ACTIVATION_APPROVAL','SUBMISSION_ID_REPLAY_MISMATCH','metadata_submission_enabled:false','reference_scheme_allowlist_write_enabled:false','allowlist_activation_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalEvidenceSubmissionEnvelopeContract','SECURITY_APPROVER','buildExternalEvidenceSubmissionEnvelopeContract','privacy_external_evidence_submission_envelope_rule','SUBMISSION_POLICY_QUEUE_SUPERSEDED','SUBMISSION_POLICY_PACKAGE_EXPIRED','SUBMISSION_POLICY_LEGAL_HOLD_ACTIVE','SUBMISSION_POLICY_QUEUE_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['submission-envelope-contracts','createExternalEvidenceSubmissionEnvelopeContract','getExternalEvidenceSubmissionEnvelopeContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-evidence-submission-envelope-contract.json');
if(contract.contract_tables!==2||contract.control_rules!==6||contract.required_envelope_fields!==10||contract.reference_scheme_approval_steps!==4||contract.rejection_reason_codes!==10)fail('envelope contract');
if(contract.allowed_reference_schemes!==0||contract.metadata_submission_enabled!==false||contract.external_reference_fetch_enabled!==false||contract.raw_payload_storage_allowed!==false||contract.automatic_promotion_allowed!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_36_EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_SUBMISSION_ENVELOPE_POLICY_BLOCKED_EXTERNAL'||evidence.tests.unit!=='109/109 PASS'||evidence.tests.postgresql_regression!=='27/27 PASS')fail('evidence tests');
if(evidence.safety.metadata_submission_enabled!==false||evidence.safety.reference_scheme_allowlist_write_enabled!==false||evidence.safety.allowlist_activation_enabled!==false||evidence.safety.raw_payload_storage_allowed!==false||evidence.safety.connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE36_EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_STATIC_PASS');
console.log('envelope_tables=2/2');
console.log('unit=109/109');
console.log('postgresql_integration=27/27');
console.log('control_rules=6/6 required_fields=10/10 approval_steps=4/4 rejection_reasons=10/10');
console.log('allowed_schemes=0 submission_enabled=false connection_authorized=false execution_authorized=false');
