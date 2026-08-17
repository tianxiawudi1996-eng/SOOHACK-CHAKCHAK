import {hashCanonical} from './fulfilment-package.mjs';

export const EXTERNAL_REFERENCE_PROOF_INTAKE_SCHEMA_VERSION='1.0.0';

export const REFERENCE_PROOF_INTAKE_STATES=Object.freeze([
  'NOT_ACCEPTING','RECEIVED_QUARANTINED','DUPLICATE_CHECKED','REPLAY_CHECKED',
  'SIGNATURE_CHECKED','ISSUER_CHECKED','DUAL_REVIEW','ACCEPTED_INACTIVE','REJECTED'
]);

export const REFERENCE_PROOF_INTAKE_TRANSITIONS=Object.freeze([
  'NOT_ACCEPTING->RECEIVED_QUARANTINED',
  'RECEIVED_QUARANTINED->DUPLICATE_CHECKED','RECEIVED_QUARANTINED->REJECTED',
  'DUPLICATE_CHECKED->REPLAY_CHECKED','DUPLICATE_CHECKED->REJECTED',
  'REPLAY_CHECKED->SIGNATURE_CHECKED','REPLAY_CHECKED->REJECTED',
  'SIGNATURE_CHECKED->ISSUER_CHECKED','SIGNATURE_CHECKED->REJECTED',
  'ISSUER_CHECKED->DUAL_REVIEW','ISSUER_CHECKED->REJECTED',
  'DUAL_REVIEW->ACCEPTED_INACTIVE','DUAL_REVIEW->REJECTED',
  'ACCEPTED_INACTIVE->REJECTED'
]);

export const REFERENCE_PROOF_INTAKE_REJECTION_CODES=Object.freeze([
  'CHANNEL_UNAUTHORIZED','METADATA_INCOMPLETE','HASH_MISMATCH','DUPLICATE_PROOF',
  'NONCE_REPLAYED','SIGNATURE_INVALID','SIGNATURE_ALGORITHM_UNAPPROVED','ISSUER_UNTRUSTED',
  'ISSUER_SCOPE_MISMATCH','PROOF_EXPIRED','REVOCATION_STATUS_UNAVAILABLE','DUAL_REVIEW_REJECTED'
]);

export const REFERENCE_PROOF_REPLAY_CONTROLS=Object.freeze([
  'IMMUTABLE_PROOF_ID','EVIDENCE_HASH_DEDUPLICATION','NONCE_UNIQUENESS',
  'ISSUER_AND_TARGET_BINDING','ISSUED_AT_WINDOW','ATOMIC_REPLAY_REGISTRATION'
]);

export const REFERENCE_PROOF_REVIEW_DECISIONS=Object.freeze([
  'APPROVE_INACTIVE','REJECT','REQUEST_REPLACEMENT'
]);

function assertProofHandoffContract(handoff){
  if(handoff?.status!=='PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING')throw new Error('PROOF_INTAKE_HANDOFF_STATUS_INVALID');
  if(handoff.is_latest_proof_handoff_contract!==true)throw new Error('PROOF_INTAKE_HANDOFF_SUPERSEDED');
  if(!handoff.kill_switch_engaged||handoff.proof_intake_authorized||handoff.dns_resolution_authorized||
    handoff.network_connection_authorized||handoff.execution_authorized)throw new Error('PROOF_INTAKE_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(handoff.requirements)||handoff.requirements.length!==6)throw new Error('PROOF_INTAKE_REQUIREMENTS_INCOMPLETE');
  for(const requirement of handoff.requirements){
    if(requirement.handoff_status!=='POLICY_DEFINED_EVIDENCE_MISSING'||requirement.evidence_status!=='MISSING_EXTERNAL'||
      requirement.issuer_trust_status!=='MISSING_EXTERNAL'||requirement.metadata_only!==true||
      requirement.signature_required!==true||requirement.revocation_check_required!==true||
      requirement.raw_evidence_storage_allowed||requirement.credential_material_storage_allowed||
      requirement.secret_material_storage_allowed||requirement.proof_id||requirement.evidence_reference||
      requirement.evidence_sha256||requirement.signature_reference||requirement.issuer_identity_reference||
      requirement.handoff_submission_allowed||requirement.proof_validation_execution_allowed||
      requirement.allowlist_write_allowed||requirement.automatic_promotion_allowed){
      throw new Error(`PROOF_INTAKE_HANDOFF_REQUIREMENT_INVALID:${requirement.control_key}`);
    }
  }
}

export function buildExternalReferenceProofIntakeContract(input){
  assertProofHandoffContract(input.proof_handoff_contract);
  const rules=input.proof_handoff_contract.requirements.map((requirement)=>({
    control_key:requirement.control_key,
    owner_role:requirement.owner_role,
    intake_states:[...REFERENCE_PROOF_INTAKE_STATES],
    allowed_transitions:[...REFERENCE_PROOF_INTAKE_TRANSITIONS],
    rejection_codes:[...REFERENCE_PROOF_INTAKE_REJECTION_CODES],
    replay_controls:[...REFERENCE_PROOF_REPLAY_CONTROLS],
    review_decisions:[...REFERENCE_PROOF_REVIEW_DECISIONS],
    current_state:'NOT_ACCEPTING',
    intake_channel_status:'MISSING_EXTERNAL',
    quarantine_policy_status:'POLICY_DEFINED_CHANNEL_MISSING',
    duplicate_policy_status:'POLICY_DEFINED_EXECUTION_DISABLED',
    replay_policy_status:'POLICY_DEFINED_EXECUTION_DISABLED',
    signature_policy_status:'POLICY_DEFINED_EXECUTION_DISABLED',
    issuer_policy_status:'POLICY_DEFINED_EXECUTION_DISABLED',
    dual_review_policy_status:'POLICY_DEFINED_REVIEWERS_MISSING',
    metadata_only:true,
    fail_closed:true,
    quarantine_required:true,
    duplicate_check_required:true,
    replay_check_required:true,
    signature_check_required:true,
    issuer_check_required:true,
    two_distinct_reviewers_required:true,
    raw_evidence_storage_allowed:false,
    credential_material_storage_allowed:false,
    secret_material_storage_allowed:false,
    quarantine_retention_seconds:null,
    replay_window_seconds:null,
    review_sla_seconds:null,
    intake_channel_reference:null,
    proof_id:null,
    evidence_reference:null,
    evidence_sha256:null,
    signature_reference:null,
    issuer_identity_reference:null,
    nonce:null,
    duplicate_fingerprint:null,
    replay_registration_reference:null,
    first_reviewer_identity_reference:null,
    second_reviewer_identity_reference:null,
    first_review_decision:null,
    second_review_decision:null,
    received_at:null,
    quarantined_at:null,
    reviewed_at:null,
    accepted_at:null,
    rejected_at:null,
    proof_submission_allowed:false,
    quarantine_write_allowed:false,
    intake_state_transition_allowed:false,
    duplicate_check_execution_allowed:false,
    replay_check_execution_allowed:false,
    signature_validation_execution_allowed:false,
    issuer_validation_execution_allowed:false,
    review_decision_write_allowed:false,
    quarantine_release_allowed:false,
    allowlist_write_allowed:false,
    automatic_activation_allowed:false
  }));
  const contractManifest={
    schema_version:EXTERNAL_REFERENCE_PROOF_INTAKE_SCHEMA_VERSION,
    contract_id:input.contract_id,
    proof_handoff_contract_id:input.proof_handoff_contract.id,
    package_manifest_id:input.proof_handoff_contract.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'PROOF_INTAKE_POLICY_ONLY_CHANNEL_MISSING_EXTERNAL',
    intake_states:[...REFERENCE_PROOF_INTAKE_STATES],
    allowed_transitions:[...REFERENCE_PROOF_INTAKE_TRANSITIONS],
    rejection_codes:[...REFERENCE_PROOF_INTAKE_REJECTION_CODES],
    replay_controls:[...REFERENCE_PROOF_REPLAY_CONTROLS],
    review_decisions:[...REFERENCE_PROOF_REVIEW_DECISIONS],
    rules,
    kill_switch_engaged:true,
    proof_intake_authorized:false,
    validation_execution_authorized:false,
    network_connection_authorized:false,
    execution_authorized:false
  };
  return {
    status:contractManifest.status,
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    rules,
    kill_switch_engaged:true,
    proof_intake_authorized:false,
    validation_execution_authorized:false,
    network_connection_authorized:false,
    execution_authorized:false
  };
}

export function mapExternalReferenceProofIntakeContract(row,{rules=[]}={}){
  const booleanFields=[
    'metadata_only','fail_closed','quarantine_required','duplicate_check_required','replay_check_required',
    'signature_check_required','issuer_check_required','two_distinct_reviewers_required',
    'raw_evidence_storage_allowed','credential_material_storage_allowed','secret_material_storage_allowed',
    'proof_submission_allowed','quarantine_write_allowed','intake_state_transition_allowed',
    'duplicate_check_execution_allowed','replay_check_execution_allowed','signature_validation_execution_allowed',
    'issuer_validation_execution_allowed','review_decision_write_allowed','quarantine_release_allowed',
    'allowlist_write_allowed','automatic_activation_allowed'
  ];
  const numberFields=['quarantine_retention_seconds','replay_window_seconds','review_sla_seconds'];
  return {
    id:row.id,
    proof_handoff_contract_id:row.proof_handoff_contract_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_contract_id:row.predecessor_contract_id,
    schema_version:row.schema_version,
    status:row.status,
    contract_sha256:row.contract_sha256,
    contract_manifest:row.contract_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    proof_intake_authorized:Boolean(row.proof_intake_authorized),
    validation_execution_authorized:Boolean(row.validation_execution_authorized),
    network_connection_authorized:Boolean(row.network_connection_authorized),
    execution_authorized:Boolean(row.execution_authorized),
    rules:rules.map((rule)=>{
      const mapped={...rule};
      for(const field of booleanFields)mapped[field]=Boolean(rule[field]);
      for(const field of numberFields)mapped[field]=rule[field]===null?null:Number(rule[field]);
      return mapped;
    }),
    created_at:row.created_at
  };
}

export function externalReferenceProofIntakeBoundary(){
  return {
    proof_submission_enabled:false,
    intake_channel_enabled:false,
    quarantine_write_enabled:false,
    intake_state_transition_enabled:false,
    duplicate_check_execution_enabled:false,
    replay_check_execution_enabled:false,
    signature_validation_execution_enabled:false,
    issuer_validation_execution_enabled:false,
    review_decision_write_enabled:false,
    quarantine_release_enabled:false,
    allowlist_write_enabled:false,
    allowlist_activation_enabled:false,
    external_reference_fetch_enabled:false,
    network_connection_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'PROOF_INTAKE_POLICY_ONLY_CHANNEL_MISSING_EXTERNAL'
  };
}
