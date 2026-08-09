import {hashCanonical} from './fulfilment-package.mjs';

export const EXTERNAL_REFERENCE_PROOF_HANDOFF_SCHEMA_VERSION='1.0.0';

export const REFERENCE_PROOF_REQUIRED_FIELDS=Object.freeze([
  'proof_id','proof_type','target_scope_reference','issuer_identity_reference','issued_at','expires_at',
  'evidence_reference','evidence_sha256','signature_reference','signature_algorithm',
  'revocation_endpoint_reference','nonce'
]);

export const REFERENCE_PROOF_ISSUER_TRUST_REQUIREMENTS=Object.freeze([
  'ISSUER_IDENTITY_VERIFIED','ISSUER_AUTHORITY_BOUND_TO_TARGET','TRUST_ANCHOR_APPROVED',
  'SIGNING_KEY_ACTIVE','SIGNATURE_ALGORITHM_APPROVED','CERTIFICATE_CHAIN_VALID',
  'REVOCATION_STATUS_CURRENT','SEPARATE_REVIEWER_APPROVED'
]);

export const REFERENCE_PROOF_LIFECYCLE_STATES=Object.freeze([
  'NOT_SUBMITTED','RECEIVED_QUARANTINED','ISSUER_VERIFIED','INTEGRITY_VERIFIED',
  'ACCEPTED_INACTIVE','REVOKED','EXPIRED'
]);

export const REFERENCE_PROOF_REVALIDATION_TRIGGERS=Object.freeze([
  'PROOF_TTL_EXPIRED','ISSUER_KEY_ROTATED','TRUST_ANCHOR_CHANGED','TARGET_SCOPE_CHANGED',
  'DNS_ANSWER_CHANGED','REGION_CHANGED','REVOCATION_EVENT_RECEIVED','VALIDATION_POLICY_REVISED'
]);

export const REFERENCE_DNS_SNAPSHOT_REQUIRED_FIELDS=Object.freeze([
  'snapshot_id','captured_at','resolver_identity_reference','query_name',
  'record_types','canonical_answer_set_sha256','ttl_seconds','region'
]);

function assertTargetValidationContract(validation){
  if(validation?.status!=='TARGET_VALIDATION_POLICY_ONLY_EXTERNAL_PROOF_MISSING')throw new Error('PROOF_HANDOFF_TARGET_VALIDATION_STATUS_INVALID');
  if(validation.is_latest_target_validation_contract!==true)throw new Error('PROOF_HANDOFF_TARGET_VALIDATION_SUPERSEDED');
  if(!validation.kill_switch_engaged||validation.dns_resolution_authorized||validation.network_connection_authorized||validation.execution_authorized)throw new Error('PROOF_HANDOFF_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(validation.rules)||validation.rules.length!==6)throw new Error('PROOF_HANDOFF_RULES_INCOMPLETE');
  for(const rule of validation.rules){
    if(rule.validation_status!=='POLICY_DEFINED_TARGET_MISSING'||rule.target_status!=='MISSING_EXTERNAL'||
      rule.dns_proof_status!=='MISSING_EXTERNAL'||rule.region_proof_status!=='MISSING_EXTERNAL'||
      rule.ownership_proof_status!=='MISSING_EXTERNAL'||rule.fail_closed!==true||rule.allowed_ports?.length!==0||
      rule.normalized_scheme||rule.normalized_authority||rule.normalized_bucket_or_container||rule.normalized_path_prefix||
      rule.normalized_region||rule.normalized_tenant_reference||rule.ownership_evidence_reference||
      rule.ownership_evidence_sha256||rule.dns_snapshot_reference||rule.dns_snapshot_sha256||rule.validated_at||
      rule.proposal_validation_execution_allowed||rule.dns_lookup_allowed||rule.external_reference_fetch_allowed||rule.allowlist_write_allowed){
      throw new Error(`PROOF_HANDOFF_TARGET_VALIDATION_RULE_INVALID:${rule.control_key}`);
    }
  }
}

export function buildExternalReferenceProofHandoffContract(input){
  assertTargetValidationContract(input.target_validation_contract);
  const requirements=input.target_validation_contract.rules.map((rule)=>({
    control_key:rule.control_key,
    owner_role:rule.owner_role,
    proof_required_fields:[...REFERENCE_PROOF_REQUIRED_FIELDS],
    issuer_trust_requirements:[...REFERENCE_PROOF_ISSUER_TRUST_REQUIREMENTS],
    lifecycle_states:[...REFERENCE_PROOF_LIFECYCLE_STATES],
    revalidation_triggers:[...REFERENCE_PROOF_REVALIDATION_TRIGGERS],
    dns_snapshot_required_fields:[...REFERENCE_DNS_SNAPSHOT_REQUIRED_FIELDS],
    handoff_status:'POLICY_DEFINED_EVIDENCE_MISSING',
    evidence_status:'MISSING_EXTERNAL',
    issuer_trust_status:'MISSING_EXTERNAL',
    dns_snapshot_status:'MISSING_EXTERNAL',
    ttl_policy_status:'MISSING_EXTERNAL',
    revocation_channel_status:'MISSING_EXTERNAL',
    revalidation_sla_status:'MISSING_EXTERNAL',
    metadata_only:true,
    immutable_reference_required:true,
    signature_required:true,
    expiry_required:true,
    revocation_check_required:true,
    issuer_must_differ_from_reviewer:true,
    raw_evidence_storage_allowed:false,
    credential_material_storage_allowed:false,
    secret_material_storage_allowed:false,
    maximum_proof_ttl_seconds:null,
    minimum_dns_ttl_seconds:null,
    revalidation_sla_seconds:null,
    revocation_poll_interval_seconds:null,
    proof_id:null,
    proof_type:null,
    target_scope_reference:null,
    issuer_identity_reference:null,
    evidence_reference:null,
    evidence_sha256:null,
    signature_reference:null,
    signature_algorithm:null,
    revocation_endpoint_reference:null,
    nonce:null,
    dns_snapshot_reference:null,
    dns_snapshot_sha256:null,
    issued_at:null,
    expires_at:null,
    received_at:null,
    verified_at:null,
    revoked_at:null,
    handoff_submission_allowed:false,
    proof_validation_execution_allowed:false,
    dns_snapshot_capture_allowed:false,
    revocation_polling_allowed:false,
    allowlist_write_allowed:false,
    automatic_promotion_allowed:false
  }));
  const contractManifest={
    schema_version:EXTERNAL_REFERENCE_PROOF_HANDOFF_SCHEMA_VERSION,
    contract_id:input.contract_id,
    target_validation_contract_id:input.target_validation_contract.id,
    package_manifest_id:input.target_validation_contract.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING',
    proof_required_fields:[...REFERENCE_PROOF_REQUIRED_FIELDS],
    issuer_trust_requirements:[...REFERENCE_PROOF_ISSUER_TRUST_REQUIREMENTS],
    lifecycle_states:[...REFERENCE_PROOF_LIFECYCLE_STATES],
    revalidation_triggers:[...REFERENCE_PROOF_REVALIDATION_TRIGGERS],
    dns_snapshot_required_fields:[...REFERENCE_DNS_SNAPSHOT_REQUIRED_FIELDS],
    requirements,
    kill_switch_engaged:true,
    proof_intake_authorized:false,
    dns_resolution_authorized:false,
    network_connection_authorized:false,
    execution_authorized:false
  };
  return {
    status:contractManifest.status,
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    requirements,
    kill_switch_engaged:true,
    proof_intake_authorized:false,
    dns_resolution_authorized:false,
    network_connection_authorized:false,
    execution_authorized:false
  };
}

export function mapExternalReferenceProofHandoffContract(row,{requirements=[]}={}){
  const booleanFields=[
    'metadata_only','immutable_reference_required','signature_required','expiry_required',
    'revocation_check_required','issuer_must_differ_from_reviewer','raw_evidence_storage_allowed',
    'credential_material_storage_allowed','secret_material_storage_allowed','handoff_submission_allowed',
    'proof_validation_execution_allowed','dns_snapshot_capture_allowed','revocation_polling_allowed',
    'allowlist_write_allowed','automatic_promotion_allowed'
  ];
  const numberFields=['maximum_proof_ttl_seconds','minimum_dns_ttl_seconds','revalidation_sla_seconds','revocation_poll_interval_seconds'];
  return {
    id:row.id,
    target_validation_contract_id:row.target_validation_contract_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_contract_id:row.predecessor_contract_id,
    schema_version:row.schema_version,
    status:row.status,
    contract_sha256:row.contract_sha256,
    contract_manifest:row.contract_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    proof_intake_authorized:Boolean(row.proof_intake_authorized),
    dns_resolution_authorized:Boolean(row.dns_resolution_authorized),
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

export function externalReferenceProofHandoffBoundary(){
  return {
    target_value_write_enabled:false,
    proof_handoff_submission_enabled:false,
    proof_metadata_write_enabled:false,
    issuer_trust_decision_write_enabled:false,
    proof_validation_execution_enabled:false,
    dns_snapshot_capture_enabled:false,
    dns_resolution_enabled:false,
    revocation_event_ingest_enabled:false,
    revocation_polling_enabled:false,
    revalidation_transition_enabled:false,
    reference_scheme_allowlist_write_enabled:false,
    allowlist_activation_enabled:false,
    external_reference_fetch_enabled:false,
    network_connection_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'PROOF_HANDOFF_ONLY_EXTERNAL_EVIDENCE_MISSING'
  };
}
