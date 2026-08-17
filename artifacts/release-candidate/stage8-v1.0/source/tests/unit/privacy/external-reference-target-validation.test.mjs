import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_TARGET_FORBIDDEN_ADDRESS_CLASSES,REFERENCE_TARGET_NORMALIZATION_STEPS,
  REFERENCE_TARGET_OWNERSHIP_PROOF_TYPES,REFERENCE_TARGET_REJECTION_RULES,
  buildExternalReferenceTargetValidationContract,externalReferenceTargetValidationBoundary,
  mapExternalReferenceTargetValidationContract
} from '../../../developer/src/privacy/external-reference-target-validation.mjs';
import {buildExternalReferenceSchemeGovernanceContract} from '../../../developer/src/privacy/external-reference-scheme-governance.mjs';
import {buildExternalEvidenceSubmissionEnvelopeContract} from '../../../developer/src/privacy/external-evidence-submission-envelope.mjs';
import {buildExternalConfigurationEvidenceQueueContract} from '../../../developer/src/privacy/external-configuration-evidence-queue.mjs';
import {buildExternalConnectionAcceptancePacket} from '../../../developer/src/privacy/external-connection-acceptance.mjs';
import {buildExternalEvidenceIntakeAdapterContract} from '../../../developer/src/privacy/external-evidence-intake-adapter.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validGovernance(){
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
  return {id:governanceBuilt.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...governanceBuilt,is_latest_governance_contract:true};
}

test('target validation contract binds normalization, rejection, ownership, and address policies',()=>{
  const built=buildExternalReferenceTargetValidationContract({
    contract_id:'88888888-8888-4888-8888-888888888888',revision:1,governance_contract:validGovernance()
  });
  assert.equal(REFERENCE_TARGET_NORMALIZATION_STEPS.length,8);
  assert.equal(REFERENCE_TARGET_REJECTION_RULES.length,14);
  assert.equal(REFERENCE_TARGET_OWNERSHIP_PROOF_TYPES.length,6);
  assert.equal(REFERENCE_TARGET_FORBIDDEN_ADDRESS_CLASSES.length,8);
  assert.equal(built.rules.length,6);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'TARGET_VALIDATION_POLICY_ONLY_EXTERNAL_PROOF_MISSING');
});

test('target validation rules fail closed against SSRF and ambiguous targets while remaining empty',()=>{
  const built=buildExternalReferenceTargetValidationContract({contract_id:'contract',revision:1,governance_contract:validGovernance()});
  assert.equal(built.rules.every((rule)=>rule.fail_closed&&rule.single_parse_required&&rule.idna_ascii_required&&rule.unicode_confusable_check_required),true);
  assert.equal(built.rules.every((rule)=>!rule.wildcard_allowed&&!rule.userinfo_allowed&&!rule.ip_literal_allowed&&!rule.path_traversal_allowed&&!rule.encoded_separator_allowed),true);
  assert.equal(built.rules.every((rule)=>!rule.redirect_allowed&&rule.maximum_redirects===0&&rule.dns_rebinding_guard_required&&!rule.private_network_allowed),true);
  assert.equal(built.rules.every((rule)=>rule.target_status==='MISSING_EXTERNAL'&&rule.allowed_ports.length===0),true);
  assert.equal(built.rules.every((rule)=>rule.normalized_scheme===null&&rule.normalized_authority===null&&rule.ownership_evidence_reference===null&&rule.dns_snapshot_reference===null),true);
  assert.equal(built.rules.every((rule)=>!rule.proposal_validation_execution_allowed&&!rule.dns_lookup_allowed&&!rule.external_reference_fetch_allowed&&!rule.allowlist_write_allowed),true);
});

test('target validation rejects stale, authorized, populated, or incomplete governance contracts',()=>{
  const valid=validGovernance();
  assert.throws(()=>buildExternalReferenceTargetValidationContract({contract_id:'x',revision:1,governance_contract:{...valid,is_latest_governance_contract:false}}),/GOVERNANCE_SUPERSEDED/);
  assert.throws(()=>buildExternalReferenceTargetValidationContract({contract_id:'x',revision:1,governance_contract:{...valid,connection_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalReferenceTargetValidationContract({contract_id:'x',revision:1,governance_contract:{...valid,policies:valid.policies.slice(1)}}),/POLICIES_INCOMPLETE/);
  const populated={...valid,policies:valid.policies.map((policy,index)=>index?policy:{...policy,authority_pattern:'invented.example'})};
  assert.throws(()=>buildExternalReferenceTargetValidationContract({contract_id:'x',revision:1,governance_contract:populated}),/GOVERNANCE_POLICY_INVALID/);
});

test('target validation mapping hides creator identity and exposes no lookup or write capability',()=>{
  const mapped=mapExternalReferenceTargetValidationContract({
    id:'validation',governance_contract_id:'governance',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'TARGET_VALIDATION_POLICY_ONLY_EXTERNAL_PROOF_MISSING',contract_sha256:'a'.repeat(64),
    contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,dns_resolution_authorized:false,
    network_connection_authorized:false,execution_authorized:false,created_at:'2026-08-09T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalReferenceTargetValidationBoundary();
  assert.equal(boundary.target_value_write_enabled,false);
  assert.equal(boundary.target_normalization_execution_enabled,false);
  assert.equal(boundary.ownership_proof_submission_enabled,false);
  assert.equal(boundary.dns_resolution_enabled,false);
  assert.equal(boundary.redirect_follow_enabled,false);
  assert.equal(boundary.allowlist_activation_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
});
