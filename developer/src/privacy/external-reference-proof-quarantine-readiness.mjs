import {hashCanonical} from './fulfilment-package.mjs';

export const EXTERNAL_REFERENCE_PROOF_QUARANTINE_READINESS_SCHEMA_VERSION='1.0.0';

export const QUARANTINE_STORAGE_SECURITY_CONTROLS=Object.freeze([
  'ENCRYPTION_AT_REST','DEDICATED_QUARANTINE_NAMESPACE','DENY_PUBLIC_ACCESS',
  'LEAST_PRIVILEGE_SERVICE_IDENTITY','OBJECT_LOCK','INTEGRITY_HASH',
  'NETWORK_EGRESS_DENY','AUDIT_LOG_IMMUTABILITY'
]);

export const QUARANTINE_CONTENT_INSPECTION_STAGES=Object.freeze([
  'MIME_SNIFF','MAGIC_BYTES','EXTENSION_CONSISTENCY','SIZE_LIMIT',
  'ARCHIVE_DEPTH','MACRO_AND_ACTIVE_CONTENT','MALWARE_SCAN','CONTENT_DISARM_POLICY'
]);

export const QUARANTINE_CONTENT_REJECTION_CODES=Object.freeze([
  'CONTENT_TYPE_NOT_ALLOWLISTED','MIME_MAGIC_MISMATCH','EXTENSION_MISMATCH','SIZE_LIMIT_UNDEFINED',
  'ARCHIVE_DEPTH_UNDEFINED','ENCRYPTED_ARCHIVE_FORBIDDEN','ACTIVE_CONTENT_FORBIDDEN','MALWARE_DETECTED',
  'SCANNER_UNAVAILABLE','INTEGRITY_HASH_MISMATCH','STORAGE_POLICY_UNVERIFIED','RETENTION_POLICY_UNVERIFIED'
]);

export const QUARANTINE_RETENTION_LIFECYCLE_EVENTS=Object.freeze([
  'QUARANTINED','SCAN_PENDING','SCAN_PASSED_INACTIVE','SCAN_FAILED',
  'REVIEW_HOLD','RETENTION_EXPIRED','DELETION_ATTESTED'
]);

export const QUARANTINE_AUDIT_REQUIRED_FIELDS=Object.freeze([
  'audit_event_id','request_id','actor_identity_reference','action','object_reference',
  'object_sha256','result','reason_code','occurred_at','previous_event_sha256'
]);

function assertProofIntakeContract(intake){
  if(intake?.status!=='PROOF_INTAKE_POLICY_ONLY_CHANNEL_MISSING_EXTERNAL')throw new Error('QUARANTINE_READINESS_INTAKE_STATUS_INVALID');
  if(intake.is_latest_proof_intake_contract!==true)throw new Error('QUARANTINE_READINESS_INTAKE_SUPERSEDED');
  if(!intake.kill_switch_engaged||intake.proof_intake_authorized||intake.validation_execution_authorized||
    intake.network_connection_authorized||intake.execution_authorized)throw new Error('QUARANTINE_READINESS_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(intake.rules)||intake.rules.length!==6)throw new Error('QUARANTINE_READINESS_RULES_INCOMPLETE');
  for(const rule of intake.rules){
    if(rule.current_state!=='NOT_ACCEPTING'||rule.intake_channel_status!=='MISSING_EXTERNAL'||
      rule.metadata_only!==true||rule.fail_closed!==true||rule.quarantine_required!==true||
      rule.raw_evidence_storage_allowed||rule.credential_material_storage_allowed||rule.secret_material_storage_allowed||
      rule.intake_channel_reference||rule.proof_id||rule.evidence_reference||rule.evidence_sha256||
      rule.received_at||rule.quarantined_at||rule.proof_submission_allowed||rule.quarantine_write_allowed||
      rule.intake_state_transition_allowed||rule.signature_validation_execution_allowed||
      rule.review_decision_write_allowed||rule.quarantine_release_allowed||rule.automatic_activation_allowed){
      throw new Error(`QUARANTINE_READINESS_INTAKE_RULE_INVALID:${rule.control_key}`);
    }
  }
}

export function buildExternalReferenceProofQuarantineReadinessContract(input){
  assertProofIntakeContract(input.proof_intake_contract);
  const requirements=input.proof_intake_contract.rules.map((rule)=>({
    control_key:rule.control_key,
    owner_role:rule.owner_role,
    storage_security_controls:[...QUARANTINE_STORAGE_SECURITY_CONTROLS],
    content_inspection_stages:[...QUARANTINE_CONTENT_INSPECTION_STAGES],
    content_rejection_codes:[...QUARANTINE_CONTENT_REJECTION_CODES],
    retention_lifecycle_events:[...QUARANTINE_RETENTION_LIFECYCLE_EVENTS],
    audit_required_fields:[...QUARANTINE_AUDIT_REQUIRED_FIELDS],
    allowed_content_types:[],
    readiness_status:'POLICY_DEFINED_EXTERNAL_CONTROLS_MISSING',
    storage_status:'MISSING_EXTERNAL',
    scanner_status:'MISSING_EXTERNAL',
    retention_policy_status:'MISSING_EXTERNAL',
    deletion_policy_status:'MISSING_EXTERNAL',
    audit_sink_status:'MISSING_EXTERNAL',
    metadata_only:true,
    fail_closed:true,
    encryption_at_rest_required:true,
    deny_public_access_required:true,
    object_lock_required:true,
    malware_scan_required:true,
    content_type_allowlist_required:true,
    deletion_attestation_required:true,
    immutable_audit_required:true,
    raw_evidence_storage_allowed:false,
    credential_material_storage_allowed:false,
    secret_material_storage_allowed:false,
    maximum_object_bytes:null,
    maximum_archive_depth:null,
    quarantine_retention_seconds:null,
    deletion_sla_seconds:null,
    storage_namespace_reference:null,
    storage_policy_evidence_reference:null,
    storage_policy_evidence_sha256:null,
    scanner_identity_reference:null,
    scanner_policy_reference:null,
    retention_policy_reference:null,
    deletion_policy_reference:null,
    audit_sink_reference:null,
    object_reference:null,
    object_sha256:null,
    scan_result_reference:null,
    deletion_attestation_reference:null,
    stored_at:null,
    scanned_at:null,
    retention_expires_at:null,
    deleted_at:null,
    storage_write_allowed:false,
    content_inspection_execution_allowed:false,
    malware_scan_execution_allowed:false,
    retention_timer_write_allowed:false,
    deletion_execution_allowed:false,
    deletion_attestation_write_allowed:false,
    audit_event_write_allowed:false,
    quarantine_release_allowed:false,
    automatic_promotion_allowed:false
  }));
  const contractManifest={
    schema_version:EXTERNAL_REFERENCE_PROOF_QUARANTINE_READINESS_SCHEMA_VERSION,
    contract_id:input.contract_id,
    proof_intake_contract_id:input.proof_intake_contract.id,
    package_manifest_id:input.proof_intake_contract.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'QUARANTINE_READINESS_POLICY_ONLY_EXTERNAL_CONTROLS_MISSING',
    storage_security_controls:[...QUARANTINE_STORAGE_SECURITY_CONTROLS],
    content_inspection_stages:[...QUARANTINE_CONTENT_INSPECTION_STAGES],
    content_rejection_codes:[...QUARANTINE_CONTENT_REJECTION_CODES],
    retention_lifecycle_events:[...QUARANTINE_RETENTION_LIFECYCLE_EVENTS],
    audit_required_fields:[...QUARANTINE_AUDIT_REQUIRED_FIELDS],
    allowed_content_types:[],
    requirements,
    kill_switch_engaged:true,
    quarantine_storage_authorized:false,
    inspection_execution_authorized:false,
    network_connection_authorized:false,
    execution_authorized:false
  };
  return {
    status:contractManifest.status,
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    requirements,
    kill_switch_engaged:true,
    quarantine_storage_authorized:false,
    inspection_execution_authorized:false,
    network_connection_authorized:false,
    execution_authorized:false
  };
}

export function mapExternalReferenceProofQuarantineReadinessContract(row,{requirements=[]}={}){
  const booleanFields=[
    'metadata_only','fail_closed','encryption_at_rest_required','deny_public_access_required',
    'object_lock_required','malware_scan_required','content_type_allowlist_required',
    'deletion_attestation_required','immutable_audit_required','raw_evidence_storage_allowed',
    'credential_material_storage_allowed','secret_material_storage_allowed','storage_write_allowed',
    'content_inspection_execution_allowed','malware_scan_execution_allowed','retention_timer_write_allowed',
    'deletion_execution_allowed','deletion_attestation_write_allowed','audit_event_write_allowed',
    'quarantine_release_allowed','automatic_promotion_allowed'
  ];
  const numberFields=['maximum_object_bytes','maximum_archive_depth','quarantine_retention_seconds','deletion_sla_seconds'];
  return {
    id:row.id,
    proof_intake_contract_id:row.proof_intake_contract_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_contract_id:row.predecessor_contract_id,
    schema_version:row.schema_version,
    status:row.status,
    contract_sha256:row.contract_sha256,
    contract_manifest:row.contract_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    quarantine_storage_authorized:Boolean(row.quarantine_storage_authorized),
    inspection_execution_authorized:Boolean(row.inspection_execution_authorized),
    network_connection_authorized:Boolean(row.network_connection_authorized),
    execution_authorized:Boolean(row.execution_authorized),
    requirements:requirements.map((requirement)=>{
      const mapped={...requirement};
      for(const field of booleanFields)mapped[field]=Boolean(requirement[field]);
      for(const field of numberFields)mapped[field]=requirement[field]===null?null:Number(requirement[field]);
      return mapped;
    }),
    created_at:row.created_at
  };
}

export function externalReferenceProofQuarantineReadinessBoundary(){
  return {
    proof_upload_enabled:false,
    quarantine_storage_write_enabled:false,
    content_type_allowlist_write_enabled:false,
    content_inspection_execution_enabled:false,
    malware_scan_execution_enabled:false,
    archive_expansion_enabled:false,
    content_disarm_execution_enabled:false,
    retention_timer_write_enabled:false,
    deletion_execution_enabled:false,
    deletion_attestation_write_enabled:false,
    audit_event_write_enabled:false,
    quarantine_release_enabled:false,
    allowlist_activation_enabled:false,
    external_reference_fetch_enabled:false,
    network_connection_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'QUARANTINE_READINESS_POLICY_ONLY_EXTERNAL_CONTROLS_MISSING'
  };
}
