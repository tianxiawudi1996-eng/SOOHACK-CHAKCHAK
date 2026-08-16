import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE42_SCANNER_READINESS_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/external-reference-proof-scanner-readiness.mjs','infra/database/migrations/0028_external_reference_proof_scanner_readiness_contract.sql',
  'infra/database/migrations/0028_external_reference_proof_scanner_readiness_contract_rollback.sql','infra/database/external-reference-proof-scanner-readiness-contract.json',
  'tests/unit/privacy/external-reference-proof-scanner-readiness.test.mjs','tests/integration/api-external-reference-proof-scanner-readiness.test.mjs',
  'docs/developer/productization/EXTERNAL_REFERENCE_PROOF_SCANNER_READINESS_CONTRACT_v1.0.md',
  'docs/productization/prompts/PHASE_42_EXTERNAL_REFERENCE_PROOF_SCANNER_READINESS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_42_EXTERNAL_REFERENCE_PROOF_SCANNER_READINESS_QA.json',
  'docs/productization/reports/PHASE_42_EXTERNAL_REFERENCE_PROOF_SCANNER_READINESS_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0028_external_reference_proof_scanner_readiness_contract.sql');
for(const marker of ['privacy_external_reference_proof_scanner_readiness_contract','privacy_external_reference_proof_scanner_requirement','SCANNER_READINESS_POLICY_ONLY_EXTERNAL_ATTESTATION_MISSING','jsonb_array_length(trust_requirements)=8','jsonb_array_length(signature_freshness_controls)=7','jsonb_array_length(execution_stages)=9','jsonb_array_length(failure_policies)=10','jsonb_array_length(attestation_required_fields)=12',"approved_scanner_engines='[]'::jsonb",'scan_execution_allowed=false','BEFORE UPDATE OR DELETE','EXTERNAL_REFERENCE_PROOF_SCANNER_APPEND_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
const domain=read('developer/src/privacy/external-reference-proof-scanner-readiness.mjs');
for(const marker of ['SCANNER_TRUST_REQUIREMENTS','SCANNER_SIGNATURE_FRESHNESS_CONTROLS','SCANNER_EXECUTION_STAGES','SCANNER_FAILURE_POLICIES','SCANNER_ATTESTATION_REQUIRED_FIELDS','TIMEOUT_FAIL_CLOSED','primary_scan_execution_enabled:false','attestation_write_enabled:false','quarantine_release_enabled:false'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['createExternalReferenceProofScannerReadinessContract','SECURITY_APPROVER','buildExternalReferenceProofScannerReadinessContract','privacy_external_reference_proof_scanner_requirement','SCANNER_READINESS_QUARANTINE_SUPERSEDED','SCANNER_READINESS_PACKAGE_EXPIRED','SCANNER_READINESS_LEGAL_HOLD_ACTIVE','SCANNER_READINESS_QUARANTINE_HASH_MISMATCH'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['scanner-readiness-contracts','createExternalReferenceProofScannerReadinessContract','getExternalReferenceProofScannerReadinessContract'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/external-reference-proof-scanner-readiness-contract.json');
if(contract.contract_tables!==2||contract.control_requirements!==6||contract.trust_requirements!==8||contract.signature_freshness_controls!==7||contract.execution_stages!==9||contract.failure_policies!==10||contract.attestation_required_fields!==12||contract.approved_scanner_engines!==0)fail('scanner readiness contract');
if(contract.objects_present!==0||contract.scan_results_present!==0||contract.attestations_present!==0||contract.object_read_enabled!==false||contract.scan_execution_enabled!==false||contract.attestation_write_enabled!==false||contract.execution_authorized!==false)fail('contract safety');
const evidence=json('docs/productization/evidence/PHASE_42_EXTERNAL_REFERENCE_PROOF_SCANNER_READINESS_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_SCANNER_READINESS_POLICY_BLOCKED_EXTERNAL'||evidence.tests.unit!=='133/133 PASS'||evidence.tests.postgresql_regression!=='33/33 PASS')fail('evidence tests');
if(evidence.safety.object_read_enabled!==false||evidence.safety.primary_scan_execution_enabled!==false||evidence.safety.secondary_scan_execution_enabled!==false||evidence.safety.retry_execution_enabled!==false||evidence.safety.failover_execution_enabled!==false||evidence.safety.attestation_write_enabled!==false||evidence.safety.release_decision_write_enabled!==false||evidence.safety.quarantine_release_enabled!==false||evidence.safety.network_connection_authorized!==false||evidence.safety.execution_authorized!==false||evidence.safety.source_data_mutations!==0)fail('evidence boundary');
console.log('PHASE42_SCANNER_READINESS_STATIC_PASS');
console.log('scanner_tables=2/2');
console.log('unit=133/133');
console.log('postgresql_integration=33/33');
console.log('requirements=6/6 trust=8/8 freshness=7/7 stages=9/9 failures=10/10 attestation_fields=12/12');
console.log('engines=0 objects=0 scan_results=0 attestations=0 object_read=false scan=false execution_authorized=false');
