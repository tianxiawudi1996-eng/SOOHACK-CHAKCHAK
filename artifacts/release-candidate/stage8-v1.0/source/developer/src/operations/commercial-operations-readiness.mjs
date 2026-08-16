export const COMMERCIAL_OPERATIONS_CONTROLS=Object.freeze([
  'PRIVACY_CHILD_CONSENT',
  'CONTENT_RIGHTS',
  'PAYMENT_REFUND',
  'SLA_SUPPORT',
  'INCIDENT_RESPONSE',
  'MONITORING_ALERTS',
  'BACKUP_RESTORE',
  'MIGRATION_ROLLBACK',
  'DEPLOYMENT_HEALTHCHECK',
  'SECURITY_ACCESS_REVIEW'
]);

const count=value=>Math.max(0,Number.isFinite(Number(value))?Math.trunc(Number(value)):0);
const bounded=(value,maximum)=>Math.min(count(value),maximum);

export function buildCommercialOperationsReadiness(input={}){
  const controls=count(input.control_count);
  const verifiedControls=bounded(input.verified_control_count,controls);
  const validControls=bounded(input.valid_control_count,verifiedControls);
  const expiredControls=count(input.expired_control_count);
  const rejectedControls=count(input.rejected_control_count);
  const recoveryDrills=count(input.backup_restore_verified_count);
  const rollbackDrills=count(input.migration_rollback_verified_count);
  const openBlockingIssues=count(input.open_blocking_issue_count);
  const productReviews=count(input.product_review_count);
  const protocolLocked=['REGISTERED_LOCKED','ACTIVE','COMPLETED'].includes(input.protocol_status);

  const gates={
    protocol_locked:protocolLocked,
    controls_complete:controls===COMMERCIAL_OPERATIONS_CONTROLS.length&&verifiedControls===COMMERCIAL_OPERATIONS_CONTROLS.length,
    control_evidence_valid:validControls===COMMERCIAL_OPERATIONS_CONTROLS.length&&expiredControls===0&&rejectedControls===0,
    backup_restore_verified:recoveryDrills>0,
    migration_rollback_verified:rollbackDrills>0,
    no_open_blocking_issue:openBlockingIssues===0
  };
  const evidenceComplete=Object.values(gates).every(Boolean);
  const reviewed=evidenceComplete&&productReviews>0&&Boolean(input.product_review_reference);

  return {
    requirement_id:'D80-10',
    status:reviewed?'EXTERNAL_COMMERCIAL_OPERATIONS_ACCEPTED':evidenceComplete?'READY_FOR_RELEASE_REVIEW':'BLOCKED_EXTERNAL_COMMERCIAL_OPERATIONS',
    protocol:{code:input.protocol_code||null,status:input.protocol_status||'NOT_REGISTERED',environment_count:4,automatic_deployment:false,automatic_release:false},
    counts:{
      controls,verified_controls:verifiedControls,valid_controls:validControls,expired_controls:expiredControls,
      rejected_controls:rejectedControls,backup_restore_drills:recoveryDrills,migration_rollback_drills:rollbackDrills,
      open_blocking_issues:openBlockingIssues,product_reviews:productReviews
    },
    gates,
    claims:{
      legal_approval_proven:false,
      commercial_readiness_proven:false,
      production_release_authorized:false,
      automatic_deployment:false,
      automatic_release:false,
      market_score_80_confirmed:false,
      note:evidenceComplete?'상용 운영 증거가 수동 출시 검토 조건에 도달했지만 법률 적합성·운영 출시·시장 점수는 별도 외부 승인 대상입니다.':'실제 상용 운영·법률·복구 증거 없이 출시 준비를 선언할 수 없습니다.'
    },
    privacy:{
      legal_document_storage:false,
      payment_token_storage:false,
      backup_payload_storage:false,
      personal_contact_storage:false,
      aggregate_status_only:true
    }
  };
}
