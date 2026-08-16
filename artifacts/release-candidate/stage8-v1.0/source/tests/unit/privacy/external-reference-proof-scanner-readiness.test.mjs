import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCANNER_ATTESTATION_REQUIRED_FIELDS,SCANNER_EXECUTION_STAGES,SCANNER_FAILURE_POLICIES,
  SCANNER_SIGNATURE_FRESHNESS_CONTROLS,SCANNER_TRUST_REQUIREMENTS,
  buildExternalReferenceProofScannerReadinessContract,externalReferenceProofScannerReadinessBoundary,
  mapExternalReferenceProofScannerReadinessContract
} from '../../../developer/src/privacy/external-reference-proof-scanner-readiness.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validQuarantine(){
  return {id:'11111111-1111-4111-8111-111111111111',package_manifest_id:'22222222-2222-4222-8222-222222222222',
    status:'QUARANTINE_READINESS_POLICY_ONLY_EXTERNAL_CONTROLS_MISSING',is_latest_quarantine_readiness_contract:true,
    kill_switch_engaged:true,quarantine_storage_authorized:false,inspection_execution_authorized:false,
    network_connection_authorized:false,execution_authorized:false,
    requirements:EXECUTION_READINESS_CONTROLS.map((control_key)=>({
      control_key,owner_role:'SECURITY_APPROVER',readiness_status:'POLICY_DEFINED_EXTERNAL_CONTROLS_MISSING',
      storage_status:'MISSING_EXTERNAL',scanner_status:'MISSING_EXTERNAL',metadata_only:true,fail_closed:true,
      malware_scan_required:true,raw_evidence_storage_allowed:false,credential_material_storage_allowed:false,
      secret_material_storage_allowed:false,object_reference:null,object_sha256:null,scan_result_reference:null,
      storage_write_allowed:false,content_inspection_execution_allowed:false,malware_scan_execution_allowed:false,
      quarantine_release_allowed:false,automatic_promotion_allowed:false
    }))};
}

test('scanner readiness binds trust, freshness, stages, failures, and attestation fields',()=>{
  const built=buildExternalReferenceProofScannerReadinessContract({contract_id:'33333333-3333-4333-8333-333333333333',revision:1,quarantine_readiness_contract:validQuarantine()});
  assert.deepEqual([SCANNER_TRUST_REQUIREMENTS.length,SCANNER_SIGNATURE_FRESHNESS_CONTROLS.length,SCANNER_EXECUTION_STAGES.length,SCANNER_FAILURE_POLICIES.length,SCANNER_ATTESTATION_REQUIRED_FIELDS.length],[8,7,9,10,12]);
  assert.equal(built.requirements.length,6);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'SCANNER_READINESS_POLICY_ONLY_EXTERNAL_ATTESTATION_MISSING');
});

test('scanner readiness has no approved engines, object, result, attestation, or executable path',()=>{
  const built=buildExternalReferenceProofScannerReadinessContract({contract_id:'x',revision:1,quarantine_readiness_contract:validQuarantine()});
  assert.equal(built.approved_scanner_engines.length,0);
  assert.equal(built.requirements.every((item)=>item.approved_scanner_engines.length===0&&item.scanner_identity_status==='MISSING_EXTERNAL'),true);
  assert.equal(built.requirements.every((item)=>item.maximum_signature_age_seconds===null&&item.scan_timeout_seconds===null&&item.object_reference===null&&item.attestation_reference===null),true);
  assert.equal(built.requirements.every((item)=>!item.object_read_allowed&&!item.scan_execution_allowed&&!item.retry_execution_allowed&&!item.attestation_write_allowed&&!item.quarantine_release_allowed),true);
});

test('scanner readiness rejects stale, authorized, populated, or incomplete quarantine contracts',()=>{
  const valid=validQuarantine();
  assert.throws(()=>buildExternalReferenceProofScannerReadinessContract({contract_id:'x',revision:1,quarantine_readiness_contract:{...valid,is_latest_quarantine_readiness_contract:false}}),/QUARANTINE_SUPERSEDED/);
  assert.throws(()=>buildExternalReferenceProofScannerReadinessContract({contract_id:'x',revision:1,quarantine_readiness_contract:{...valid,inspection_execution_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalReferenceProofScannerReadinessContract({contract_id:'x',revision:1,quarantine_readiness_contract:{...valid,requirements:valid.requirements.slice(1)}}),/REQUIREMENTS_INCOMPLETE/);
  const populated={...valid,requirements:valid.requirements.map((item,index)=>index?item:{...item,object_reference:'invented'})};
  assert.throws(()=>buildExternalReferenceProofScannerReadinessContract({contract_id:'x',revision:1,quarantine_readiness_contract:populated}),/QUARANTINE_REQUIREMENT_INVALID/);
});

test('scanner mapping hides creator identity and exposes no scanner execution or release boundary',()=>{
  const mapped=mapExternalReferenceProofScannerReadinessContract({id:'scanner',quarantine_readiness_contract_id:'q',package_manifest_id:'m',revision:'1',predecessor_contract_id:null,schema_version:'1.0.0',status:'SCANNER_READINESS_POLICY_ONLY_EXTERNAL_ATTESTATION_MISSING',contract_sha256:'a'.repeat(64),contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,scanner_execution_authorized:false,attestation_write_authorized:false,network_connection_authorized:false,execution_authorized:false,created_at:'2026-08-09T00:00:00Z'});
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalReferenceProofScannerReadinessBoundary();
  assert.equal(boundary.object_read_enabled,false);
  assert.equal(boundary.primary_scan_execution_enabled,false);
  assert.equal(boundary.attestation_write_enabled,false);
  assert.equal(boundary.quarantine_release_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
});
