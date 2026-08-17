import {hashCanonical} from './fulfilment-package.mjs';

export const EXTERNAL_CONNECTION_ACCEPTANCE_SCHEMA_VERSION='1.0.0';

export const CONNECTION_ACCEPTANCE_REQUIREMENTS=Object.freeze([
  Object.freeze({control_key:'CERTIFICATE_LIFECYCLE',owner_role:'PKI_OWNER',required_evidence:Object.freeze(['CERTIFICATE_PROFILE_APPROVAL','REVOCATION_ROTATION_RUNBOOK'])}),
  Object.freeze({control_key:'TRUST_STORE_GOVERNANCE',owner_role:'TRUST_STORE_OWNER',required_evidence:Object.freeze(['TRUST_ANCHOR_MANIFEST','ISSUER_REVOCATION_POLICY'])}),
  Object.freeze({control_key:'SIGNING_KEY_ROTATION',owner_role:'KEY_MANAGEMENT_OWNER',required_evidence:Object.freeze(['SIGNING_KEY_POLICY','KEY_ROTATION_REHEARSAL'])}),
  Object.freeze({control_key:'CONNECTION_AUTHORIZATION',owner_role:'NETWORK_SECURITY_OWNER',required_evidence:Object.freeze(['NETWORK_CHANGE_APPROVAL','SOURCE_DESTINATION_ALLOWLIST'])}),
  Object.freeze({control_key:'FAILURE_RECOVERY_RUNBOOK',owner_role:'OPERATIONS_OWNER',required_evidence:Object.freeze(['QUARANTINE_DEAD_LETTER_RUNBOOK','RETRY_BACKOFF_POLICY'])}),
  Object.freeze({control_key:'OPERATIONAL_ACCEPTANCE',owner_role:'PRODUCT_OWNER',required_evidence:Object.freeze(['PRE_CONNECTION_TEST_REPORT','DUAL_APPROVAL_RECORD'])})
]);

const REQUIRED_APPROVER_ROLES=Object.freeze(['PRIVACY_APPROVER','SECURITY_APPROVER']);

function assertIntakeAdapter(adapter){
  if(adapter?.status!=='CONTRACT_ONLY_EXTERNAL_ADAPTER_MISSING')throw new Error('CONNECTION_ACCEPTANCE_ADAPTER_STATUS_INVALID');
  if(adapter.is_latest_intake_adapter_contract!==true)throw new Error('CONNECTION_ACCEPTANCE_ADAPTER_SUPERSEDED');
  if(!adapter.kill_switch_engaged||adapter.execution_authorized)throw new Error('CONNECTION_ACCEPTANCE_SAFETY_BOUNDARY_INVALID');
  if(!Array.isArray(adapter.ports)||adapter.ports.length!==6)throw new Error('CONNECTION_ACCEPTANCE_PORTS_INCOMPLETE');
  for(const port of adapter.ports){
    if(port.port_status!=='MISSING_EXTERNAL'||port.endpoint_reference||port.transport_identity_reference||port.network_connection_enabled||!port.mtls_required||!port.signature_verification_required||port.signature_policy_status!=='MISSING_EXTERNAL'||port.trusted_issuer_list_status!=='MISSING_EXTERNAL'||!port.replay_guard_required||!port.quarantine_required||port.automatic_release_allowed||port.raw_payload_storage_allowed)throw new Error(`CONNECTION_ACCEPTANCE_PORT_INVALID:${port.control_key}`);
  }
}

export function buildExternalConnectionAcceptancePacket(input){
  assertIntakeAdapter(input.intake_adapter_contract);
  const requirements=CONNECTION_ACCEPTANCE_REQUIREMENTS.map((requirement)=>({
    ...requirement,
    required_evidence:[...requirement.required_evidence],
    required_approver_roles:[...REQUIRED_APPROVER_ROLES],
    status:'EXTERNAL_CONFIGURATION_REQUIRED',
    configuration_status:'MISSING_EXTERNAL',
    artifact_reference:null,
    artifact_sha256:null,
    verified_at:null,
    dual_approval_required:true,
    credential_material_storage_allowed:false,
    secret_material_storage_allowed:false,
    external_test_required:true,
    external_test_status:'NOT_RUN_EXTERNAL',
    acceptance_decision_status:'NOT_REVIEWED_EXTERNAL',
    connection_enablement_allowed:false
  }));
  const packetManifest={
    schema_version:EXTERNAL_CONNECTION_ACCEPTANCE_SCHEMA_VERSION,
    packet_id:input.packet_id,
    intake_adapter_contract_id:input.intake_adapter_contract.id,
    package_manifest_id:input.intake_adapter_contract.package_manifest_id,
    revision:Number(input.revision),
    predecessor_packet_id:input.predecessor_packet_id??null,
    status:'PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL',
    requirements,
    kill_switch_engaged:true,
    connection_authorized:false,
    execution_authorized:false
  };
  return {
    status:packetManifest.status,
    packet_manifest:packetManifest,
    packet_sha256:hashCanonical(packetManifest),
    requirements,
    kill_switch_engaged:true,
    connection_authorized:false,
    execution_authorized:false
  };
}

export function mapExternalConnectionAcceptancePacket(row,{requirements=[]}={}){
  return {
    id:row.id,
    intake_adapter_contract_id:row.intake_adapter_contract_id,
    package_manifest_id:row.package_manifest_id,
    revision:Number(row.revision),
    predecessor_packet_id:row.predecessor_packet_id,
    schema_version:row.schema_version,
    status:row.status,
    packet_sha256:row.packet_sha256,
    packet_manifest:row.packet_manifest,
    kill_switch_engaged:Boolean(row.kill_switch_engaged),
    connection_authorized:Boolean(row.connection_authorized),
    execution_authorized:Boolean(row.execution_authorized),
    requirements:requirements.map((requirement)=>({
      ...requirement,
      dual_approval_required:Boolean(requirement.dual_approval_required),
      credential_material_storage_allowed:Boolean(requirement.credential_material_storage_allowed),
      secret_material_storage_allowed:Boolean(requirement.secret_material_storage_allowed),
      external_test_required:Boolean(requirement.external_test_required),
      connection_enablement_allowed:Boolean(requirement.connection_enablement_allowed)
    })),
    created_at:row.created_at
  };
}

export function externalConnectionAcceptanceBoundary(){
  return {
    certificate_material_write_enabled:false,
    trust_store_activation_enabled:false,
    signing_key_activation_enabled:false,
    network_authorization_write_enabled:false,
    external_test_execution_enabled:false,
    acceptance_decision_write_enabled:false,
    network_connection_enabled:false,
    evidence_intake_enabled:false,
    kill_switch_disengage_enabled:false,
    execution_authorization_enabled:false,
    destructive_executor_enabled:false,
    completion_transition_enabled:false,
    production_status:'PRE_CONNECTION_ACCEPTANCE_PACKET_ONLY_EXTERNAL_APPROVAL_MISSING'
  };
}
