import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE37_EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-reference-scheme-governance.mjs','infra/database/migrations/0023_external_reference_scheme_governance_contract.sql',
  'infra/database/migrations/0023_external_reference_scheme_governance_contract_rollback.sql','infra/database/external-reference-scheme-governance-contract.json',
  'tests/unit/privacy/external-reference-scheme-governance.test.mjs','tests/integration/api-external-reference-scheme-governance.test.mjs',
  'docs/developer/productization/EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_37_EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_37_EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_QA.json',
  'docs/productization/reports/PHASE_37_EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0023_external_reference_scheme_governance_contract.sql');
for(const marker of ['privacy_external_reference_scheme_governance_contract','privacy_external_reference_scheme_governance_policy','SCHEME_GOVERNANCE_ONLY_PROPOSAL_MISSING_EXTERNAL','POLICY_DEFINED_PROPOSAL_MISSING','NOT_PROPOSED','approvers_must_be_distinct = true','proposer_must_differ_from_approvers = true','wildcard_authority_allowed = false','unrestricted_path_allowed = false','maximum_validity_seconds IS NULL','BEFORE UPDATE OR DELETE','EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-reference-scheme-governance.mjs');
for(const marker of ['REFERENCE_SCHEME_PROPOSAL_REQUIRED_FIELDS','REFERENCE_TARGET_RESTRICTION_FIELDS','REFERENCE_SCHEME_LIFECYCLE_STATES','REFERENCE_SCHEME_REAPPROVAL_TRIGGERS','SCHEME_CHANGED','POLICY_EXPIRED','scheme_proposal_submission_enabled:false','scheme_approval_decision_write_enabled:false','allowlist_activation_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalReferenceSchemeGovernanceContract','SECURITY_APPROVER','buildExternalReferenceSchemeGovernanceContract','privacy_external_reference_scheme_governance_policy','SCHEME_GOVERNANCE_ENVELOPE_SUPERSEDED','SCHEME_GOVERNANCE_PACKAGE_EXPIRED','SCHEME_GOVERNANCE_LEGAL_HOLD_ACTIVE','SCHEME_GOVERNANCE_ENVELOPE_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['reference-scheme-governance-contracts','createExternalReferenceSchemeGovernanceContract','getExternalReferenceSchemeGovernanceContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-reference-scheme-governance-contract.json');
if(contract.contract_tables!==2||contract.control_policies!==6||contract.proposal_required_fields!==10||contract.target_restriction_fields!==6||contract.lifecycle_states!==7||contract.reapproval_triggers!==6)fail('governance contract');
if(contract.proposals_present!==0||contract.allowlist_activation_enabled!==false||contract.metadata_submission_enabled!==false||contract.external_reference_fetch_enabled!==false||contract.automatic_promotion_allowed!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_37_EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_REFERENCE_SCHEME_GOVERNANCE_BLOCKED_EXTERNAL'||evidence.tests.unit!=='113/113 PASS'||evidence.tests.postgresql_regression!=='28/28 PASS')fail('evidence tests');
if(evidence.safety.scheme_proposal_submission_enabled!==false||evidence.safety.scheme_approval_decision_write_enabled!==false||evidence.safety.allowlist_activation_enabled!==false||evidence.safety.metadata_submission_enabled!==false||evidence.safety.connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE37_EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_STATIC_PASS');
console.log('governance_tables=2/2');
console.log('unit=113/113');
console.log('postgresql_integration=28/28');
console.log('control_policies=6/6 proposal_fields=10/10 target_fields=6/6 lifecycle_states=7/7 reapproval_triggers=6/6');
console.log('proposals=0 allowlist_activation=false submission_enabled=false execution_authorized=false');
