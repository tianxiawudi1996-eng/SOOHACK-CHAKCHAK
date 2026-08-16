import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_DNS_SNAPSHOT_REQUIRED_FIELDS,REFERENCE_PROOF_ISSUER_TRUST_REQUIREMENTS,
  REFERENCE_PROOF_LIFECYCLE_STATES,REFERENCE_PROOF_REQUIRED_FIELDS,REFERENCE_PROOF_REVALIDATION_TRIGGERS,
  buildExternalReferenceProofHandoffContract,externalReferenceProofHandoffBoundary,
  mapExternalReferenceProofHandoffContract
} from '../../../developer/src/privacy/external-reference-proof-handoff.mjs';
import {buildExternalReferenceTargetValidationContract} from '../../../developer/src/privacy/external-reference-target-validation.mjs';
import {buildExternalReferenceSchemeGovernanceContract} from '../../../developer/src/privacy/external-reference-scheme-governance.mjs';
import {buildExternalEvidenceSubmissionEnvelopeContract} from '../../../developer/src/privacy/external-evidence-submission-envelope.mjs';
import {buildExternalConfigurationEvidenceQueueContract} from '../../../developer/src/privacy/external-configuration-evidence-queue.mjs';
import {buildExternalConnectionAcceptancePacket} from '../../../developer/src/privacy/external-connection-acceptance.mjs';
import {buildExternalEvidenceIntakeAdapterContract} from '../../../developer/src/privacy/external-evidence-intake-adapter.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validTargetValidation(){
  const validation={
    id:'11111111-1111-4111-8111-111111111111',package_manifest_id:'22222222-2222-4222-8222-222222222222',
    status:'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING',is_latest_validation_contract:true,kill_switch_engaged:true,execution_authorized:false,
    rules:EXECUTION_READINESS_CONTROLS.map((control_key)=>({control_key,current_status:'AWAITING_EXTERNAL_CHANNEL',submission_channel_status:'MISSING_EXTERNAL',expiry_policy_status:'MISSING_EXTERNAL',raw_content_storage_allowed:false}))
  };
  const adapterBuilt=buildExternalEvidenceIntakeAdapterContract({contract_id:'33333333-3333-4333-8333-333333333333',revision:1,validation_contract:validation});
  const adapter={id:adapterBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...adapterBuilt,is_latest_intake_adapter_contract:true};
  const acceptanceBuilt=buildExternalConnectionAcceptancePacket({packet_id:'44444444-4444-4444-8444-444444444444',revision:1,intake_adapter_contract:adapter});
  const acceptance={id:acceptanceBuilt.packet_manifest.packet_id,package_manifest_id:validation.package_manifest_id,...acceptanceBuilt,is_latest_acceptance_packet:true};
  const queueBuilt=buildExternalConfigurationEvidenceQueueContract({contract_id:'55555555-5555-4555-8555-555555555555',revision:1,acceptance_packet:acceptance});
  const queue={id:queueBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...queueBuilt,is_latest_queue_contract:true};
  const envelopeBuilt=buildExternalEvidenceSubmissionEnvelopeContract({contract_id:'66666666-6666-4666-8666-666666666666',revision:1,queue_contract:queue});
  const envelope={id:envelopeBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...envelopeBuilt,is_latest_envelope_contract:true};
  const governanceBuilt=buildExternalReferenceSchemeGovernanceContract({contract_id:'77777777-7777-4777-8777-777777777777',revision:1,envelope_contract:envelope});
  const governance={id:governanceBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...governanceBuilt,is_latest_governance_contract:true};
  const targetBuilt=buildExternalReferenceTargetValidationContract({contract_id:'88888888-8888-4888-8888-888888888888',revision:1,governance_contract:governance});
  return {id:targetBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...targetBuilt,is_latest_target_validation_contract:true};
}

test('proof handoff binds metadata, issuer trust, lifecycle, revalidation, and DNS snapshot fields',()=>{
  const built=buildExternalReferenceProofHandoffContract({
    contract_id:'99999999-9999-4999-8999-999999999999',revision:1,target_validation_contract:validTargetValidation()
  });
  assert.equal(REFERENCE_PROOF_REQUIRED_FIELDS.length,12);
  assert.equal(REFERENCE_PROOF_ISSUER_TRUST_REQUIREMENTS.length,8);
  assert.equal(REFERENCE_PROOF_LIFECYCLE_STATES.length,7);
  assert.equal(REFERENCE_PROOF_REVALIDATION_TRIGGERS.length,8);
  assert.equal(REFERENCE_DNS_SNAPSHOT_REQUIRED_FIELDS.length,8);
  assert.equal(built.requirements.length,6);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING');
});

test('proof handoff remains metadata-only, empty, and non-executable',()=>{
  const built=buildExternalReferenceProofHandoffContract({contract_id:'contract',revision:1,target_validation_contract:validTargetValidation()});
  assert.equal(built.requirements.every((item)=>item.metadata_only&&item.immutable_reference_required&&item.signature_required&&item.expiry_required&&item.revocation_check_required),true);
  assert.equal(built.requirements.every((item)=>item.issuer_must_differ_from_reviewer&&!item.raw_evidence_storage_allowed&&!item.credential_material_storage_allowed&&!item.secret_material_storage_allowed),true);
  assert.equal(built.requirements.every((item)=>item.maximum_proof_ttl_seconds===null&&item.revalidation_sla_seconds===null&&item.proof_id===null&&item.issuer_identity_reference===null),true);
  assert.equal(built.requirements.every((item)=>item.evidence_reference===null&&item.dns_snapshot_reference===null&&item.issued_at===null&&item.verified_at===null),true);
  assert.equal(built.requirements.every((item)=>!item.handoff_submission_allowed&&!item.proof_validation_execution_allowed&&!item.dns_snapshot_capture_allowed&&!item.revocation_polling_allowed&&!item.allowlist_write_allowed&&!item.automatic_promotion_allowed),true);
});

test('proof handoff rejects stale, authorized, populated, or incomplete target validation contracts',()=>{
  const valid=validTargetValidation();
  assert.throws(()=>buildExternalReferenceProofHandoffContract({contract_id:'x',revision:1,target_validation_contract:{...valid,is_latest_target_validation_contract:false}}),/TARGET_VALIDATION_SUPERSEDED/);
  assert.throws(()=>buildExternalReferenceProofHandoffContract({contract_id:'x',revision:1,target_validation_contract:{...valid,dns_resolution_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalReferenceProofHandoffContract({contract_id:'x',revision:1,target_validation_contract:{...valid,rules:valid.rules.slice(1)}}),/RULES_INCOMPLETE/);
  const populated={...valid,rules:valid.rules.map((rule,index)=>index?rule:{...rule,dns_snapshot_reference:'invented'})};
  assert.throws(()=>buildExternalReferenceProofHandoffContract({contract_id:'x',revision:1,target_validation_contract:populated}),/TARGET_VALIDATION_RULE_INVALID/);
});

test('proof handoff mapping hides creator identity and exposes no intake or validation writes',()=>{
  const mapped=mapExternalReferenceProofHandoffContract({
    id:'handoff',target_validation_contract_id:'validation',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING',contract_sha256:'a'.repeat(64),
    contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,proof_intake_authorized:false,
    dns_resolution_authorized:false,network_connection_authorized:false,execution_authorized:false,created_at:'2026-08-09T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalReferenceProofHandoffBoundary();
  assert.equal(boundary.proof_handoff_submission_enabled,false);
  assert.equal(boundary.proof_metadata_write_enabled,false);
  assert.equal(boundary.issuer_trust_decision_write_enabled,false);
  assert.equal(boundary.dns_snapshot_capture_enabled,false);
  assert.equal(boundary.revocation_event_ingest_enabled,false);
  assert.equal(boundary.allowlist_activation_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
});
