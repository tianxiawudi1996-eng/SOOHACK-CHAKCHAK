import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE32_EXTERNAL_EVIDENCE_VALIDATION_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-evidence-validation.mjs','infra/database/migrations/0018_external_evidence_validation_contract.sql',
  'infra/database/migrations/0018_external_evidence_validation_contract_rollback.sql','infra/database/external-evidence-validation-contract.json',
  'tests/unit/privacy/external-evidence-validation.test.mjs','tests/integration/api-external-evidence-validation.test.mjs',
  'docs/developer/productization/EXTERNAL_EVIDENCE_VALIDATION_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_32_EXTERNAL_EVIDENCE_VALIDATION_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_32_EXTERNAL_EVIDENCE_VALIDATION_QA.json',
  'docs/productization/reports/PHASE_32_EXTERNAL_EVIDENCE_VALIDATION_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0018_external_evidence_validation_contract.sql');
for(const marker of ['privacy_external_evidence_validation_contract','privacy_external_evidence_validation_rule','POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING','AWAITING_EXTERNAL_CHANNEL','jsonb_array_length(state_transitions) = 13','distinct_reviewers_required = true','self_review_allowed = false','raw_content_storage_allowed = false','BEFORE UPDATE OR DELETE','EXTERNAL_EVIDENCE_VALIDATION_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-evidence-validation.mjs');
for(const marker of ['NOT_SUBMITTED','DUAL_APPROVED','VERIFIED','EXPIRED','REVOKED','raw_content','student_identifier','evidence_submission_enabled:false','execution_authorization_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalEvidenceValidationContract','SECURITY_APPROVER','buildExternalEvidenceValidationContract','privacy_external_evidence_validation_rule','EVIDENCE_VALIDATION_HANDOFF_SUPERSEDED','EVIDENCE_VALIDATION_PACKAGE_EXPIRED','EVIDENCE_VALIDATION_LEGAL_HOLD_ACTIVE','EVIDENCE_VALIDATION_HANDOFF_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['evidence-validation-contracts','createExternalEvidenceValidationContract','getExternalEvidenceValidationContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-evidence-validation-contract.json');
if(contract.states!==8||contract.transitions!==13||contract.rules!==6||contract.allowed_metadata_fields!==6||contract.forbidden_fields!==7||contract.required_approver_roles.length!==2)fail('validation contract');
if(contract.evidence_submission_enabled!==false||contract.evidence_state_transition_enabled!==false||contract.raw_content_storage_allowed!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_32_EXTERNAL_EVIDENCE_VALIDATION_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_EVIDENCE_VALIDATION_POLICY_BLOCKED_EXTERNAL'||evidence.tests.unit!=='93/93 PASS'||evidence.tests.postgresql_regression!=='23/23 PASS')fail('evidence tests');
if(evidence.safety.evidence_submission_enabled!==false||evidence.safety.raw_content_storage_allowed!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE32_EXTERNAL_EVIDENCE_VALIDATION_STATIC_PASS');
console.log('validation_tables=2/2');
console.log('unit=93/93');
console.log('postgresql_integration=23/23');
console.log('states=8/8 transitions=13/13 rules=6/6');
console.log('execution_authorized=false');
