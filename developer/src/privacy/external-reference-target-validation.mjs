import {hashCanonical} from './fulfilment-package.mjs';

export const EXTERNAL_REFERENCE_TARGET_VALIDATION_SCHEMA_VERSION='1.0.0';

export const REFERENCE_TARGET_NORMALIZATION_STEPS=Object.freeze([
  'PARSE_ONCE_WITH_STRICT_URI_GRAMMAR','SCHEME_ASCII_LOWERCASE','AUTHORITY_IDNA_TO_ASCII',
  'AUTHORITY_LOWERCASE_AND_TRAILING_DOT_REMOVAL','DEFAULT_PORT_ELISION',
  'BUCKET_CONTAINER_EXACT_CANONICALIZATION','PATH_PERCENT_DECODE_ONCE_AND_DOT_SEGMENT_REJECTION',
  'REGION_AND_TENANT_EXACT_CANONICALIZATION'
]);

export const REFERENCE_TARGET_REJECTION_RULES=Object.freeze([
  'UNSUPPORTED_OR_EMPTY_SCHEME','WILDCARD_AUTHORITY','USERINFO_PRESENT','IP_LITERAL_AUTHORITY',
  'NON_CANONICAL_IDNA','UNICODE_CONFUSABLE_AUTHORITY','EMPTY_OR_OVERBROAD_BUCKET_CONTAINER',
  'PATH_TRAVERSAL','ENCODED_PATH_SEPARATOR_OR_NUL','UNRESTRICTED_PATH_PREFIX','NON_ALLOWLISTED_PORT',
  'DNS_PRIVATE_OR_SPECIAL_ADDRESS','DNS_REBINDING_OR_MIXED_ADDRESS_SET','CROSS_AUTHORITY_REDIRECT'
]);

export const REFERENCE_TARGET_OWNERSHIP_PROOF_TYPES=Object.freeze([
  'AUTHORITY_CONTROL','BUCKET_OR_CONTAINER_OWNERSHIP','REGION_RESIDENCY',
  'TENANT_OWNERSHIP','DNS_RESOLUTION_SNAPSHOT','EGRESS_POLICY_REVIEW'
]);

export const REFERENCE_TARGET_FORBIDDEN_ADDRESS_CLASSES=Object.freeze([
  'LOOPBACK','PRIVATE','LINK_LOCAL','SHARED_ADDRESS_SPACE',
  'DOCUMENTATION','BENCHMARK','MULTICAST','UNSPECIFIED'
]);

function assertGovernanceContract(governance){
  if(governance?.status!=='SCHEME_GOVERNANCE_ONLY_PROPOSAL_MISSING_EXTERNAL')throw new Error('TARGET_VALIDATION_GOVERNANCE_STATUS_INVALID');
  if(governance.is_latest_governance_contract!==true)throw new Error('TARGET_VALIDATION_GOVERNANCE_SUPERSEDED');
  if(!governance.kill_switch_engaged||governance.connection_authorized||governance.execution_authorized)throw new Error('TARGET_VALIDATION_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(governance.policies)||governance.policies.length!==6)throw new Error('TARGET_VALIDATION_POLICIES_INCOMPLETE');
  for(const policy of governance.policies){
    if(policy.governance_status!=='POLICY_DEFINED_PROPOSAL_MISSING'||policy.proposal_status!=='MISSING_EXTERNAL'||
      policy.current_lifecycle_state!=='NOT_PROPOSED'||policy.target_scope_must_be_exact!==true||
      policy.wildcard_authority_allowed||policy.unrestricted_path_allowed||policy.maximum_validity_seconds!==null||
      policy.proposal_id||policy.proposed_scheme_name||policy.authority_pattern||policy.bucket_or_container||
      policy.path_prefix||policy.region||policy.tenant_reference||policy.allowlist_activation_allowed||
      policy.metadata_submission_allowed||policy.automatic_promotion_allowed){
      throw new Error(`TARGET_VALIDATION_GOVERNANCE_POLICY_INVALID:${policy.control_key}`);
    }
  }
}

export function buildExternalReferenceTargetValidationContract(input){
  assertGovernanceContract(input.governance_contract);
  const rules=input.governance_contract.policies.map((policy)=>({
    control_key:policy.control_key,
    owner_role:policy.owner_role,
    normalization_steps:[...REFERENCE_TARGET_NORMALIZATION_STEPS],
    rejection_rules:[...REFERENCE_TARGET_REJECTION_RULES],
    ownership_proof_types:[...REFERENCE_TARGET_OWNERSHIP_PROOF_TYPES],
    forbidden_address_classes:[...REFERENCE_TARGET_FORBIDDEN_ADDRESS_CLASSES],
    validation_status:'POLICY_DEFINED_TARGET_MISSING',
    target_status:'MISSING_EXTERNAL',
    dns_proof_status:'MISSING_EXTERNAL',
    region_proof_status:'MISSING_EXTERNAL',
    ownership_proof_status:'MISSING_EXTERNAL',
    fail_closed:true,
    single_parse_required:true,
    idna_ascii_required:true,
    unicode_confusable_check_required:true,
    wildcard_allowed:false,
    userinfo_allowed:false,
    ip_literal_allowed:false,
    path_traversal_allowed:false,
    encoded_separator_allowed:false,
    redirect_allowed:false,
    maximum_redirects:0,
    dns_rebinding_guard_required:true,
    private_network_allowed:false,
    port_policy_status:'MISSING_EXTERNAL',
    allowed_ports:[],
    normalized_scheme:null,
    normalized_authority:null,
    normalized_bucket_or_container:null,
    normalized_path_prefix:null,
    normalized_region:null,
    normalized_tenant_reference:null,
    ownership_evidence_reference:null,
    ownership_evidence_sha256:null,
    dns_snapshot_reference:null,
    dns_snapshot_sha256:null,
    validated_at:null,
    proposal_validation_execution_allowed:false,
    dns_lookup_allowed:false,
    external_reference_fetch_allowed:false,
    allowlist_write_allowed:false
  }));
  const contractManifest={
    schema_version:EXTERNAL_REFERENCE_TARGET_VALIDATION_SCHEMA_VERSION,
    contract_id:input.contract_id,
    governance_contract_id:input.governance_contract.id,
    package_manifest_id:input.governance_contract.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'TARGET_VALIDATION_POLICY_ONLY_EXTERNAL_PROOF_MISSING',
    normalization_steps:[...REFERENCE_TARGET_NORMALIZATION_STEPS],
    rejection_rules:[...REFERENCE_TARGET_REJECTION_RULES],
    ownership_proof_types:[...REFERENCE_TARGET_OWNERSHIP_PROOF_TYPES],
    forbidden_address_classes:[...REFERENCE_TARGET_FORBIDDEN_ADDRESS_CLASSES],
    rules,
    kill_switch_engaged:true,
    dns_resolution_authorized:false,
    network_connection_authorized:false,
    execution_authorized:false
  };
  return {
    status:contractManifest.status,
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    rules,
    kill_switch_engaged:true,
    dns_resolution_authorized:false,
    network_connection_authorized:false,
    execution_authorized:false
  };
}

export function mapExternalReferenceTargetValidationContract(row,{rules=[]}={}){
  const booleanFields=[
    'fail_closed','single_parse_required','idna_ascii_required','unicode_confusable_check_required',
    'wildcard_allowed','userinfo_allowed','ip_literal_allowed','path_traversal_allowed',
    'encoded_separator_allowed','redirect_allowed','dns_rebinding_guard_required','private_network_allowed',
    'proposal_validation_execution_allowed','dns_lookup_allowed','external_reference_fetch_allowed','allowlist_write_allowed'
  ];
  return {
    id:row.id,
    governance_contract_id:row.governance_contract_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_contract_id:row.predecessor_contract_id,
    schema_version:row.schema_version,
    status:row.status,
    contract_sha256:row.contract_sha256,
    contract_manifest:row.contract_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    dns_resolution_authorized:Boolean(row.dns_resolution_authorized),
    network_connection_authorized:Boolean(row.network_connection_authorized),
    execution_authorized:Boolean(row.execution_authorized),
    rules:rules.map((rule)=>{
      const mapped={...rule,maximum_redirects:Number(rule.maximum_redirects)};
      for(const field of booleanFields)mapped[field]=Boolean(rule[field]);
      return mapped;
    }),
    created_at:row.created_at
  };
}

export function externalReferenceTargetValidationBoundary(){
  return {
    scheme_proposal_submission_enabled:false,
    target_value_write_enabled:false,
    target_normalization_execution_enabled:false,
    ownership_proof_submission_enabled:false,
    dns_resolution_enabled:false,
    region_lookup_enabled:false,
    redirect_follow_enabled:false,
    reference_scheme_allowlist_write_enabled:false,
    allowlist_activation_enabled:false,
    metadata_submission_enabled:false,
    external_reference_fetch_enabled:false,
    network_connection_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'TARGET_VALIDATION_POLICY_ONLY_EXTERNAL_PROOF_MISSING'
  };
}
