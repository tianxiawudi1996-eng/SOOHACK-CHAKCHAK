import {hashCanonical} from './fulfilment-package.mjs';
import {CONNECTION_ACCEPTANCE_REQUIREMENTS} from './external-connection-acceptance.mjs';

export const EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_SCHEMA_VERSION='1.0.0';

export const CONFIGURATION_EVIDENCE_QUEUE_STAGES=Object.freeze([
  'ENVELOPE_SCHEMA','REFERENCE_POLICY','SHA256_INTEGRITY','ISSUER_PROVENANCE',
  'DUPLICATE_GUARD','QUARANTINE_QUEUE','DUAL_REVIEW_QUEUE'
]);

function assertAcceptancePacket(packet){
  if(packet?.status!=='PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL')throw new Error('CONFIG_QUEUE_ACCEPTANCE_STATUS_INVALID');
  if(packet.is_latest_acceptance_packet!==true)throw new Error('CONFIG_QUEUE_ACCEPTANCE_SUPERSEDED');
  if(!packet.kill_switch_engaged||packet.connection_authorized||packet.execution_authorized)throw new Error('CONFIG_QUEUE_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(packet.requirements)||packet.requirements.length!==CONNECTION_ACCEPTANCE_REQUIREMENTS.length)throw new Error('CONFIG_QUEUE_REQUIREMENTS_INCOMPLETE');
  for(const expected of CONNECTION_ACCEPTANCE_REQUIREMENTS){
    const requirement=packet.requirements.find((item)=>item.control_key===expected.control_key);
    if(!requirement||requirement.status!=='EXTERNAL_CONFIGURATION_REQUIRED'||requirement.configuration_status!=='MISSING_EXTERNAL'||requirement.artifact_reference||requirement.artifact_sha256||requirement.verified_at||requirement.external_test_status!=='NOT_RUN_EXTERNAL'||requirement.acceptance_decision_status!=='NOT_REVIEWED_EXTERNAL'||requirement.connection_enablement_allowed||requirement.credential_material_storage_allowed||requirement.secret_material_storage_allowed)throw new Error(`CONFIG_QUEUE_REQUIREMENT_INVALID:${expected.control_key}`);
  }
}

export function buildExternalConfigurationEvidenceQueueContract(input){
  assertAcceptancePacket(input.acceptance_packet);
  const slots=input.acceptance_packet.requirements.map((requirement)=>({
    control_key:requirement.control_key,
    owner_role:requirement.owner_role,
    allowed_evidence_types:[...requirement.required_evidence],
    required_approver_roles:[...requirement.required_approver_roles],
    queue_status:'AWAITING_EXTERNAL_SUBMISSION_CHANNEL',
    submission_channel_status:'MISSING_EXTERNAL',
    reference_policy_status:'MISSING_EXTERNAL',
    allowed_reference_schemes:[],
    immutable_reference_required:true,
    sha256_required:true,
    issuer_provenance_required:true,
    duplicate_guard_required:true,
    artifact_reference:null,
    artifact_sha256:null,
    submission_id:null,
    queue_entry_id:null,
    submitted_at:null,
    validation_status:'NOT_SUBMITTED',
    review_ttl_policy_status:'MISSING_EXTERNAL',
    review_ttl_seconds:null,
    raw_payload_storage_allowed:false,
    credential_material_storage_allowed:false,
    secret_material_storage_allowed:false,
    automatic_promotion_allowed:false
  }));
  const contractManifest={
    schema_version:EXTERNAL_CONFIGURATION_EVIDENCE_QUEUE_SCHEMA_VERSION,
    contract_id:input.contract_id,
    acceptance_packet_id:input.acceptance_packet.id,
    package_manifest_id:input.acceptance_packet.package_manifest_id,
    revision:Number(input.revision),
    predecessor_contract_id:input.predecessor_contract_id??null,
    status:'QUEUE_CONTRACT_ONLY_EXTERNAL_SUBMISSION_MISSING',
    queue_stages:[...CONFIGURATION_EVIDENCE_QUEUE_STAGES],
    slots,
    kill_switch_engaged:true,
    connection_authorized:false,
    execution_authorized:false
  };
  return {
    status:contractManifest.status,
    contract_manifest:contractManifest,
    contract_sha256:hashCanonical(contractManifest),
    slots,
    kill_switch_engaged:true,
    connection_authorized:false,
    execution_authorized:false
  };
}

export function mapExternalConfigurationEvidenceQueueContract(row,{slots=[]}={}){
  return {
    id:row.id,
    acceptance_packet_id:row.acceptance_packet_id,
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
    slots:slots.map((slot)=>({
      ...slot,
      immutable_reference_required:Boolean(slot.immutable_reference_required),
      sha256_required:Boolean(slot.sha256_required),
      issuer_provenance_required:Boolean(slot.issuer_provenance_required),
      duplicate_guard_required:Boolean(slot.duplicate_guard_required),
      raw_payload_storage_allowed:Boolean(slot.raw_payload_storage_allowed),
      credential_material_storage_allowed:Boolean(slot.credential_material_storage_allowed),
      secret_material_storage_allowed:Boolean(slot.secret_material_storage_allowed),
      automatic_promotion_allowed:Boolean(slot.automatic_promotion_allowed)
    })),
    created_at:row.created_at
  };
}

export function externalConfigurationEvidenceQueueBoundary(){
  return {
    configuration_evidence_submission_enabled:false,
    external_reference_fetch_enabled:false,
    queue_transition_enabled:false,
    validation_decision_write_enabled:false,
    approval_decision_write_enabled:false,
    automatic_promotion_enabled:false,
    credential_material_write_enabled:false,
    secret_material_write_enabled:false,
    network_connection_enabled:false,
    evidence_intake_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'CONFIGURATION_EVIDENCE_QUEUE_CONTRACT_ONLY_EXTERNAL_CHANNEL_MISSING'
  };
}
