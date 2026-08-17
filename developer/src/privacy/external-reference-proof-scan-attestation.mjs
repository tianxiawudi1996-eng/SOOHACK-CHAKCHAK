import {hashCanonical} from './fulfilment-package.mjs';

export const SCAN_ATTESTATION_SCHEMA_VERSION='1.0.0';
export const ATTESTATION_VERIFICATION_STEPS=Object.freeze(['SCHEMA_VALIDATE','ATTESTATION_HASH_VERIFY','OBJECT_HASH_BIND','SCANNER_IDENTITY_BIND','ENGINE_ATTESTATION_BIND','SIGNATURE_DATABASE_FRESHNESS_BIND','SCAN_TIME_ORDER_VERIFY','RESULT_ENUM_VALIDATE','INDEPENDENCE_VERIFY','RELEASE_GUARD_VERIFY']);
export const SCAN_RESULT_ENUMS=Object.freeze(['CLEAN','MALICIOUS','SUSPICIOUS','INCONCLUSIVE']);
export const RESULT_RECONCILIATION_RULES=Object.freeze(['ALL_CLEAN_REQUIRED','ANY_MALICIOUS_REJECT','ANY_SUSPICIOUS_REVIEW','ANY_INCONCLUSIVE_REVIEW','ENGINE_DISAGREEMENT_REVIEW','MISSING_ENGINE_REJECT','STALE_SIGNATURE_REJECT','HASH_MISMATCH_REJECT']);
export const ATTESTATION_FAILURE_CODES=Object.freeze(['ATTESTATION_MISSING','ATTESTATION_HASH_INVALID','OBJECT_HASH_MISMATCH','SCANNER_UNTRUSTED','ENGINE_UNATTESTED','SIGNATURE_DATABASE_STALE','SCAN_TIME_INVALID','RESULT_INVALID','ENGINE_NOT_INDEPENDENT','RESULT_DISAGREEMENT','PARTIAL_RESULT','RELEASE_GUARD_FAILED']);
export const RELEASE_GUARDS=Object.freeze(['TWO_INDEPENDENT_RESULTS','ALL_RESULTS_ATTESTED','ALL_OBJECT_HASHES_MATCH','ALL_SCANNERS_TRUSTED','ALL_ENGINES_ATTESTED','ALL_SIGNATURE_DATABASES_FRESH','NO_MALICIOUS_RESULT','NO_SUSPICIOUS_RESULT','NO_INCONCLUSIVE_RESULT','HUMAN_RELEASE_DECISION_REQUIRED']);

function assertScanner(source){
  if(source?.status!=='SCANNER_READINESS_POLICY_ONLY_EXTERNAL_ATTESTATION_MISSING')throw new Error('SCAN_ATTESTATION_SCANNER_STATUS_INVALID');
  if(source.is_latest_scanner_readiness_contract!==true)throw new Error('SCAN_ATTESTATION_SCANNER_SUPERSEDED');
  if(!source.kill_switch_engaged||source.scanner_execution_authorized||source.attestation_write_authorized||source.network_connection_authorized||source.execution_authorized)throw new Error('SCAN_ATTESTATION_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(source.requirements)||source.requirements.length!==6)throw new Error('SCAN_ATTESTATION_REQUIREMENTS_INCOMPLETE');
  for(const item of source.requirements){
    if(item.readiness_status!=='POLICY_DEFINED_EXTERNAL_SCANNER_MISSING'||item.approved_scanner_engines?.length!==0||item.object_reference||item.scan_result||item.attestation_reference||item.object_read_allowed||item.scan_execution_allowed||item.attestation_write_allowed||item.quarantine_release_allowed)throw new Error(`SCAN_ATTESTATION_SOURCE_INVALID:${item.control_key}`);
  }
}

export function buildExternalReferenceProofScanAttestationContract(input){
  assertScanner(input.scanner_readiness_contract);
  const requirements=input.scanner_readiness_contract.requirements.map((item)=>({
    control_key:item.control_key,owner_role:item.owner_role,verification_steps:[...ATTESTATION_VERIFICATION_STEPS],
    result_enums:[...SCAN_RESULT_ENUMS],reconciliation_rules:[...RESULT_RECONCILIATION_RULES],
    failure_codes:[...ATTESTATION_FAILURE_CODES],release_guards:[...RELEASE_GUARDS],accepted_attestations:[],
    readiness_status:'POLICY_DEFINED_EXTERNAL_RESULTS_MISSING',result_status:'MISSING_EXTERNAL',
    attestation_status:'MISSING_EXTERNAL',reconciliation_status:'NOT_STARTED',release_guard_status:'BLOCKED_EXTERNAL',
    metadata_only:true,fail_closed:true,dual_engine_required:true,human_release_required:true,
    raw_evidence_storage_allowed:false,credential_material_storage_allowed:false,secret_material_storage_allowed:false,
    object_reference:null,object_sha256:null,primary_attestation_reference:null,secondary_attestation_reference:null,
    reconciliation_reference:null,release_guard_evidence_reference:null,verified_at:null,reconciled_at:null,
    result_intake_allowed:false,attestation_validation_execution_allowed:false,result_reconciliation_allowed:false,
    release_guard_write_allowed:false,release_decision_write_allowed:false,quarantine_release_allowed:false,automatic_promotion_allowed:false
  }));
  const manifest={schema_version:SCAN_ATTESTATION_SCHEMA_VERSION,contract_id:input.contract_id,
    scanner_readiness_contract_id:input.scanner_readiness_contract.id,package_manifest_id:input.scanner_readiness_contract.package_manifest_id,
    revision:Number(input.revision),predecessor_contract_id:input.predecessor_contract_id??null,
    status:'SCAN_ATTESTATION_POLICY_ONLY_EXTERNAL_RESULTS_MISSING',verification_steps:[...ATTESTATION_VERIFICATION_STEPS],
    result_enums:[...SCAN_RESULT_ENUMS],reconciliation_rules:[...RESULT_RECONCILIATION_RULES],failure_codes:[...ATTESTATION_FAILURE_CODES],
    release_guards:[...RELEASE_GUARDS],accepted_attestations:[],requirements,kill_switch_engaged:true,
    result_intake_authorized:false,attestation_validation_authorized:false,release_decision_authorized:false,execution_authorized:false};
  return {...manifest,contract_manifest:manifest,contract_sha256:hashCanonical(manifest)};
}

export function mapExternalReferenceProofScanAttestationContract(row,{requirements=[]}={}){
  const booleans=['metadata_only','fail_closed','dual_engine_required','human_release_required','raw_evidence_storage_allowed','credential_material_storage_allowed','secret_material_storage_allowed','result_intake_allowed','attestation_validation_execution_allowed','result_reconciliation_allowed','release_guard_write_allowed','release_decision_write_allowed','quarantine_release_allowed','automatic_promotion_allowed'];
  return {id:row.id,scanner_readiness_contract_id:row.scanner_readiness_contract_id,package_manifest_id:row.package_manifest_id,revision:Number(row.revision),predecessor_contract_id:row.predecessor_contract_id,schema_version:row.schema_version,status:row.status,contract_manifest:row.contract_manifest,contract_sha256:row.contract_sha256,kill_switch_engaged:Boolean(row.kill_switch_engaged),result_intake_authorized:Boolean(row.result_intake_authorized),attestation_validation_authorized:Boolean(row.attestation_validation_authorized),release_decision_authorized:Boolean(row.release_decision_authorized),execution_authorized:Boolean(row.execution_authorized),requirements:requirements.map((item)=>{const mapped={...item};for(const field of booleans)mapped[field]=Boolean(item[field]);return mapped;}),created_at:row.created_at};
}

export function externalReferenceProofScanAttestationBoundary(){return {result_intake_enabled:false,attestation_validation_execution_enabled:false,result_reconciliation_enabled:false,release_guard_write_enabled:false,release_decision_write_enabled:false,quarantine_release_enabled:false,network_connection_enabled:false,execution_authorization_enabled:false,completion_transition_enabled:false,production_status:'SCAN_ATTESTATION_POLICY_ONLY_EXTERNAL_RESULTS_MISSING'};}
