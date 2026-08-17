import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXECUTION_HANDOFF_REQUIREMENTS,buildExecutionHandoffPacket,executionHandoffBoundary,mapExecutionHandoffPacket
} from '../../../developer/src/privacy/execution-handoff.mjs';
import {missingExternalControls} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

const readyReview={
  id:'11111111-1111-4111-8111-111111111111',
  package_manifest_id:'22222222-2222-4222-8222-222222222222',
  status:'BLOCKED_EXTERNAL',
  local_checks:{latest_package:true,package_not_expired:true,no_active_legal_hold:true,recovery_checkpoint_present:true,dual_approval_present:true,manifest_hash_bound:true},
  local_blockers:[],controls:missingExternalControls(),kill_switch_engaged:true,execution_authorized:false,is_latest_review:true
};

test('execution handoff defines six distinct external owners and evidence contracts',()=>{
  assert.equal(EXECUTION_HANDOFF_REQUIREMENTS.length,6);
  assert.equal(new Set(EXECUTION_HANDOFF_REQUIREMENTS.map(({control_key})=>control_key)).size,6);
  assert.equal(new Set(EXECUTION_HANDOFF_REQUIREMENTS.map(({owner_role})=>owner_role)).size,6);
  assert.equal(EXECUTION_HANDOFF_REQUIREMENTS.every(({required_evidence,submission_route_policy})=>required_evidence.length===2&&submission_route_policy.endsWith('_CHANNEL')),true);
});

test('execution handoff packet remains externally blocked and hash-bound',()=>{
  const packet=buildExecutionHandoffPacket({
    packet_id:'33333333-3333-4333-8333-333333333333',revision:1,predecessor_packet_id:null,readiness_review:readyReview
  });
  assert.equal(packet.status,'AWAITING_EXTERNAL_SUBMISSION');
  assert.match(packet.packet_sha256,/^[0-9a-f]{64}$/);
  assert.equal(hashCanonical(packet.packet_manifest),packet.packet_sha256);
  assert.equal(packet.requirements.length,6);
  assert.equal(packet.requirements.every((item)=>item.status==='EXTERNAL_SUBMISSION_REQUIRED'&&item.submission_route_status==='MISSING_EXTERNAL'),true);
  assert.equal(packet.requirements.every((item)=>item.required_approver_roles.join(',')==='PRIVACY_APPROVER,SECURITY_APPROVER'),true);
  assert.equal(packet.kill_switch_engaged,true);
  assert.equal(packet.execution_authorized,false);
});

test('execution handoff rejects incomplete or locally blocked readiness sources',()=>{
  assert.throws(()=>buildExecutionHandoffPacket({packet_id:'x',revision:1,readiness_review:{...readyReview,status:'BLOCKED_LOCAL_PREREQUISITE'}}),/READINESS_NOT_EXTERNALLY_BLOCKED/);
  assert.throws(()=>buildExecutionHandoffPacket({packet_id:'x',revision:1,readiness_review:{...readyReview,is_latest_review:false}}),/READINESS_SUPERSEDED/);
  assert.throws(()=>buildExecutionHandoffPacket({packet_id:'x',revision:1,readiness_review:{...readyReview,controls:readyReview.controls.slice(1)}}),/CONTROL_SET_INCOMPLETE/);
  assert.throws(()=>buildExecutionHandoffPacket({packet_id:'x',revision:1,readiness_review:{...readyReview,execution_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
});

test('execution handoff mapping omits creator identity and exposes no write boundary',()=>{
  const mapped=mapExecutionHandoffPacket({
    id:'packet',readiness_review_id:'review',package_manifest_id:'manifest',revision:'1',predecessor_packet_id:null,
    schema_version:'1.0.0',status:'AWAITING_EXTERNAL_SUBMISSION',packet_sha256:'a'.repeat(64),packet_manifest:{safe:true},
    created_by_user_id:'hidden',kill_switch_engaged:true,execution_authorized:false,created_at:'2026-08-08T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=executionHandoffBoundary();
  assert.equal(boundary.external_submission_write_enabled,false);
  assert.equal(boundary.external_evidence_verification_enabled,false);
  assert.equal(boundary.execution_authorization_enabled,false);
  assert.equal(boundary.destructive_executor_enabled,false);
});
