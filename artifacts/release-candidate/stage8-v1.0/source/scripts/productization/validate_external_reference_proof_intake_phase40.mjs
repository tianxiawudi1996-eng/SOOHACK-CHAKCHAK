import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE40_EXTERNAL_REFERENCE_PROOF_INTAKE_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-reference-proof-intake.mjs','infra/database/migrations/0026_external_reference_proof_intake_contract.sql',
  'infra/database/migrations/0026_external_reference_proof_intake_contract_rollback.sql','infra/database/external-reference-proof-intake-contract.json',
  'tests/unit/privacy/external-reference-proof-intake.test.mjs','tests/integration/api-external-reference-proof-intake.test.mjs',
  'docs/developer/productization/EXTERNAL_REFERENCE_PROOF_INTAKE_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_40_EXTERNAL_REFERENCE_PROOF_INTAKE_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_40_EXTERNAL_REFERENCE_PROOF_INTAKE_QA.json',
  'docs/productization/reports/PHASE_40_EXTERNAL_REFERENCE_PROOF_INTAKE_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0026_external_reference_proof_intake_contract.sql');
for(const marker of ['privacy_external_reference_proof_intake_contract','privacy_external_reference_proof_intake_rule','PROOF_INTAKE_POLICY_ONLY_CHANNEL_MISSING_EXTERNAL','NOT_ACCEPTING','jsonb_array_length(intake_states) = 9','jsonb_array_length(allowed_transitions) = 14','jsonb_array_length(rejection_codes) = 12','jsonb_array_length(replay_controls) = 6','two_distinct_reviewers_required = true','raw_evidence_storage_allowed = false','BEFORE UPDATE OR DELETE','EXTERNAL_REFERENCE_PROOF_INTAKE_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-reference-proof-intake.mjs');
for(const marker of ['REFERENCE_PROOF_INTAKE_STATES','REFERENCE_PROOF_INTAKE_TRANSITIONS','REFERENCE_PROOF_INTAKE_REJECTION_CODES','REFERENCE_PROOF_REPLAY_CONTROLS','REFERENCE_PROOF_REVIEW_DECISIONS','NONCE_REPLAYED','proof_submission_enabled:false','quarantine_write_enabled:false','review_decision_write_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalReferenceProofIntakeContract','SECURITY_APPROVER','buildExternalReferenceProofIntakeContract','privacy_external_reference_proof_intake_rule','PROOF_INTAKE_HANDOFF_SUPERSEDED','PROOF_INTAKE_PACKAGE_EXPIRED','PROOF_INTAKE_LEGAL_HOLD_ACTIVE','PROOF_INTAKE_HANDOFF_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['reference-proof-intake-contracts','createExternalReferenceProofIntakeContract','getExternalReferenceProofIntakeContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-reference-proof-intake-contract.json');
if(contract.contract_tables!==2||contract.control_rules!==6||contract.intake_states!==9||contract.allowed_transitions!==14||contract.rejection_codes!==12||contract.replay_controls!==6||contract.review_decisions!==3)fail('proof intake contract');
if(contract.proof_submissions_present!==0||contract.review_decisions_present!==0||contract.intake_channel_enabled!==false||contract.quarantine_write_enabled!==false||contract.validation_execution_enabled!==false||contract.allowlist_write_enabled!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_40_EXTERNAL_REFERENCE_PROOF_INTAKE_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_PROOF_INTAKE_POLICY_BLOCKED_EXTERNAL'||evidence.tests.unit!=='125/125 PASS'||evidence.tests.postgresql_regression!=='31/31 PASS')fail('evidence tests');
if(evidence.safety.proof_submission_enabled!==false||evidence.safety.quarantine_write_enabled!==false||evidence.safety.intake_state_transition_enabled!==false||evidence.safety.duplicate_check_execution_enabled!==false||evidence.safety.replay_check_execution_enabled!==false||evidence.safety.signature_validation_execution_enabled!==false||evidence.safety.issuer_validation_execution_enabled!==false||evidence.safety.review_decision_write_enabled!==false||evidence.safety.quarantine_release_enabled!==false||evidence.safety.allowlist_write_enabled!==false||evidence.safety.network_connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE40_EXTERNAL_REFERENCE_PROOF_INTAKE_STATIC_PASS');
console.log('intake_tables=2/2');
console.log('unit=125/125');
console.log('postgresql_integration=31/31');
console.log('rules=6/6 states=9/9 transitions=14/14 rejection_codes=12/12 replay_controls=6/6 decisions=3/3');
console.log('submissions=0 decisions=0 intake=false validation=false execution_authorized=false');
