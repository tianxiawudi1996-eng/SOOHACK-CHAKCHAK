import {hashCanonical} from './fulfilment-package.mjs';

export const EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_SCHEMA_VERSION='1.0.0';

export const SUBMISSION_ENVELOPE_REQUIRED_FIELDS=Object.freeze([
  'schema_version','submission_id','queue_contract_id','control_key','evidence_type',
  'artifact_reference','artifact_sha256','issuer_reference','issued_at','expires_at'
]);

export const REFERENCE_SCHEME_APPROVAL_STEPS=Object.freeze([
  'SCHEME_PROPOSAL','PRIVACY_REVIEW','SECURITY_REVIEW','ACTIVATION_APPROVAL'
]);

export const SUBMISSION_REJECTION_REASON_CODES=Object.freeze([
  'ENVELOPE_SCHEMA_INVALID','SUBMISSION_ID_INVALID','SUBMISSION_ID_REPLAY_MISMATCH',
  'CONTROL_KEY_UNKNOWN','EVIDENCE_TYPE_NOT_ALLOWED','REFERENCE_SCHEME_NOT_ALLOWED',
  'IMMUTABLE_REFERENCE_REQUIRED','SHA256_INVALID','ISSUER_PROVENANCE_REQUIRED',
  'TIMESTAMP_POLICY_UNAVAILABLE'
]);

function assertQueueContract(queue){
  if(queue?.status!=='QUEUE_CONTRACT_ONLY_EXTERNAL_SUBMISSION_MISSING')throw new Error('SUBMISSION_POLICY_QUEUE_STATUS_INVALID');
  if(queue.is_latest_queue_contract!==true)throw new Error('SUBMISSION_POLICY_QUEUE_SUPERSEDED');
  if(!queue.kill_switch_engaged||queue.connection_authorized||queue.execution_authorized)throw new Error('SUBMISSION_POLICY_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(queue.slots)||queue.slots.length!==6)throw new Error('SUBMISSION_POLICY_SLOTS_INCOMPLETE');
  for(const slot of queue.slots){
    if(slot.queue_status!=='AWAITING_EXTERNAL_SUBMISSION_CHANNEL'||slot.submission_channel_status!=='MISSING_EXTERNAL'||
      slot.reference_policy_status!=='MISSING_EXTERNAL'||slot.allowed_reference_schemes?.length!==0||
      !slot.immutable_reference_required||!slot.sha256_required||!slot.issuer_provenance_required||!slot.duplicate_guard_required||
      slot.artifact_reference||slot.artifact_sha256||slot.submission_id||slot.queue_entry_id||slot.submitted_at||
      slot.validation_status!=='NOT_SUBMITTED'||slot.review_ttl_policy_status!=='MISSING_EXTERNAL'||slot.review_ttl_seconds!==null||
      slot.raw_payload_storage_allowed||slot.credential_material_storage_allowed||slot.secret_material_storage_allowed||slot.automatic_promotion_allowed){
      throw new Error(`SUBMISSION_POLICY_SLOT_INVALID:${slot.control_key}`);
    }
  }
}

export function buildExternalEvidenceSubmissionEnvelopeContract(input){
  assertQueueContract(input.queue_contract);
  const rules=input.queue_contract.slots.map((slot)=>({
    control_key:slot.control_key,
    owner_role:slot.owner_role,
    allowed_evidence_types:[...slot.allowed_evidence_types],
    required_approver_roles:[...slot.required_approver_roles],
    required_envelope_fields:[...SUBMISSION_ENVELOPE_REQUIRED_FIELDS],
    envelope_schema_status:'DEFINED_LOCAL_POLICY',
    reference_scheme_allowlist_status:'MISSING_EXTERNAL_APPROVAL',
    allowed_reference_schemes:[],
    allowlist_approval_steps:[...REFERENCE_SCHEME_APPROVAL_STEPS],
    allowlist_activation_allowed:false,
    submission_id_format:'UUID_V4',
    idempotency_scope:'QUEUE_CONTRACT_CONTROL_KEY_SUBMISSION_ID',
    idempotency_retention_status:'MISSING_EXTERNAL',
    idempotency_retention_seconds:null,
    rejection_reason_codes:[...SUBMISSION_REJECTION_REASON_CODES],
    ingress_validation_mode:'REJECT_ALL_UNTIL_ALLOWLIST_APPROVED',
    submission_acceptance_status:'NOT_ACCEPTING',
    submission_id:null,
    artifact_reference:null,
    artifact_sha256:null,
    issuer_reference:null,
    submitted_at:null,
    raw_payload_storage_allowed:false,
    credential_material_storage_allowed:false,
    secret_material_storage_allowed:false,
    automatic_promotion_allowed:false
  }));
  const contractManifest={
    schema_version:EXTERNAL_EVIDENCE_SUBMISSION_ENVELOPE_SCHEMA_VERSION,
    contract_id:input.contract_id,
    queue_contract_id:input.queue_contract.id,
    package_manifest_id:input.queue_contract.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'ENVELOPE_POLICY_ONLY_ALLOWLIST_APPROVAL_MISSING',
    required_envelope_fields:[...SUBMISSION_ENVELOPE_REQUIRED_FIELDS],
    reference_scheme_approval_steps:[...REFERENCE_SCHEME_APPROVAL_STEPS],
    rejection_reason_codes:[...SUBMISSION_REJECTION_REASON_CODES],
    rules,
    kill_switch_engaged:true,
    connection_authorized:false,
    execution_authorized:false
  };
  return {
    status:contractManifest.status,
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    rules,
    kill_switch_engaged:true,
    connection_authorized:false,
    execution_authorized:false
  };
}

export function mapExternalEvidenceSubmissionEnvelopeContract(row,{rules=[]}={}){
  return {
    id:row.id,
    queue_contract_id:row.queue_contract_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_contract_id:row.predecessor_contract_id,
    schema_version:row.schema_version,
    status:row.status,
    contract_sha256:row.contract_sha256,
    contract_manifest:row.contract_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    connection_authorized:Boolean(row.connection_authorized),
    execution_authorized:Boolean(row.execution_authorized),
    rules:rules.map((rule)=>({
      ...rule,
      allowlist_activation_allowed:Boolean(rule.allowlist_activation_allowed),
      raw_payload_storage_allowed:Boolean(rule.raw_payload_storage_allowed),
      credential_material_storage_allowed:Boolean(rule.credential_material_storage_allowed),
      secret_material_storage_allowed:Boolean(rule.secret_material_storage_allowed),
      automatic_promotion_allowed:Boolean(rule.automatic_promotion_allowed)
    })),
    created_at:row.created_at
  };
}

export function externalEvidenceSubmissionEnvelopeBoundary(){
  return {
    metadata_submission_enabled:false,
    envelope_acceptance_enabled:false,
    reference_scheme_allowlist_write_enabled:false,
    allowlist_activation_enabled:false,
    external_reference_fetch_enabled:false,
    queue_transition_enabled:false,
    validation_decision_write_enabled:false,
    approval_decision_write_enabled:false,
    automatic_promotion_enabled:false,
    raw_payload_write_enabled:false,
    credential_material_write_enabled:false,
    secret_material_write_enabled:false,
    network_connection_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'SUBMISSION_ENVELOPE_POLICY_ONLY_ALLOWLIST_APPROVAL_MISSING'
  };
}
