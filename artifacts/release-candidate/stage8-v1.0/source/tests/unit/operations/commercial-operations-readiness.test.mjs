import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCommercialOperationsReadiness,COMMERCIAL_OPERATIONS_CONTROLS} from '../../../developer/src/operations/commercial-operations-readiness.mjs';

const completeInput=()=>({
  protocol_code:'MCC-D80-10-OPS-001',protocol_status:'COMPLETED',control_count:10,verified_control_count:10,
  valid_control_count:10,backup_restore_verified_count:1,migration_rollback_verified_count:1,
  open_blocking_issue_count:0,product_review_count:0
});

test('empty commercial operations evidence fails closed without release claim',()=>{
  const result=buildCommercialOperationsReadiness();
  assert.equal(result.requirement_id,'D80-10');
  assert.equal(result.status,'BLOCKED_EXTERNAL_COMMERCIAL_OPERATIONS');
  assert.equal(result.counts.controls,0);
  assert.equal(result.claims.production_release_authorized,false);
  assert.equal(result.claims.market_score_80_confirmed,false);
});

test('duplicate or incomplete controls remain blocked',()=>{
  for(const counts of [{control_count:9,verified_control_count:9,valid_control_count:9},{control_count:11,verified_control_count:11,valid_control_count:11}]){
    const result=buildCommercialOperationsReadiness({...completeInput(),...counts});
    assert.equal(result.gates.controls_complete,false);
    assert.equal(result.status,'BLOCKED_EXTERNAL_COMMERCIAL_OPERATIONS');
  }
});

test('recovery and rollback are independent hard gates',()=>{
  const result=buildCommercialOperationsReadiness({...completeInput(),backup_restore_verified_count:0});
  assert.equal(result.gates.backup_restore_verified,false);
  assert.equal(result.gates.migration_rollback_verified,true);
  assert.equal(result.status,'BLOCKED_EXTERNAL_COMMERCIAL_OPERATIONS');
});

test('unresolved high or critical issue blocks otherwise complete operations evidence',()=>{
  const result=buildCommercialOperationsReadiness({...completeInput(),open_blocking_issue_count:1});
  assert.equal(result.gates.no_open_blocking_issue,false);
  assert.equal(result.status,'BLOCKED_EXTERNAL_COMMERCIAL_OPERATIONS');
});

test('complete controls reach release review but do not authorize release',()=>{
  const result=buildCommercialOperationsReadiness(completeInput());
  assert.equal(result.gates.controls_complete,true);
  assert.equal(result.status,'READY_FOR_RELEASE_REVIEW');
  assert.equal(result.claims.production_release_authorized,false);
  assert.equal(result.claims.automatic_deployment,false);
});

test('one explicit product review still requires the release boundary to remain manual',()=>{
  const result=buildCommercialOperationsReadiness({...completeInput(),product_review_count:1,product_review_reference:'OPS-REVIEW-001'});
  assert.equal(result.status,'EXTERNAL_COMMERCIAL_OPERATIONS_ACCEPTED');
  assert.equal(result.claims.production_release_authorized,false);
  assert.equal(result.claims.market_score_80_confirmed,false);
});

test('control inventory remains fixed at ten',()=>{
  assert.equal(COMMERCIAL_OPERATIONS_CONTROLS.length,10);
  assert.equal(new Set(COMMERCIAL_OPERATIONS_CONTROLS).size,10);
});
