import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_SCHEME_APPROVAL_STEPS,SUBMISSION_ENVELOPE_REQUIRED_FIELDS,SUBMISSION_REJECTION_REASON_CODES,
  buildExternalEvidenceSubmissionEnvelopeContract,externalEvidenceSubmissionEnvelopeBoundary,
  mapExternalEvidenceSubmissionEnvelopeContract
} from '../../../developer/src/privacy/external-evidence-submission-envelope.mjs';
import {buildExternalConfigurationEvidenceQueueContract} from '../../../developer/src/privacy/external-configuration-evidence-queue.mjs';
import {buildExternalConnectionAcceptancePacket} from '../../../developer/src/privacy/external-connection-acceptance.mjs';
import {buildExternalEvidenceIntakeAdapterContract} from '../../../developer/src/privacy/external-evidence-intake-adapter.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validQueue(){
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
  return {id:queueBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...queueBuilt,is_latest_queue_contract:true};
}

test('submission envelope contract binds ten fields, four approval steps, and ten rejection reasons',()=>{
  const built=buildExternalEvidenceSubmissionEnvelopeContract({
    contract_id:'66666666-6666-4666-8666-666666666666',revision:1,queue_contract:validQueue()
  });
  assert.equal(SUBMISSION_ENVELOPE_REQUIRED_FIELDS.length,10);
  assert.equal(REFERENCE_SCHEME_APPROVAL_STEPS.length,4);
  assert.equal(SUBMISSION_REJECTION_REASON_CODES.length,10);
  assert.equal(built.rules.length,6);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'ENVELOPE_POLICY_ONLY_ALLOWLIST_APPROVAL_MISSING');
});

test('every envelope rule rejects ingress until an external scheme allowlist is approved',()=>{
  const built=buildExternalEvidenceSubmissionEnvelopeContract({contract_id:'contract',revision:1,queue_contract:validQueue()});
  assert.equal(built.rules.every((rule)=>rule.required_envelope_fields.length===10),true);
  assert.equal(built.rules.every((rule)=>rule.reference_scheme_allowlist_status==='MISSING_EXTERNAL_APPROVAL'&&rule.allowed_reference_schemes.length===0),true);
  assert.equal(built.rules.every((rule)=>rule.submission_id_format==='UUID_V4'&&rule.idempotency_scope==='QUEUE_CONTRACT_CONTROL_KEY_SUBMISSION_ID'),true);
  assert.equal(built.rules.every((rule)=>rule.idempotency_retention_status==='MISSING_EXTERNAL'&&rule.idempotency_retention_seconds===null),true);
  assert.equal(built.rules.every((rule)=>rule.ingress_validation_mode==='REJECT_ALL_UNTIL_ALLOWLIST_APPROVED'&&rule.submission_acceptance_status==='NOT_ACCEPTING'),true);
  assert.equal(built.rules.every((rule)=>rule.submission_id===null&&rule.artifact_reference===null&&rule.artifact_sha256===null&&rule.issuer_reference===null&&rule.submitted_at===null),true);
});

test('submission policy rejects stale, authorized, populated, or incomplete queue contracts',()=>{
  const valid=validQueue();
  assert.throws(()=>buildExternalEvidenceSubmissionEnvelopeContract({contract_id:'x',revision:1,queue_contract:{...valid,is_latest_queue_contract:false}}),/QUEUE_SUPERSEDED/);
  assert.throws(()=>buildExternalEvidenceSubmissionEnvelopeContract({contract_id:'x',revision:1,queue_contract:{...valid,connection_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalEvidenceSubmissionEnvelopeContract({contract_id:'x',revision:1,queue_contract:{...valid,slots:valid.slots.slice(1)}}),/SLOTS_INCOMPLETE/);
  const populated={...valid,slots:valid.slots.map((slot,index)=>index?slot:{...slot,artifact_reference:'invented'})};
  assert.throws(()=>buildExternalEvidenceSubmissionEnvelopeContract({contract_id:'x',revision:1,queue_contract:populated}),/SLOT_INVALID/);
});

test('submission policy mapping hides creator identity and exposes no write or activation path',()=>{
  const mapped=mapExternalEvidenceSubmissionEnvelopeContract({
    id:'policy',queue_contract_id:'queue',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'ENVELOPE_POLICY_ONLY_ALLOWLIST_APPROVAL_MISSING',contract_sha256:'a'.repeat(64),
    contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,connection_authorized:false,
    execution_authorized:false,created_at:'2026-08-08T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalEvidenceSubmissionEnvelopeBoundary();
  assert.equal(boundary.metadata_submission_enabled,false);
  assert.equal(boundary.envelope_acceptance_enabled,false);
  assert.equal(boundary.reference_scheme_allowlist_write_enabled,false);
  assert.equal(boundary.allowlist_activation_enabled,false);
  assert.equal(boundary.external_reference_fetch_enabled,false);
  assert.equal(boundary.automatic_promotion_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
});
