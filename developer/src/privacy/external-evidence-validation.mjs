import {hashCanonical} from './fulfilment-package.mjs';
import {EXECUTION_READINESS_CONTROLS} from './execution-readiness.mjs';

export const EXTERNAL_EVIDENCE_VALIDATION_SCHEMA_VERSION='1.0.0';

export const EVIDENCE_VALIDATION_STATES=Object.freeze([
  'NOT_SUBMITTED','SUBMITTED','UNDER_REVIEW','DUAL_APPROVED','VERIFIED','REJECTED','EXPIRED','REVOKED'
]);

export const EVIDENCE_VALIDATION_TRANSITIONS=Object.freeze([
  ['NOT_SUBMITTED','SUBMITTED'],
  ['SUBMITTED','UNDER_REVIEW'],['SUBMITTED','EXPIRED'],['SUBMITTED','REVOKED'],
  ['UNDER_REVIEW','DUAL_APPROVED'],['UNDER_REVIEW','REJECTED'],['UNDER_REVIEW','EXPIRED'],['UNDER_REVIEW','REVOKED'],
  ['DUAL_APPROVED','VERIFIED'],['DUAL_APPROVED','EXPIRED'],['DUAL_APPROVED','REVOKED'],
  ['VERIFIED','EXPIRED'],['VERIFIED','REVOKED']
].map(([from,to])=>Object.freeze({from,to})));

export const ALLOWED_EVIDENCE_METADATA_FIELDS=Object.freeze([
  'evidence_type','issuer_reference','issued_at','expires_at','sha256','external_storage_reference'
]);

export const FORBIDDEN_EVIDENCE_FIELDS=Object.freeze([
  'raw_content','credential','secret','token','personal_contact','biometric','student_identifier'
]);

const REQUIRED_APPROVER_ROLES=Object.freeze(['PRIVACY_APPROVER','SECURITY_APPROVER']);

export function isEvidenceTransitionAllowed(from,to){
  return EVIDENCE_VALIDATION_TRANSITIONS.some((transition)=>transition.from===from&&transition.to===to);
}

function assertHandoffPacket(packet){
  if(packet?.status!=='AWAITING_EXTERNAL_SUBMISSION')throw new Error('EVIDENCE_VALIDATION_HANDOFF_STATUS_INVALID');
  if(packet.is_latest_handoff_packet!==true)throw new Error('EVIDENCE_VALIDATION_HANDOFF_SUPERSEDED');
  if(!packet.kill_switch_engaged||packet.execution_authorized)throw new Error('EVIDENCE_VALIDATION_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(packet.requirements)||packet.requirements.length!==EXECUTION_READINESS_CONTROLS.length)throw new Error('EVIDENCE_VALIDATION_REQUIREMENTS_INCOMPLETE');
  for(const key of EXECUTION_READINESS_CONTROLS){
    const requirement=packet.requirements.find((item)=>item.control_key===key);
    if(!requirement||requirement.status!=='EXTERNAL_SUBMISSION_REQUIRED'||requirement.submission_route_status!=='MISSING_EXTERNAL'||requirement.evidence_reference||requirement.submitted_at||requirement.verified_at)throw new Error(`EVIDENCE_VALIDATION_REQUIREMENT_INVALID:${key}`);
  }
}

export function buildExternalEvidenceValidationContract(input){
  assertHandoffPacket(input.handoff_packet);
  const rules=input.handoff_packet.requirements.map((requirement)=>({
    control_key:requirement.control_key,
    initial_state:'NOT_SUBMITTED',
    current_status:'AWAITING_EXTERNAL_CHANNEL',
    allowed_evidence_types:[...requirement.required_evidence],
    allowed_metadata_fields:[...ALLOWED_EVIDENCE_METADATA_FIELDS],
    forbidden_fields:[...FORBIDDEN_EVIDENCE_FIELDS],
    state_transitions:EVIDENCE_VALIDATION_TRANSITIONS.map((transition)=>({...transition})),
    required_approver_roles:[...REQUIRED_APPROVER_ROLES],
    distinct_reviewers_required:true,
    self_review_allowed:false,
    expiry_required:true,
    expiry_policy_status:'MISSING_EXTERNAL',
    max_age_seconds:null,
    revocation_check_required:true,
    raw_content_storage_allowed:false,
    submission_channel_status:'MISSING_EXTERNAL'
  }));
  const contractManifest={
    schema_version:EXTERNAL_EVIDENCE_VALIDATION_SCHEMA_VERSION,
    contract_id:input.contract_id,
    handoff_packet_id:input.handoff_packet.id,
    package_manifest_id:input.handoff_packet.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING',
    states:[...EVIDENCE_VALIDATION_STATES],
    transitions:EVIDENCE_VALIDATION_TRANSITIONS.map((transition)=>({...transition})),
    rules,
    kill_switch_engaged:true,
    execution_authorized:false
  };
  return {
    status:'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING',
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    rules,
    kill_switch_engaged:true,
    execution_authorized:false
  };
}

export function mapExternalEvidenceValidationContract(row,{rules=[]}={}){
  return {
    id:row.id,
    handoff_packet_id:row.handoff_packet_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_contract_id:row.predecessor_contract_id,
    schema_version:row.schema_version,
    status:row.status,
    contract_sha256:row.contract_sha256,
    contract_manifest:row.contract_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    execution_authorized:Boolean(row.execution_authorized),
    rules:rules.map(({control_key,initial_state,current_status,allowed_evidence_types,allowed_metadata_fields,forbidden_fields,state_transitions,required_approver_roles,distinct_reviewers_required,self_review_allowed,expiry_required,expiry_policy_status,max_age_seconds,revocation_check_required,raw_content_storage_allowed,submission_channel_status})=>({
      control_key,initial_state,current_status,allowed_evidence_types,allowed_metadata_fields,forbidden_fields,state_transitions,required_approver_roles,
      distinct_reviewers_required:Boolean(distinct_reviewers_required),self_review_allowed:Boolean(self_review_allowed),expiry_required:Boolean(expiry_required),
      expiry_policy_status,max_age_seconds,revocation_check_required:Boolean(revocation_check_required),raw_content_storage_allowed:Boolean(raw_content_storage_allowed),submission_channel_status
    })),
    created_at:row.created_at
  };
}

export function externalEvidenceValidationBoundary(){
  return {
    evidence_submission_enabled:false,
    evidence_state_transition_enabled:false,
    reviewer_decision_write_enabled:false,
    external_storage_read_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'VALIDATION_POLICY_ONLY_EXTERNAL_CHANNEL_MISSING'
  };
}
