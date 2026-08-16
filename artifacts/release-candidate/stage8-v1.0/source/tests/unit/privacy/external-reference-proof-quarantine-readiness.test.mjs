import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUARANTINE_AUDIT_REQUIRED_FIELDS,QUARANTINE_CONTENT_INSPECTION_STAGES,
  QUARANTINE_CONTENT_REJECTION_CODES,QUARANTINE_RETENTION_LIFECYCLE_EVENTS,
  QUARANTINE_STORAGE_SECURITY_CONTROLS,buildExternalReferenceProofQuarantineReadinessContract,
  externalReferenceProofQuarantineReadinessBoundary,mapExternalReferenceProofQuarantineReadinessContract
} from '../../../developer/src/privacy/external-reference-proof-quarantine-readiness.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validProofIntake(){
  return {
    id:'11111111-1111-4111-8111-111111111111',package_manifest_id:'22222222-2222-4222-8222-222222222222',
    status:'PROOF_INTAKE_POLICY_ONLY_CHANNEL_MISSING_EXTERNAL',is_latest_proof_intake_contract:true,
    kill_switch_engaged:true,proof_intake_authorized:false,validation_execution_authorized:false,
    network_connection_authorized:false,execution_authorized:false,
    rules:EXECUTION_READINESS_CONTROLS.map((control_key)=>({
      control_key,owner_role:'SECURITY_APPROVER',current_state:'NOT_ACCEPTING',
      intake_channel_status:'MISSING_EXTERNAL',metadata_only:true,fail_closed:true,quarantine_required:true,
      raw_evidence_storage_allowed:false,credential_material_storage_allowed:false,secret_material_storage_allowed:false,
      intake_channel_reference:null,proof_id:null,evidence_reference:null,evidence_sha256:null,
      received_at:null,quarantined_at:null,proof_submission_allowed:false,quarantine_write_allowed:false,
      intake_state_transition_allowed:false,signature_validation_execution_allowed:false,
      review_decision_write_allowed:false,quarantine_release_allowed:false,automatic_activation_allowed:false
    }))
  };
}

test('quarantine readiness binds storage, inspection, rejection, retention, and audit controls',()=>{
  const built=buildExternalReferenceProofQuarantineReadinessContract({
    contract_id:'33333333-3333-4333-8333-333333333333',revision:1,proof_intake_contract:validProofIntake()
  });
  assert.equal(QUARANTINE_STORAGE_SECURITY_CONTROLS.length,8);
  assert.equal(QUARANTINE_CONTENT_INSPECTION_STAGES.length,8);
  assert.equal(QUARANTINE_CONTENT_REJECTION_CODES.length,12);
  assert.equal(QUARANTINE_RETENTION_LIFECYCLE_EVENTS.length,7);
  assert.equal(QUARANTINE_AUDIT_REQUIRED_FIELDS.length,10);
  assert.equal(built.requirements.length,6);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'QUARANTINE_READINESS_POLICY_ONLY_EXTERNAL_CONTROLS_MISSING');
});

test('quarantine readiness remains empty, allowlist-free, and non-executable',()=>{
  const built=buildExternalReferenceProofQuarantineReadinessContract({contract_id:'contract',revision:1,proof_intake_contract:validProofIntake()});
  assert.equal(built.requirements.every((item)=>item.allowed_content_types.length===0&&item.storage_status==='MISSING_EXTERNAL'&&item.scanner_status==='MISSING_EXTERNAL'),true);
  assert.equal(built.requirements.every((item)=>item.encryption_at_rest_required&&item.deny_public_access_required&&item.object_lock_required&&item.malware_scan_required),true);
  assert.equal(built.requirements.every((item)=>item.content_type_allowlist_required&&item.deletion_attestation_required&&item.immutable_audit_required),true);
  assert.equal(built.requirements.every((item)=>item.maximum_object_bytes===null&&item.storage_namespace_reference===null&&item.object_reference===null&&item.scan_result_reference===null),true);
  assert.equal(built.requirements.every((item)=>!item.storage_write_allowed&&!item.content_inspection_execution_allowed&&!item.malware_scan_execution_allowed&&!item.deletion_execution_allowed&&!item.audit_event_write_allowed&&!item.quarantine_release_allowed),true);
});

test('quarantine readiness rejects stale, authorized, populated, or incomplete intake contracts',()=>{
  const valid=validProofIntake();
  assert.throws(()=>buildExternalReferenceProofQuarantineReadinessContract({contract_id:'x',revision:1,proof_intake_contract:{...valid,is_latest_proof_intake_contract:false}}),/INTAKE_SUPERSEDED/);
  assert.throws(()=>buildExternalReferenceProofQuarantineReadinessContract({contract_id:'x',revision:1,proof_intake_contract:{...valid,proof_intake_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalReferenceProofQuarantineReadinessContract({contract_id:'x',revision:1,proof_intake_contract:{...valid,rules:valid.rules.slice(1)}}),/RULES_INCOMPLETE/);
  const populated={...valid,rules:valid.rules.map((rule,index)=>index?rule:{...rule,evidence_reference:'invented'})};
  assert.throws(()=>buildExternalReferenceProofQuarantineReadinessContract({contract_id:'x',revision:1,proof_intake_contract:populated}),/INTAKE_RULE_INVALID/);
});

test('quarantine readiness mapping hides creator identity and exposes no storage, scan, deletion, or release writes',()=>{
  const mapped=mapExternalReferenceProofQuarantineReadinessContract({
    id:'readiness',proof_intake_contract_id:'intake',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'QUARANTINE_READINESS_POLICY_ONLY_EXTERNAL_CONTROLS_MISSING',
    contract_sha256:'a'.repeat(64),contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,
    quarantine_storage_authorized:false,inspection_execution_authorized:false,network_connection_authorized:false,
    execution_authorized:false,created_at:'2026-08-09T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalReferenceProofQuarantineReadinessBoundary();
  assert.equal(boundary.proof_upload_enabled,false);
  assert.equal(boundary.quarantine_storage_write_enabled,false);
  assert.equal(boundary.malware_scan_execution_enabled,false);
  assert.equal(boundary.deletion_execution_enabled,false);
  assert.equal(boundary.audit_event_write_enabled,false);
  assert.equal(boundary.quarantine_release_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
});
