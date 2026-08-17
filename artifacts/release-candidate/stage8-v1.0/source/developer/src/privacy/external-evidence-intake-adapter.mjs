import {hashCanonical} from './fulfilment-package.mjs';
import {EXECUTION_READINESS_CONTROLS} from './execution-readiness.mjs';

export const EXTERNAL_EVIDENCE_INTAKE_ADAPTER_SCHEMA_VERSION='1.0.0';

export const INTAKE_PIPELINE_STAGES=Object.freeze([
  'ENVELOPE_SCHEMA','SIGNATURE_VERIFICATION','ISSUER_TRUST','REPLAY_GUARD','QUARANTINE','POLICY_HANDOFF'
]);

function assertValidationContract(contract){
  if(contract?.status!=='POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING')throw new Error('INTAKE_ADAPTER_VALIDATION_STATUS_INVALID');
  if(contract.is_latest_validation_contract!==true)throw new Error('INTAKE_ADAPTER_VALIDATION_SUPERSEDED');
  if(!contract.kill_switch_engaged||contract.execution_authorized)throw new Error('INTAKE_ADAPTER_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(contract.rules)||contract.rules.length!==EXECUTION_READINESS_CONTROLS.length)throw new Error('INTAKE_ADAPTER_RULES_INCOMPLETE');
  for(const key of EXECUTION_READINESS_CONTROLS){
    const rule=contract.rules.find((item)=>item.control_key===key);
    if(!rule||rule.current_status!=='AWAITING_EXTERNAL_CHANNEL'||rule.submission_channel_status!=='MISSING_EXTERNAL'||rule.expiry_policy_status!=='MISSING_EXTERNAL'||rule.raw_content_storage_allowed)throw new Error(`INTAKE_ADAPTER_RULE_INVALID:${key}`);
  }
}

function missingPort(controlKey){
  return {
    control_key:controlKey,
    port_status:'MISSING_EXTERNAL',
    endpoint_reference:null,
    transport_identity_reference:null,
    network_connection_enabled:false,
    mtls_required:true,
    transport_policy_status:'MISSING_EXTERNAL',
    signature_verification_required:true,
    signature_policy_status:'MISSING_EXTERNAL',
    accepted_signature_algorithms:[],
    trusted_issuer_list_status:'MISSING_EXTERNAL',
    trusted_issuer_count:0,
    replay_guard_required:true,
    submission_id_required:true,
    content_hash_required:true,
    replay_window_status:'MISSING_EXTERNAL',
    replay_window_seconds:null,
    quarantine_required:true,
    quarantine_route_status:'MISSING_EXTERNAL',
    automatic_release_allowed:false,
    reprocess_dual_approval_required:true,
    retry_policy_status:'MISSING_EXTERNAL',
    dead_letter_route_status:'MISSING_EXTERNAL',
    raw_payload_storage_allowed:false
  };
}

export function buildExternalEvidenceIntakeAdapterContract(input){
  assertValidationContract(input.validation_contract);
  const ports=EXECUTION_READINESS_CONTROLS.map(missingPort);
  const contractManifest={
    schema_version:EXTERNAL_EVIDENCE_INTAKE_ADAPTER_SCHEMA_VERSION,
    contract_id:input.contract_id,
    validation_contract_id:input.validation_contract.id,
    package_manifest_id:input.validation_contract.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'CONTRACT_ONLY_EXTERNAL_ADAPTER_MISSING',
    pipeline_stages:[...INTAKE_PIPELINE_STAGES],
    ports,
    kill_switch_engaged:true,
    execution_authorized:false
  };
  return {
    status:contractManifest.status,
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    ports,
    kill_switch_engaged:true,
    execution_authorized:false
  };
}

export function mapExternalEvidenceIntakeAdapterContract(row,{ports=[]}={}){
  return {
    id:row.id,
    validation_contract_id:row.validation_contract_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_contract_id:row.predecessor_contract_id,
    schema_version:row.schema_version,
    status:row.status,
    contract_sha256:row.contract_sha256,
    contract_manifest:row.contract_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    execution_authorized:Boolean(row.execution_authorized),
    ports:ports.map((port)=>({
      ...port,
      network_connection_enabled:Boolean(port.network_connection_enabled),
      mtls_required:Boolean(port.mtls_required),
      signature_verification_required:Boolean(port.signature_verification_required),
      trusted_issuer_count:Number(port.trusted_issuer_count),
      replay_guard_required:Boolean(port.replay_guard_required),
      submission_id_required:Boolean(port.submission_id_required),
      content_hash_required:Boolean(port.content_hash_required),
      quarantine_required:Boolean(port.quarantine_required),
      automatic_release_allowed:Boolean(port.automatic_release_allowed),
      reprocess_dual_approval_required:Boolean(port.reprocess_dual_approval_required),
      raw_payload_storage_allowed:Boolean(port.raw_payload_storage_allowed)
    })),
    created_at:row.created_at
  };
}

export function externalEvidenceIntakeAdapterBoundary(){
  return {
    network_connection_enabled:false,
    evidence_intake_enabled:false,
    signature_policy_activation_enabled:false,
    issuer_trust_activation_enabled:false,
    replay_window_activation_enabled:false,
    quarantine_release_enabled:false,
    retry_execution_enabled:false,
    raw_payload_storage_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'INTAKE_ADAPTER_CONTRACT_ONLY_EXTERNAL_CONFIGURATION_MISSING'
  };
}
