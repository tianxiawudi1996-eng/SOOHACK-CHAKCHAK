import {hashCanonical} from './fulfilment-package.mjs';

export const EXTERNAL_REFERENCE_PROOF_SCANNER_READINESS_SCHEMA_VERSION='1.0.0';

export const SCANNER_TRUST_REQUIREMENTS=Object.freeze([
  'SCANNER_IDENTITY_VERIFIED','TRUST_ANCHOR_APPROVED','SERVICE_CERTIFICATE_ACTIVE',
  'ENGINE_BINARY_ATTESTED','ENGINE_VERSION_SUPPORTED','SIGNATURE_SOURCE_AUTHENTICATED',
  'NETWORK_ISOLATION_VERIFIED','SEPARATE_SECURITY_REVIEW'
]);

export const SCANNER_SIGNATURE_FRESHNESS_CONTROLS=Object.freeze([
  'SIGNED_DATABASE_ONLY','DATABASE_VERSION_MONOTONIC','MAXIMUM_SIGNATURE_AGE',
  'UPDATE_SOURCE_PINNED','ROLLBACK_PROTECTED','UPDATE_FAILURE_FAIL_CLOSED',
  'FRESHNESS_RECHECK_BEFORE_SCAN'
]);

export const SCANNER_EXECUTION_STAGES=Object.freeze([
  'PRECONDITION_CHECK','OBJECT_HASH_VERIFY','ENGINE_IDENTITY_VERIFY',
  'SIGNATURE_FRESHNESS_VERIFY','ISOLATED_SCAN','SECONDARY_ENGINE_SCAN',
  'RESULT_RECONCILIATION','ATTESTATION_SEAL','RELEASE_DECISION_PENDING'
]);

export const SCANNER_FAILURE_POLICIES=Object.freeze([
  'TIMEOUT_FAIL_CLOSED','ENGINE_UNAVAILABLE_FAIL_CLOSED','SIGNATURE_STALE_FAIL_CLOSED',
  'HASH_MISMATCH_REJECT','ENGINE_DISAGREEMENT_REVIEW','RETRY_BOUNDED',
  'FAILOVER_APPROVED_ONLY','PARTIAL_RESULT_REJECT','ATTESTATION_REQUIRED','NO_AUTOMATIC_RELEASE'
]);

export const SCANNER_ATTESTATION_REQUIRED_FIELDS=Object.freeze([
  'attestation_id','object_reference','object_sha256','scanner_identity_reference',
  'engine_name','engine_version','signature_database_version','signature_database_updated_at',
  'scan_started_at','scan_completed_at','result','attestation_sha256'
]);

function assertQuarantineReadinessContract(contract){
  if(contract?.status!=='QUARANTINE_READINESS_POLICY_ONLY_EXTERNAL_CONTROLS_MISSING')throw new Error('SCANNER_READINESS_QUARANTINE_STATUS_INVALID');
  if(contract.is_latest_quarantine_readiness_contract!==true)throw new Error('SCANNER_READINESS_QUARANTINE_SUPERSEDED');
  if(!contract.kill_switch_engaged||contract.quarantine_storage_authorized||contract.inspection_execution_authorized||
    contract.network_connection_authorized||contract.execution_authorized)throw new Error('SCANNER_READINESS_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(contract.requirements)||contract.requirements.length!==6)throw new Error('SCANNER_READINESS_REQUIREMENTS_INCOMPLETE');
  for(const requirement of contract.requirements){
    if(requirement.readiness_status!=='POLICY_DEFINED_EXTERNAL_CONTROLS_MISSING'||
      requirement.storage_status!=='MISSING_EXTERNAL'||requirement.scanner_status!=='MISSING_EXTERNAL'||
      !requirement.metadata_only||!requirement.fail_closed||!requirement.malware_scan_required||
      requirement.raw_evidence_storage_allowed||requirement.credential_material_storage_allowed||
      requirement.secret_material_storage_allowed||requirement.object_reference||requirement.object_sha256||
      requirement.scan_result_reference||requirement.storage_write_allowed||
      requirement.content_inspection_execution_allowed||requirement.malware_scan_execution_allowed||
      requirement.quarantine_release_allowed||requirement.automatic_promotion_allowed){
      throw new Error(`SCANNER_READINESS_QUARANTINE_REQUIREMENT_INVALID:${requirement.control_key}`);
    }
  }
}

export function buildExternalReferenceProofScannerReadinessContract(input){
  assertQuarantineReadinessContract(input.quarantine_readiness_contract);
  const requirements=input.quarantine_readiness_contract.requirements.map((source)=>(
    {
      control_key:source.control_key,owner_role:source.owner_role,
      trust_requirements:[...SCANNER_TRUST_REQUIREMENTS],
      signature_freshness_controls:[...SCANNER_SIGNATURE_FRESHNESS_CONTROLS],
      execution_stages:[...SCANNER_EXECUTION_STAGES],failure_policies:[...SCANNER_FAILURE_POLICIES],
      attestation_required_fields:[...SCANNER_ATTESTATION_REQUIRED_FIELDS],approved_scanner_engines:[],
      readiness_status:'POLICY_DEFINED_EXTERNAL_SCANNER_MISSING',scanner_identity_status:'MISSING_EXTERNAL',
      trust_anchor_status:'MISSING_EXTERNAL',engine_attestation_status:'MISSING_EXTERNAL',
      signature_database_status:'MISSING_EXTERNAL',isolation_status:'MISSING_EXTERNAL',
      secondary_engine_status:'MISSING_EXTERNAL',attestation_sink_status:'MISSING_EXTERNAL',
      metadata_only:true,fail_closed:true,trust_anchor_required:true,signature_freshness_required:true,
      isolated_execution_required:true,multiple_engine_required:true,bounded_retry_required:true,
      timeout_required:true,attestation_required:true,
      raw_evidence_storage_allowed:false,credential_material_storage_allowed:false,secret_material_storage_allowed:false,
      maximum_signature_age_seconds:null,scan_timeout_seconds:null,maximum_retries:null,minimum_independent_engines:null,
      scanner_identity_reference:null,trust_anchor_reference:null,engine_binary_attestation_reference:null,
      engine_name:null,engine_version:null,signature_database_version:null,signature_database_updated_at:null,
      isolation_policy_reference:null,secondary_scanner_identity_reference:null,attestation_sink_reference:null,
      object_reference:null,object_sha256:null,scan_result:null,scan_result_reference:null,attestation_reference:null,
      scan_started_at:null,scan_completed_at:null,
      object_read_allowed:false,engine_identity_validation_allowed:false,signature_update_allowed:false,
      scan_execution_allowed:false,retry_execution_allowed:false,failover_execution_allowed:false,
      attestation_write_allowed:false,result_reconciliation_allowed:false,release_decision_write_allowed:false,
      quarantine_release_allowed:false,automatic_promotion_allowed:false
    }
  ));
  const contractManifest={
    schema_version:EXTERNAL_REFERENCE_PROOF_SCANNER_READINESS_SCHEMA_VERSION,contract_id:input.contract_id,
    quarantine_readiness_contract_id:input.quarantine_readiness_contract.id,
    package_manifest_id:input.quarantine_readiness_contract.package_manifest_id,revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'SCANNER_READINESS_POLICY_ONLY_EXTERNAL_ATTESTATION_MISSING',
    trust_requirements:[...SCANNER_TRUST_REQUIREMENTS],
    signature_freshness_controls:[...SCANNER_SIGNATURE_FRESHNESS_CONTROLS],
    execution_stages:[...SCANNER_EXECUTION_STAGES],failure_policies:[...SCANNER_FAILURE_POLICIES],
    attestation_required_fields:[...SCANNER_ATTESTATION_REQUIRED_FIELDS],approved_scanner_engines:[],requirements,
    kill_switch_engaged:true,scanner_execution_authorized:false,attestation_write_authorized:false,
    network_connection_authorized:false,execution_authorized:false
  };
  return {...contractManifest,contract_manifest:contractManifest,contract_sha256:hashCanonical(contractManifest)};
}

export function mapExternalReferenceProofScannerReadinessContract(row,{requirements=[]}={}){
  const booleanFields=['metadata_only','fail_closed','trust_anchor_required','signature_freshness_required',
    'isolated_execution_required','multiple_engine_required','bounded_retry_required','timeout_required',
    'attestation_required','raw_evidence_storage_allowed','credential_material_storage_allowed','secret_material_storage_allowed',
    'object_read_allowed','engine_identity_validation_allowed','signature_update_allowed','scan_execution_allowed',
    'retry_execution_allowed','failover_execution_allowed','attestation_write_allowed','result_reconciliation_allowed',
    'release_decision_write_allowed','quarantine_release_allowed','automatic_promotion_allowed'];
  const numberFields=['maximum_signature_age_seconds','scan_timeout_seconds','maximum_retries','minimum_independent_engines'];
  return {
    id:row.id,quarantine_readiness_contract_id:row.quarantine_readiness_contract_id,
    package_manifest_id:row.package_manifest_id,revision:Number(row.revision),
    predecessor_contract_id:row.predecessor_contract_id,schema_version:row.schema_version,status:row.status,
    contract_sha256:row.contract_sha256,contract_manifest:row.contract_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),scanner_execution_authorized:Boolean(row.scanner_execution_authorized),
    attestation_write_authorized:Boolean(row.attestation_write_authorized),
    network_connection_authorized:Boolean(row.network_connection_authorized),execution_authorized:Boolean(row.execution_authorized),
    requirements:requirements.map((requirement)=>{
      const mapped={...requirement};
      for(const field of booleanFields)mapped[field]=Boolean(requirement[field]);
      for(const field of numberFields)mapped[field]=requirement[field]===null?null:Number(requirement[field]);
      return mapped;
    }),created_at:row.created_at
  };
}

export function externalReferenceProofScannerReadinessBoundary(){
  return {
    object_read_enabled:false,scanner_identity_validation_enabled:false,signature_database_update_enabled:false,
    signature_freshness_validation_enabled:false,primary_scan_execution_enabled:false,
    secondary_scan_execution_enabled:false,retry_execution_enabled:false,failover_execution_enabled:false,
    result_reconciliation_enabled:false,attestation_write_enabled:false,release_decision_write_enabled:false,
    quarantine_release_enabled:false,external_reference_fetch_enabled:false,network_connection_enabled:false,
    kill_switch_disengage_enabled:false,execution_authorization_enabled:false,destructive_executor_enabled:false,
    completion_transition_enabled:false,production_status:'SCANNER_READINESS_POLICY_ONLY_EXTERNAL_ATTESTATION_MISSING'
  };
}
