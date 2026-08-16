import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIGURATION_EVIDENCE_QUEUE_STAGES,buildExternalConfigurationEvidenceQueueContract,
  externalConfigurationEvidenceQueueBoundary,mapExternalConfigurationEvidenceQueueContract
} from '../../../developer/src/privacy/external-configuration-evidence-queue.mjs';
import {buildExternalConnectionAcceptancePacket} from '../../../developer/src/privacy/external-connection-acceptance.mjs';
import {buildExternalEvidenceIntakeAdapterContract} from '../../../developer/src/privacy/external-evidence-intake-adapter.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validAcceptance(){
  const validation={
    id:'11111111-1111-4111-8111-111111111111',package_manifest_id:'22222222-2222-4222-8222-222222222222',
    status:'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING',is_latest_validation_contract:true,kill_switch_engaged:true,execution_authorized:false,
    rules:EXECUTION_READINESS_CONTROLS.map((control_key)=>({control_key,current_status:'AWAITING_EXTERNAL_CHANNEL',submission_channel_status:'MISSING_EXTERNAL',expiry_policy_status:'MISSING_EXTERNAL',raw_content_storage_allowed:false}))
  };
  const adapterBuilt=buildExternalEvidenceIntakeAdapterContract({contract_id:'33333333-3333-4333-8333-333333333333',revision:1,validation_contract:validation});
  const adapter={id:adapterBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...adapterBuilt,is_latest_intake_adapter_contract:true};
  const acceptanceBuilt=buildExternalConnectionAcceptancePacket({packet_id:'44444444-4444-4444-8444-444444444444',revision:1,intake_adapter_contract:adapter});
  return {id:acceptanceBuilt.packet_manifest.packet_id,package_manifest_id:validation.package_manifest_id,...acceptanceBuilt,is_latest_acceptance_packet:true};
}

test('configuration evidence queue contract is hash-bound with seven stages and six slots',()=>{
  const built=buildExternalConfigurationEvidenceQueueContract({
    contract_id:'55555555-5555-4555-8555-555555555555',revision:1,acceptance_packet:validAcceptance()
  });
  assert.equal(CONFIGURATION_EVIDENCE_QUEUE_STAGES.length,7);
  assert.equal(built.slots.length,6);
  assert.equal(built.slots.flatMap((slot)=>slot.allowed_evidence_types).length,12);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'QUEUE_CONTRACT_ONLY_EXTERNAL_SUBMISSION_MISSING');
});

test('queue slots require immutable reference metadata while remaining empty and non-promoting',()=>{
  const built=buildExternalConfigurationEvidenceQueueContract({contract_id:'contract',revision:1,acceptance_packet:validAcceptance()});
  assert.equal(built.slots.every((slot)=>slot.queue_status==='AWAITING_EXTERNAL_SUBMISSION_CHANNEL'&&slot.submission_channel_status==='MISSING_EXTERNAL'),true);
  assert.equal(built.slots.every((slot)=>slot.immutable_reference_required&&slot.sha256_required&&slot.issuer_provenance_required&&slot.duplicate_guard_required),true);
  assert.equal(built.slots.every((slot)=>slot.artifact_reference===null&&slot.artifact_sha256===null&&slot.submission_id===null&&slot.queue_entry_id===null),true);
  assert.equal(built.slots.every((slot)=>slot.validation_status==='NOT_SUBMITTED'&&slot.review_ttl_seconds===null),true);
  assert.equal(built.slots.every((slot)=>!slot.raw_payload_storage_allowed&&!slot.credential_material_storage_allowed&&!slot.secret_material_storage_allowed&&!slot.automatic_promotion_allowed),true);
});

test('queue contract rejects stale, authorized, populated, or incomplete acceptance packets',()=>{
  const valid=validAcceptance();
  assert.throws(()=>buildExternalConfigurationEvidenceQueueContract({contract_id:'x',revision:1,acceptance_packet:{...valid,is_latest_acceptance_packet:false}}),/ACCEPTANCE_SUPERSEDED/);
  assert.throws(()=>buildExternalConfigurationEvidenceQueueContract({contract_id:'x',revision:1,acceptance_packet:{...valid,connection_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalConfigurationEvidenceQueueContract({contract_id:'x',revision:1,acceptance_packet:{...valid,requirements:valid.requirements.slice(1)}}),/REQUIREMENTS_INCOMPLETE/);
  const populated={...valid,requirements:valid.requirements.map((item,index)=>index?item:{...item,artifact_reference:'invented'})};
  assert.throws(()=>buildExternalConfigurationEvidenceQueueContract({contract_id:'x',revision:1,acceptance_packet:populated}),/REQUIREMENT_INVALID/);
});

test('queue mapping hides creator identity and exposes no submission, fetch, transition, or promotion path',()=>{
  const mapped=mapExternalConfigurationEvidenceQueueContract({
    id:'queue',acceptance_packet_id:'packet',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'QUEUE_CONTRACT_ONLY_EXTERNAL_SUBMISSION_MISSING',contract_sha256:'a'.repeat(64),
    contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,connection_authorized:false,
    execution_authorized:false,created_at:'2026-08-08T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalConfigurationEvidenceQueueBoundary();
  assert.equal(boundary.configuration_evidence_submission_enabled,false);
  assert.equal(boundary.external_reference_fetch_enabled,false);
  assert.equal(boundary.queue_transition_enabled,false);
  assert.equal(boundary.approval_decision_write_enabled,false);
  assert.equal(boundary.automatic_promotion_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
});
