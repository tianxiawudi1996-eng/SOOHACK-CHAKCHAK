import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_PROOF_INTAKE_REJECTION_CODES,REFERENCE_PROOF_INTAKE_STATES,
  REFERENCE_PROOF_INTAKE_TRANSITIONS,REFERENCE_PROOF_REPLAY_CONTROLS,
  REFERENCE_PROOF_REVIEW_DECISIONS,buildExternalReferenceProofIntakeContract,
  externalReferenceProofIntakeBoundary,mapExternalReferenceProofIntakeContract
} from '../../../developer/src/privacy/external-reference-proof-intake.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validProofHandoff(){
  return {
    id:'11111111-1111-4111-8111-111111111111',package_manifest_id:'22222222-2222-4222-8222-222222222222',
    status:'PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING',is_latest_proof_handoff_contract:true,
    kill_switch_engaged:true,proof_intake_authorized:false,dns_resolution_authorized:false,
    network_connection_authorized:false,execution_authorized:false,
    requirements:EXECUTION_READINESS_CONTROLS.map((control_key)=>({
      control_key,owner_role:'SECURITY_APPROVER',handoff_status:'POLICY_DEFINED_EVIDENCE_MISSING',
      evidence_status:'MISSING_EXTERNAL',issuer_trust_status:'MISSING_EXTERNAL',metadata_only:true,
      signature_required:true,revocation_check_required:true,raw_evidence_storage_allowed:false,
      credential_material_storage_allowed:false,secret_material_storage_allowed:false,proof_id:null,
      evidence_reference:null,evidence_sha256:null,signature_reference:null,issuer_identity_reference:null,
      handoff_submission_allowed:false,proof_validation_execution_allowed:false,allowlist_write_allowed:false,
      automatic_promotion_allowed:false
    }))
  };
}

test('proof intake contract defines fail-closed quarantine, replay, signature, issuer, and dual-review policy',()=>{
  const built=buildExternalReferenceProofIntakeContract({
    contract_id:'33333333-3333-4333-8333-333333333333',revision:1,proof_handoff_contract:validProofHandoff()
  });
  assert.equal(REFERENCE_PROOF_INTAKE_STATES.length,9);
  assert.equal(REFERENCE_PROOF_INTAKE_TRANSITIONS.length,14);
  assert.equal(REFERENCE_PROOF_INTAKE_REJECTION_CODES.length,12);
  assert.equal(REFERENCE_PROOF_REPLAY_CONTROLS.length,6);
  assert.equal(REFERENCE_PROOF_REVIEW_DECISIONS.length,3);
  assert.equal(built.rules.length,6);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'PROOF_INTAKE_POLICY_ONLY_CHANNEL_MISSING_EXTERNAL');
});

test('proof intake rules remain empty, not accepting, and non-executable',()=>{
  const built=buildExternalReferenceProofIntakeContract({contract_id:'contract',revision:1,proof_handoff_contract:validProofHandoff()});
  assert.equal(built.rules.every((rule)=>rule.current_state==='NOT_ACCEPTING'&&rule.intake_channel_status==='MISSING_EXTERNAL'),true);
  assert.equal(built.rules.every((rule)=>rule.metadata_only&&rule.fail_closed&&rule.quarantine_required&&rule.duplicate_check_required&&rule.replay_check_required),true);
  assert.equal(built.rules.every((rule)=>rule.signature_check_required&&rule.issuer_check_required&&rule.two_distinct_reviewers_required),true);
  assert.equal(built.rules.every((rule)=>rule.proof_id===null&&rule.evidence_reference===null&&rule.first_reviewer_identity_reference===null),true);
  assert.equal(built.rules.every((rule)=>!rule.proof_submission_allowed&&!rule.quarantine_write_allowed&&!rule.intake_state_transition_allowed&&!rule.review_decision_write_allowed&&!rule.automatic_activation_allowed),true);
});

test('proof intake rejects stale, authorized, populated, or incomplete proof handoff contracts',()=>{
  const valid=validProofHandoff();
  assert.throws(()=>buildExternalReferenceProofIntakeContract({contract_id:'x',revision:1,proof_handoff_contract:{...valid,is_latest_proof_handoff_contract:false}}),/HANDOFF_SUPERSEDED/);
  assert.throws(()=>buildExternalReferenceProofIntakeContract({contract_id:'x',revision:1,proof_handoff_contract:{...valid,proof_intake_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalReferenceProofIntakeContract({contract_id:'x',revision:1,proof_handoff_contract:{...valid,requirements:valid.requirements.slice(1)}}),/REQUIREMENTS_INCOMPLETE/);
  const populated={...valid,requirements:valid.requirements.map((rule,index)=>index?rule:{...rule,evidence_reference:'invented'})};
  assert.throws(()=>buildExternalReferenceProofIntakeContract({contract_id:'x',revision:1,proof_handoff_contract:populated}),/HANDOFF_REQUIREMENT_INVALID/);
});

test('proof intake mapping hides creator identity and exposes no intake, review, release, or activation writes',()=>{
  const mapped=mapExternalReferenceProofIntakeContract({
    id:'intake',proof_handoff_contract_id:'handoff',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'PROOF_INTAKE_POLICY_ONLY_CHANNEL_MISSING_EXTERNAL',contract_sha256:'a'.repeat(64),
    contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,proof_intake_authorized:false,
    validation_execution_authorized:false,network_connection_authorized:false,execution_authorized:false,
    created_at:'2026-08-09T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalReferenceProofIntakeBoundary();
  assert.equal(boundary.proof_submission_enabled,false);
  assert.equal(boundary.quarantine_write_enabled,false);
  assert.equal(boundary.replay_check_execution_enabled,false);
  assert.equal(boundary.review_decision_write_enabled,false);
  assert.equal(boundary.quarantine_release_enabled,false);
  assert.equal(boundary.allowlist_activation_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
});
