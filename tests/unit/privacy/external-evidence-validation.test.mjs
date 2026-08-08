import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_EVIDENCE_METADATA_FIELDS,EVIDENCE_VALIDATION_STATES,EVIDENCE_VALIDATION_TRANSITIONS,
  FORBIDDEN_EVIDENCE_FIELDS,buildExternalEvidenceValidationContract,externalEvidenceValidationBoundary,
  isEvidenceTransitionAllowed,mapExternalEvidenceValidationContract
} from '../../../developer/src/privacy/external-evidence-validation.mjs';
import {buildExecutionHandoffPacket} from '../../../developer/src/privacy/execution-handoff.mjs';
import {missingExternalControls} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validHandoff(){
  const readiness={
    id:'11111111-1111-4111-8111-111111111111',package_manifest_id:'22222222-2222-4222-8222-222222222222',
    status:'BLOCKED_EXTERNAL',is_latest_review:true,
    local_checks:{latest_package:true,package_not_expired:true,no_active_legal_hold:true,recovery_checkpoint_present:true,dual_approval_present:true,manifest_hash_bound:true},
    local_blockers:[],controls:missingExternalControls(),kill_switch_engaged:true,execution_authorized:false
  };
  const built=buildExecutionHandoffPacket({packet_id:'33333333-3333-4333-8333-333333333333',revision:1,readiness_review:readiness});
  return {id:built.packet_manifest.packet_id,package_manifest_id:readiness.package_manifest_id,...built,is_latest_handoff_packet:true};
}

test('external evidence state machine defines guarded lifecycle and terminal invalid transitions',()=>{
  assert.equal(EVIDENCE_VALIDATION_STATES.length,8);
  assert.equal(EVIDENCE_VALIDATION_TRANSITIONS.length,13);
  assert.equal(isEvidenceTransitionAllowed('NOT_SUBMITTED','SUBMITTED'),true);
  assert.equal(isEvidenceTransitionAllowed('UNDER_REVIEW','DUAL_APPROVED'),true);
  assert.equal(isEvidenceTransitionAllowed('DUAL_APPROVED','VERIFIED'),true);
  assert.equal(isEvidenceTransitionAllowed('VERIFIED','REVOKED'),true);
  assert.equal(isEvidenceTransitionAllowed('REJECTED','VERIFIED'),false);
});

test('validation contract is hash-bound, dual-reviewed, expiring, revocable, and data-minimized',()=>{
  const contract=buildExternalEvidenceValidationContract({
    contract_id:'44444444-4444-4444-8444-444444444444',revision:1,handoff_packet:validHandoff()
  });
  assert.equal(contract.status,'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING');
  assert.equal(hashCanonical(contract.contract_manifest),contract.contract_sha256);
  assert.equal(contract.rules.length,6);
  assert.equal(contract.rules.every((rule)=>rule.allowed_metadata_fields.length===6&&rule.forbidden_fields.length===7),true);
  assert.equal(contract.rules.every((rule)=>rule.required_approver_roles.join(',')==='PRIVACY_APPROVER,SECURITY_APPROVER'),true);
  assert.equal(contract.rules.every((rule)=>rule.expiry_required&&rule.revocation_check_required&&!rule.raw_content_storage_allowed),true);
  assert.equal(ALLOWED_EVIDENCE_METADATA_FIELDS.includes('raw_content'),false);
  assert.equal(FORBIDDEN_EVIDENCE_FIELDS.includes('secret'),true);
  assert.equal(contract.execution_authorized,false);
});

test('validation contract rejects stale or already-populated handoff evidence',()=>{
  const handoff=validHandoff();
  assert.throws(()=>buildExternalEvidenceValidationContract({contract_id:'x',revision:1,handoff_packet:{...handoff,is_latest_handoff_packet:false}}),/HANDOFF_SUPERSEDED/);
  const populated={...handoff,requirements:handoff.requirements.map((item,index)=>index?item:{...item,evidence_reference:'invented'})};
  assert.throws(()=>buildExternalEvidenceValidationContract({contract_id:'x',revision:1,handoff_packet:populated}),/REQUIREMENT_INVALID/);
  assert.throws(()=>buildExternalEvidenceValidationContract({contract_id:'x',revision:1,handoff_packet:{...handoff,execution_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
});

test('validation mapping omits creator identity and exposes no evidence write or execution path',()=>{
  const mapped=mapExternalEvidenceValidationContract({
    id:'contract',handoff_packet_id:'packet',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING',contract_sha256:'a'.repeat(64),contract_manifest:{safe:true},
    created_by_user_id:'hidden',kill_switch_engaged:true,execution_authorized:false,created_at:'2026-08-08T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalEvidenceValidationBoundary();
  assert.equal(boundary.evidence_submission_enabled,false);
  assert.equal(boundary.evidence_state_transition_enabled,false);
  assert.equal(boundary.reviewer_decision_write_enabled,false);
  assert.equal(boundary.execution_authorization_enabled,false);
  assert.equal(boundary.destructive_executor_enabled,false);
});
