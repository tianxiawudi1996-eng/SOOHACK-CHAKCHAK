import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE38_EXTERNAL_REFERENCE_TARGET_VALIDATION_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-reference-target-validation.mjs','infra/database/migrations/0024_external_reference_target_validation_contract.sql',
  'infra/database/migrations/0024_external_reference_target_validation_contract_rollback.sql','infra/database/external-reference-target-validation-contract.json',
  'tests/unit/privacy/external-reference-target-validation.test.mjs','tests/integration/api-external-reference-target-validation.test.mjs',
  'docs/developer/productization/EXTERNAL_REFERENCE_TARGET_VALIDATION_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_38_EXTERNAL_REFERENCE_TARGET_VALIDATION_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_38_EXTERNAL_REFERENCE_TARGET_VALIDATION_QA.json',
  'docs/productization/reports/PHASE_38_EXTERNAL_REFERENCE_TARGET_VALIDATION_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0024_external_reference_target_validation_contract.sql');
for(const marker of ['privacy_external_reference_target_validation_contract','privacy_external_reference_target_validation_rule','TARGET_VALIDATION_POLICY_ONLY_EXTERNAL_PROOF_MISSING','POLICY_DEFINED_TARGET_MISSING','jsonb_array_length(normalization_steps) = 8','jsonb_array_length(rejection_rules) = 14','wildcard_allowed = false','userinfo_allowed = false','ip_literal_allowed = false','maximum_redirects = 0','dns_rebinding_guard_required = true','private_network_allowed = false','BEFORE UPDATE OR DELETE','EXTERNAL_REFERENCE_TARGET_VALIDATION_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-reference-target-validation.mjs');
for(const marker of ['REFERENCE_TARGET_NORMALIZATION_STEPS','REFERENCE_TARGET_REJECTION_RULES','REFERENCE_TARGET_OWNERSHIP_PROOF_TYPES','REFERENCE_TARGET_FORBIDDEN_ADDRESS_CLASSES','UNICODE_CONFUSABLE_AUTHORITY','DNS_REBINDING_OR_MIXED_ADDRESS_SET','target_normalization_execution_enabled:false','dns_resolution_enabled:false','redirect_follow_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalReferenceTargetValidationContract','SECURITY_APPROVER','buildExternalReferenceTargetValidationContract','privacy_external_reference_target_validation_rule','TARGET_VALIDATION_GOVERNANCE_SUPERSEDED','TARGET_VALIDATION_PACKAGE_EXPIRED','TARGET_VALIDATION_LEGAL_HOLD_ACTIVE','TARGET_VALIDATION_GOVERNANCE_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['reference-target-validation-contracts','createExternalReferenceTargetValidationContract','getExternalReferenceTargetValidationContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-reference-target-validation-contract.json');
if(contract.contract_tables!==2||contract.control_rules!==6||contract.normalization_steps!==8||contract.rejection_rules!==14||contract.ownership_proof_types!==6||contract.forbidden_address_classes!==8)fail('target validation contract');
if(contract.targets_present!==0||contract.ownership_proofs_present!==0||contract.dns_snapshots_present!==0||contract.dns_resolution_enabled!==false||contract.redirect_follow_enabled!==false||contract.allowlist_write_enabled!==false||contract.external_reference_fetch_enabled!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_38_EXTERNAL_REFERENCE_TARGET_VALIDATION_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_TARGET_VALIDATION_POLICY_BLOCKED_EXTERNAL'||evidence.tests.unit!=='117/117 PASS'||evidence.tests.postgresql_regression!=='29/29 PASS')fail('evidence tests');
if(evidence.safety.target_value_write_enabled!==false||evidence.safety.target_normalization_execution_enabled!==false||evidence.safety.ownership_proof_submission_enabled!==false||evidence.safety.dns_resolution_enabled!==false||evidence.safety.redirect_follow_enabled!==false||evidence.safety.allowlist_write_enabled!==false||evidence.safety.network_connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE38_EXTERNAL_REFERENCE_TARGET_VALIDATION_STATIC_PASS');
console.log('validation_tables=2/2');
console.log('unit=117/117');
console.log('postgresql_integration=29/29');
console.log('control_rules=6/6 normalization=8/8 rejection=14/14 ownership_proofs=6/6 forbidden_addresses=8/8');
console.log('targets=0 dns_resolution=false redirect_follow=false allowlist_write=false execution_authorized=false');
