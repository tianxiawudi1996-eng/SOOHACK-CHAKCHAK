import {canTransitionPrivacyRequest} from './data-rights.mjs';

export const OPERATOR_TRANSITION_TARGETS=Object.freeze([
  'IDENTITY_VERIFIED','IN_REVIEW','APPROVED','REJECTED','COMPLETED'
]);

export function validateOperatorTransition({fromStatus,toStatus,reasonCode,evidenceReference,evidenceSha256}){
  if(!OPERATOR_TRANSITION_TARGETS.includes(toStatus)||!canTransitionPrivacyRequest(fromStatus,toStatus)){
    return {allowed:false,reason:'INVALID_STATUS_TRANSITION'};
  }
  if(toStatus==='COMPLETED')return {allowed:false,reason:'PRIVACY_FULFILMENT_EXECUTOR_DISABLED'};
  if(['APPROVED','REJECTED'].includes(toStatus)&&!isReasonCode(reasonCode)){
    return {allowed:false,reason:'DECISION_REASON_REQUIRED'};
  }
  if(toStatus==='IDENTITY_VERIFIED'&&(!isReference(evidenceReference)||!isSha256(evidenceSha256))){
    return {allowed:false,reason:'IDENTITY_EVIDENCE_REQUIRED'};
  }
  return {allowed:true,reason:'AUTHORIZED_TRANSITION'};
}

export function isReasonCode(value){
  return typeof value==='string'&&/^[A-Z][A-Z0-9_]{2,63}$/.test(value);
}

export function isReference(value){
  return typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:/-]{7,190}$/.test(value);
}

export function isSha256(value){
  return typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
}

export function mapPrivacyOperationsItem(row){
  return {
    id:row.id,
    request_type:row.request_type,
    status:row.status,
    locale:row.locale,
    policy_version:row.policy_version,
    submitted_at:row.submitted_at,
    updated_at:row.updated_at,
    assigned_to_current_operator:Boolean(row.assigned_to_current_operator),
    decision_reason_code:row.decision_reason_code??null
  };
}

export function privacyOperationsBoundary(){
  return {
    environment:'LOCAL_SYNTHETIC_ONLY',
    managed_identity_ready:false,
    destructive_fulfilment_enabled:false,
    completion_transition_enabled:false,
    production_access:'BLOCKED_EXTERNAL_IDENTITY_POLICY'
  };
}
