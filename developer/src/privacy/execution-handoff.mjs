import {hashCanonical} from './fulfilment-package.mjs';
import {EXECUTION_READINESS_CONTROLS} from './execution-readiness.mjs';

export const EXECUTION_HANDOFF_SCHEMA_VERSION='1.0.0';

export const EXECUTION_HANDOFF_REQUIREMENTS=Object.freeze([
  Object.freeze({control_key:'MANAGED_IDENTITY',owner_role:'IDENTITY_PLATFORM_OWNER',required_evidence:Object.freeze(['MANAGED_IDENTITY_CONFIGURATION_ATTESTATION','AUTHENTICATION_POLICY_EXPORT']),submission_route_policy:'IDENTITY_GOVERNANCE_CHANGE_CHANNEL'}),
  Object.freeze({control_key:'JIT_AUTHORIZATION',owner_role:'PRIVILEGED_ACCESS_OWNER',required_evidence:Object.freeze(['JIT_POLICY_EXPORT','TIME_BOUND_ACCESS_AUDIT_SAMPLE']),submission_route_policy:'PRIVILEGED_ACCESS_CHANGE_CHANNEL'}),
  Object.freeze({control_key:'BACKUP_RESTORE_EVIDENCE',owner_role:'BACKUP_RECOVERY_OWNER',required_evidence:Object.freeze(['BACKUP_JOB_EVIDENCE','RESTORE_REHEARSAL_RESULT']),submission_route_policy:'DISASTER_RECOVERY_EVIDENCE_CHANNEL'}),
  Object.freeze({control_key:'CHANGE_WINDOW',owner_role:'CHANGE_MANAGER',required_evidence:Object.freeze(['APPROVED_CHANGE_RECORD','ROLLBACK_AND_MONITORING_PLAN']),submission_route_policy:'CHANGE_ADVISORY_CHANNEL'}),
  Object.freeze({control_key:'KILL_SWITCH_RELEASE_AUTHORITY',owner_role:'INCIDENT_CONTROL_OWNER',required_evidence:Object.freeze(['DUAL_CONTROL_AUTHORITY_POLICY','EMERGENCY_STOP_REHEARSAL']),submission_route_policy:'PRIVACY_SECURITY_DUAL_CONTROL_CHANNEL'}),
  Object.freeze({control_key:'AUDIT_EXPORT_ROUTE',owner_role:'AUDIT_ARCHIVE_OWNER',required_evidence:Object.freeze(['IMMUTABLE_AUDIT_DESTINATION_ATTESTATION','RETENTION_AND_ACCESS_POLICY']),submission_route_policy:'AUDIT_ARCHIVE_ONBOARDING_CHANNEL'})
]);

const REQUIRED_APPROVER_ROLES=Object.freeze(['PRIVACY_APPROVER','SECURITY_APPROVER']);

function assertHandoffSource(readinessReview){
  if(readinessReview?.status!=='BLOCKED_EXTERNAL')throw new Error('EXECUTION_HANDOFF_READINESS_NOT_EXTERNALLY_BLOCKED');
  if(readinessReview.is_latest_review!==true)throw new Error('EXECUTION_HANDOFF_READINESS_SUPERSEDED');
  if(!readinessReview.kill_switch_engaged||readinessReview.execution_authorized)throw new Error('EXECUTION_HANDOFF_SAFETY_BOUNDARY_INVALID');
  if(!readinessReview.local_checks||!Object.values(readinessReview.local_checks).every(Boolean)||readinessReview.local_blockers?.length)throw new Error('EXECUTION_HANDOFF_LOCAL_PREREQUISITE_FAILED');
  const controls=readinessReview.controls??[];
  if(controls.length!==EXECUTION_READINESS_CONTROLS.length)throw new Error('EXECUTION_HANDOFF_CONTROL_SET_INCOMPLETE');
  for(const key of EXECUTION_READINESS_CONTROLS){
    const control=controls.find((item)=>item.control_key===key);
    if(!control||control.status!=='MISSING_EXTERNAL'||control.evidence_reference||control.verified_at)throw new Error(`EXECUTION_HANDOFF_CONTROL_INVALID:${key}`);
  }
}

export function buildExecutionHandoffPacket(input){
  assertHandoffSource(input.readiness_review);
  const requirements=EXECUTION_HANDOFF_REQUIREMENTS.map((requirement)=>({
    ...requirement,
    required_evidence:[...requirement.required_evidence],
    required_approver_roles:[...REQUIRED_APPROVER_ROLES],
    submission_route_status:'MISSING_EXTERNAL',
    status:'EXTERNAL_SUBMISSION_REQUIRED',
    evidence_reference:null,
    submitted_at:null,
    verified_at:null
  }));
  const packetManifest={
    schema_version:EXECUTION_HANDOFF_SCHEMA_VERSION,
    packet_id:input.packet_id,
    readiness_review_id:input.readiness_review.id,
    package_manifest_id:input.readiness_review.package_manifest_id,
    revision:Number(input.revision),
    predecessor_packet_id:input.predecessor_packet_id??null,
    status:'AWAITING_EXTERNAL_SUBMISSION',
    requirements,
    kill_switch_engaged:true,
    execution_authorized:false
  };
  return {
    status:'AWAITING_EXTERNAL_SUBMISSION',
    packet_manifest:packetManifest,
    packet_sha256:hashCanonical(packetManifest),
    requirements,
    kill_switch_engaged:true,
    execution_authorized:false
  };
}

export function mapExecutionHandoffPacket(row,{requirements=[]}={}){
  return {
    id:row.id,
    readiness_review_id:row.readiness_review_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_packet_id:row.predecessor_packet_id,
    schema_version:row.schema_version,
    status:row.status,
    packet_sha256:row.packet_sha256,
    packet_manifest:row.packet_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    execution_authorized:Boolean(row.execution_authorized),
    requirements:requirements.map(({control_key,owner_role,required_evidence,required_approver_roles,submission_route_policy,submission_route_status,status,evidence_reference,submitted_at,verified_at})=>({
      control_key,owner_role,required_evidence,required_approver_roles,submission_route_policy,submission_route_status,status,evidence_reference,submitted_at,verified_at
    })),
    created_at:row.created_at
  };
}

export function executionHandoffBoundary(){
  return {
    external_submission_write_enabled:false,
    external_evidence_verification_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'AWAITING_AUTHORIZED_EXTERNAL_EVIDENCE_CHANNELS'
  };
}
