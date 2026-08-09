import {hashCanonical} from './fulfilment-package.mjs';

export const EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_SCHEMA_VERSION='1.0.0';

export const REFERENCE_SCHEME_PROPOSAL_REQUIRED_FIELDS=Object.freeze([
  'proposal_id','scheme_name','authority_pattern','bucket_or_container','path_prefix',
  'region','tenant_reference','owner_role','business_justification','requested_valid_until'
]);

export const REFERENCE_TARGET_RESTRICTION_FIELDS=Object.freeze([
  'scheme_name','authority_pattern','bucket_or_container','path_prefix','region','tenant_reference'
]);

export const REFERENCE_SCHEME_LIFECYCLE_STATES=Object.freeze([
  'NOT_PROPOSED','PRIVACY_REVIEW','SECURITY_REVIEW','APPROVED_INACTIVE','ACTIVE','REVOKED','EXPIRED'
]);

export const REFERENCE_SCHEME_REAPPROVAL_TRIGGERS=Object.freeze([
  'SCHEME_CHANGED','AUTHORITY_CHANGED','PATH_SCOPE_CHANGED',
  'CREDENTIAL_ROTATED','OWNERSHIP_CHANGED','POLICY_EXPIRED'
]);

function assertEnvelopeContract(envelope){
  if(envelope?.status!=='ENVELOPE_POLICY_ONLY_ALLOWLIST_APPROVAL_MISSING')throw new Error('SCHEME_GOVERNANCE_ENVELOPE_STATUS_INVALID');
  if(envelope.is_latest_envelope_contract!==true)throw new Error('SCHEME_GOVERNANCE_ENVELOPE_SUPERSEDED');
  if(!envelope.kill_switch_engaged||envelope.connection_authorized||envelope.execution_authorized)throw new Error('SCHEME_GOVERNANCE_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(envelope.rules)||envelope.rules.length!==6)throw new Error('SCHEME_GOVERNANCE_RULES_INCOMPLETE');
  for(const rule of envelope.rules){
    if(rule.envelope_schema_status!=='DEFINED_LOCAL_POLICY'||rule.reference_scheme_allowlist_status!=='MISSING_EXTERNAL_APPROVAL'||
      rule.allowed_reference_schemes?.length!==0||rule.allowlist_approval_steps?.length!==4||rule.allowlist_activation_allowed||
      rule.submission_id_format!=='UUID_V4'||rule.idempotency_retention_status!=='MISSING_EXTERNAL'||rule.idempotency_retention_seconds!==null||
      rule.ingress_validation_mode!=='REJECT_ALL_UNTIL_ALLOWLIST_APPROVED'||rule.submission_acceptance_status!=='NOT_ACCEPTING'||
      rule.submission_id||rule.artifact_reference||rule.artifact_sha256||rule.issuer_reference||rule.submitted_at||
      rule.raw_payload_storage_allowed||rule.credential_material_storage_allowed||rule.secret_material_storage_allowed||rule.automatic_promotion_allowed){
      throw new Error(`SCHEME_GOVERNANCE_RULE_INVALID:${rule.control_key}`);
    }
  }
}

export function buildExternalReferenceSchemeGovernanceContract(input){
  assertEnvelopeContract(input.envelope_contract);
  const policies=input.envelope_contract.rules.map((rule)=>({
    control_key:rule.control_key,
    owner_role:rule.owner_role,
    required_approver_roles:[...rule.required_approver_roles],
    proposal_required_fields:[...REFERENCE_SCHEME_PROPOSAL_REQUIRED_FIELDS],
    target_restriction_fields:[...REFERENCE_TARGET_RESTRICTION_FIELDS],
    lifecycle_states:[...REFERENCE_SCHEME_LIFECYCLE_STATES],
    reapproval_triggers:[...REFERENCE_SCHEME_REAPPROVAL_TRIGGERS],
    governance_status:'POLICY_DEFINED_PROPOSAL_MISSING',
    proposal_status:'MISSING_EXTERNAL',
    current_lifecycle_state:'NOT_PROPOSED',
    approvers_must_be_distinct:true,
    proposer_must_differ_from_approvers:true,
    target_scope_must_be_exact:true,
    wildcard_authority_allowed:false,
    unrestricted_path_allowed:false,
    revocation_required:true,
    expiry_required:true,
    reapproval_required:true,
    maximum_validity_status:'MISSING_EXTERNAL',
    maximum_validity_seconds:null,
    proposal_id:null,
    proposed_scheme_name:null,
    authority_pattern:null,
    bucket_or_container:null,
    path_prefix:null,
    region:null,
    tenant_reference:null,
    proposer_identity_reference:null,
    privacy_reviewer_identity_reference:null,
    security_reviewer_identity_reference:null,
    approved_at:null,
    expires_at:null,
    revoked_at:null,
    allowlist_activation_allowed:false,
    metadata_submission_allowed:false,
    automatic_promotion_allowed:false
  }));
  const contractManifest={
    schema_version:EXTERNAL_REFERENCE_SCHEME_GOVERNANCE_SCHEMA_VERSION,
    contract_id:input.contract_id,
    envelope_contract_id:input.envelope_contract.id,
    package_manifest_id:input.envelope_contract.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'SCHEME_GOVERNANCE_ONLY_PROPOSAL_MISSING_EXTERNAL',
    proposal_required_fields:[...REFERENCE_SCHEME_PROPOSAL_REQUIRED_FIELDS],
    target_restriction_fields:[...REFERENCE_TARGET_RESTRICTION_FIELDS],
    lifecycle_states:[...REFERENCE_SCHEME_LIFECYCLE_STATES],
    reapproval_triggers:[...REFERENCE_SCHEME_REAPPROVAL_TRIGGERS],
    policies,
    kill_switch_engaged:true,
    connection_authorized:false,
    execution_authorized:false
  };
  return {
    status:contractManifest.status,
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    policies,
    kill_switch_engaged:true,
    connection_authorized:false,
    execution_authorized:false
  };
}

export function mapExternalReferenceSchemeGovernanceContract(row,{policies=[]}={}){
  const booleanFields=[
    'approvers_must_be_distinct','proposer_must_differ_from_approvers','target_scope_must_be_exact',
    'wildcard_authority_allowed','unrestricted_path_allowed','revocation_required','expiry_required',
    'reapproval_required','allowlist_activation_allowed','metadata_submission_allowed','automatic_promotion_allowed'
  ];
  return {
    id:row.id,
    envelope_contract_id:row.envelope_contract_id,
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
    policies:policies.map((policy)=>{
      const mapped={...policy};
      for(const field of booleanFields)mapped[field]=Boolean(policy[field]);
      return mapped;
    }),
    created_at:row.created_at
  };
}

export function externalReferenceSchemeGovernanceBoundary(){
  return {
    scheme_proposal_submission_enabled:false,
    scheme_approval_decision_write_enabled:false,
    reference_scheme_allowlist_write_enabled:false,
    allowlist_activation_enabled:false,
    metadata_submission_enabled:false,
    envelope_acceptance_enabled:false,
    external_reference_fetch_enabled:false,
    lifecycle_transition_enabled:false,
    revocation_write_enabled:false,
    reapproval_write_enabled:false,
    automatic_promotion_enabled:false,
    network_connection_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'REFERENCE_SCHEME_GOVERNANCE_ONLY_PROPOSAL_MISSING_EXTERNAL'
  };
}
