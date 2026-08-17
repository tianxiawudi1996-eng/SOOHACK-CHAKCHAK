import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_SCHEME_LIFECYCLE_STATES,REFERENCE_SCHEME_PROPOSAL_REQUIRED_FIELDS,
  REFERENCE_SCHEME_REAPPROVAL_TRIGGERS,REFERENCE_TARGET_RESTRICTION_FIELDS,
  buildExternalReferenceSchemeGovernanceContract,externalReferenceSchemeGovernanceBoundary,
  mapExternalReferenceSchemeGovernanceContract
} from '../../../developer/src/privacy/external-reference-scheme-governance.mjs';
import {buildExternalEvidenceSubmissionEnvelopeContract} from '../../../developer/src/privacy/external-evidence-submission-envelope.mjs';
import {buildExternalConfigurationEvidenceQueueContract} from '../../../developer/src/privacy/external-configuration-evidence-queue.mjs';
import {buildExternalConnectionAcceptancePacket} from '../../../developer/src/privacy/external-connection-acceptance.mjs';
import {buildExternalEvidenceIntakeAdapterContract} from '../../../developer/src/privacy/external-evidence-intake-adapter.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validEnvelope(){
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
  return {id:envelopeBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...envelopeBuilt,is_latest_envelope_contract:true};
}

test('scheme governance contract binds proposal, target, lifecycle, and reapproval policies',()=>{
  const built=buildExternalReferenceSchemeGovernanceContract({
    contract_id:'77777777-7777-4777-8777-777777777777',revision:1,envelope_contract:validEnvelope()
  });
  assert.equal(REFERENCE_SCHEME_PROPOSAL_REQUIRED_FIELDS.length,10);
  assert.equal(REFERENCE_TARGET_RESTRICTION_FIELDS.length,6);
  assert.equal(REFERENCE_SCHEME_LIFECYCLE_STATES.length,7);
  assert.equal(REFERENCE_SCHEME_REAPPROVAL_TRIGGERS.length,6);
  assert.equal(built.policies.length,6);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'SCHEME_GOVERNANCE_ONLY_PROPOSAL_MISSING_EXTERNAL');
});

test('scheme policies enforce separation and exact targets while remaining unproposed',()=>{
  const built=buildExternalReferenceSchemeGovernanceContract({contract_id:'contract',revision:1,envelope_contract:validEnvelope()});
  assert.equal(built.policies.every((policy)=>policy.required_approver_roles.length===2&&policy.approvers_must_be_distinct&&policy.proposer_must_differ_from_approvers),true);
  assert.equal(built.policies.every((policy)=>policy.target_scope_must_be_exact&&!policy.wildcard_authority_allowed&&!policy.unrestricted_path_allowed),true);
  assert.equal(built.policies.every((policy)=>policy.revocation_required&&policy.expiry_required&&policy.reapproval_required),true);
  assert.equal(built.policies.every((policy)=>policy.proposal_status==='MISSING_EXTERNAL'&&policy.current_lifecycle_state==='NOT_PROPOSED'),true);
  assert.equal(built.policies.every((policy)=>policy.proposal_id===null&&policy.proposed_scheme_name===null&&policy.authority_pattern===null&&policy.path_prefix===null),true);
  assert.equal(built.policies.every((policy)=>!policy.allowlist_activation_allowed&&!policy.metadata_submission_allowed&&!policy.automatic_promotion_allowed),true);
});

test('scheme governance rejects stale, authorized, populated, or incomplete envelope contracts',()=>{
  const valid=validEnvelope();
  assert.throws(()=>buildExternalReferenceSchemeGovernanceContract({contract_id:'x',revision:1,envelope_contract:{...valid,is_latest_envelope_contract:false}}),/ENVELOPE_SUPERSEDED/);
  assert.throws(()=>buildExternalReferenceSchemeGovernanceContract({contract_id:'x',revision:1,envelope_contract:{...valid,execution_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalReferenceSchemeGovernanceContract({contract_id:'x',revision:1,envelope_contract:{...valid,rules:valid.rules.slice(1)}}),/RULES_INCOMPLETE/);
  const populated={...valid,rules:valid.rules.map((rule,index)=>index?rule:{...rule,submission_id:'invented'})};
  assert.throws(()=>buildExternalReferenceSchemeGovernanceContract({contract_id:'x',revision:1,envelope_contract:populated}),/RULE_INVALID/);
});

test('scheme governance mapping hides creator identity and exposes no proposal or activation writes',()=>{
  const mapped=mapExternalReferenceSchemeGovernanceContract({
    id:'governance',envelope_contract_id:'envelope',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'SCHEME_GOVERNANCE_ONLY_PROPOSAL_MISSING_EXTERNAL',contract_sha256:'a'.repeat(64),
    contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,connection_authorized:false,
    execution_authorized:false,created_at:'2026-08-08T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalReferenceSchemeGovernanceBoundary();
  assert.equal(boundary.scheme_proposal_submission_enabled,false);
  assert.equal(boundary.scheme_approval_decision_write_enabled,false);
  assert.equal(boundary.reference_scheme_allowlist_write_enabled,false);
  assert.equal(boundary.allowlist_activation_enabled,false);
  assert.equal(boundary.metadata_submission_enabled,false);
  assert.equal(boundary.lifecycle_transition_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
});
