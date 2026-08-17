export const EXECUTION_READINESS_CONTROLS=Object.freeze([
  'MANAGED_IDENTITY',
  'JIT_AUTHORIZATION',
  'BACKUP_RESTORE_EVIDENCE',
  'CHANGE_WINDOW',
  'KILL_SWITCH_RELEASE_AUTHORITY',
  'AUDIT_EXPORT_ROUTE'
]);

export function missingExternalControls(){
  return EXECUTION_READINESS_CONTROLS.map((control_key)=>({
    control_key,status:'MISSING_EXTERNAL',evidence_reference:null,verified_at:null
  }));
}

export function evaluateExecutionReadiness(localChecks){
  const checks={
    latest_package:Boolean(localChecks.latest_package),
    package_not_expired:Boolean(localChecks.package_not_expired),
    no_active_legal_hold:Boolean(localChecks.no_active_legal_hold),
    recovery_checkpoint_present:Boolean(localChecks.recovery_checkpoint_present),
    dual_approval_present:Boolean(localChecks.dual_approval_present),
    manifest_hash_bound:Boolean(localChecks.manifest_hash_bound)
  };
  const localBlockers=Object.entries(checks).filter(([,passed])=>!passed).map(([key])=>key);
  return {
    status:localBlockers.length?'BLOCKED_LOCAL_PREREQUISITE':'BLOCKED_EXTERNAL',
    local_checks:checks,
    local_blockers:localBlockers,
    external_controls:missingExternalControls(),
    kill_switch_engaged:true,
    execution_authorized:false
  };
}

export function mapExecutionReadinessReview(row,{controls=[]}={}){
  return {
    id:row.id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_review_id:row.predecessor_review_id,
    status:row.status,
    package_manifest_sha256:row.package_manifest_sha256,
    local_checks:row.local_checks,
    local_blockers:row.local_blockers,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    execution_authorized:Boolean(row.execution_authorized),
    controls:controls.map(({control_key,status,evidence_reference,verified_at})=>({
      control_key,status,evidence_reference,verified_at
    })),
    evaluated_at:row.evaluated_at
  };
}

export function executionReadinessBoundary(){
  return {
    external_evidence_write_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'BLOCKED_EXTERNAL_CONFIGURATION_AND_AUTHORITY'
  };
}
