export const PRIVACY_OPERATION_ROLES=Object.freeze(['OPERATOR','PRIVACY_APPROVER','SECURITY_APPROVER']);
export const APPROVAL_ROLES=Object.freeze(['PRIVACY_APPROVER','SECURITY_APPROVER']);

export function isPrivacyOperationRole(value){
  return PRIVACY_OPERATION_ROLES.includes(value);
}

export function isApprovalRole(value){
  return APPROVAL_ROLES.includes(value);
}

export function mapFulfilmentPlan(row,{approvals=[]}={}){
  return {
    id:row.id,
    privacy_request_id:row.privacy_request_id,
    request_type:row.request_type,
    status:row.status,
    execution_mode:row.execution_mode,
    policy_version:row.policy_version,
    created_at:row.created_at,
    updated_at:row.updated_at,
    impact:row.assessment_sha256?{
      profile_rows:Number(row.profile_rows),diagnostic_sessions:Number(row.diagnostic_sessions),
      learning_sessions:Number(row.learning_sessions),review_items:Number(row.review_items),
      formula_sessions:Number(row.formula_sessions),preserved_privacy_records:Number(row.preserved_privacy_records),
      active_legal_hold:Boolean(row.active_legal_hold),assessment_sha256:row.assessment_sha256
    }:null,
    approvals:approvals.map(({approval_role,decision,reason_code,decided_at})=>({approval_role,decision,reason_code,decided_at}))
  };
}

export function fulfilmentControlBoundary(){
  return {
    execution_mode:'DRY_RUN_ONLY',
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    dual_approval_required:true,
    production_access:'BLOCKED_EXTERNAL_IDENTITY_POLICY'
  };
}
