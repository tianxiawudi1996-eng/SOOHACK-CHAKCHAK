import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONNECTION_ACCEPTANCE_REQUIREMENTS,buildExternalConnectionAcceptancePacket,
  externalConnectionAcceptanceBoundary,mapExternalConnectionAcceptancePacket
} from '../../../developer/src/privacy/external-connection-acceptance.mjs';
import {buildExternalEvidenceIntakeAdapterContract} from '../../../developer/src/privacy/external-evidence-intake-adapter.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validAdapter(){
  const validation={
    id:'11111111-1111-4111-8111-111111111111',package_manifest_id:'22222222-2222-4222-8222-222222222222',
    status:'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING',is_latest_validation_contract:true,
    kill_switch_engaged:true,execution_authorized:false,
    rules:EXECUTION_READINESS_CONTROLS.map((control_key)=>({
      control_key,current_status:'AWAITING_EXTERNAL_CHANNEL',submission_channel_status:'MISSING_EXTERNAL',
      expiry_policy_status:'MISSING_EXTERNAL',raw_content_storage_allowed:false
    }))
  };
  const built=buildExternalEvidenceIntakeAdapterContract({
    contract_id:'33333333-3333-4333-8333-333333333333',revision:1,validation_contract:validation
  });
  return {id:built.contract_manifest.contract_id,package_manifest_id:validation.package_manifest_id,...built,is_latest_intake_adapter_contract:true};
}

test('pre-connection packet is hash-bound with six owned requirements and twelve evidence types',()=>{
  const built=buildExternalConnectionAcceptancePacket({
    packet_id:'44444444-4444-4444-8444-444444444444',revision:1,intake_adapter_contract:validAdapter()
  });
  assert.equal(CONNECTION_ACCEPTANCE_REQUIREMENTS.length,6);
  assert.equal(new Set(CONNECTION_ACCEPTANCE_REQUIREMENTS.map((item)=>item.owner_role)).size,6);
  assert.equal(built.requirements.flatMap((item)=>item.required_evidence).length,12);
  assert.equal(hashCanonical(built.packet_manifest),built.packet_sha256);
  assert.equal(built.status,'PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL');
});

test('all acceptance requirements remain external, dual-reviewed, untested, and non-enabling',()=>{
  const built=buildExternalConnectionAcceptancePacket({packet_id:'packet',revision:1,intake_adapter_contract:validAdapter()});
  assert.equal(built.requirements.every((item)=>item.configuration_status==='MISSING_EXTERNAL'&&item.status==='EXTERNAL_CONFIGURATION_REQUIRED'),true);
  assert.equal(built.requirements.every((item)=>item.required_approver_roles.join(',')==='PRIVACY_APPROVER,SECURITY_APPROVER'&&item.dual_approval_required),true);
  assert.equal(built.requirements.every((item)=>item.external_test_required&&item.external_test_status==='NOT_RUN_EXTERNAL'),true);
  assert.equal(built.requirements.every((item)=>item.acceptance_decision_status==='NOT_REVIEWED_EXTERNAL'&&!item.connection_enablement_allowed),true);
  assert.equal(built.requirements.every((item)=>!item.credential_material_storage_allowed&&!item.secret_material_storage_allowed),true);
  assert.equal(built.connection_authorized,false);
});

test('acceptance packet rejects stale, executable, connected, or incomplete adapter sources',()=>{
  const valid=validAdapter();
  assert.throws(()=>buildExternalConnectionAcceptancePacket({packet_id:'x',revision:1,intake_adapter_contract:{...valid,is_latest_intake_adapter_contract:false}}),/ADAPTER_SUPERSEDED/);
  assert.throws(()=>buildExternalConnectionAcceptancePacket({packet_id:'x',revision:1,intake_adapter_contract:{...valid,execution_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalConnectionAcceptancePacket({packet_id:'x',revision:1,intake_adapter_contract:{...valid,ports:valid.ports.slice(1)}}),/PORTS_INCOMPLETE/);
  const connected={...valid,ports:valid.ports.map((port,index)=>index?port:{...port,network_connection_enabled:true})};
  assert.throws(()=>buildExternalConnectionAcceptancePacket({packet_id:'x',revision:1,intake_adapter_contract:connected}),/PORT_INVALID/);
});

test('acceptance mapping hides creator identity and exposes no configuration, approval, or connection write path',()=>{
  const mapped=mapExternalConnectionAcceptancePacket({
    id:'packet',intake_adapter_contract_id:'adapter',package_manifest_id:'manifest',revision:'1',predecessor_packet_id:null,
    schema_version:'1.0.0',status:'PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL',packet_sha256:'a'.repeat(64),
    packet_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,connection_authorized:false,
    execution_authorized:false,created_at:'2026-08-08T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalConnectionAcceptanceBoundary();
  assert.equal(boundary.certificate_material_write_enabled,false);
  assert.equal(boundary.trust_store_activation_enabled,false);
  assert.equal(boundary.network_authorization_write_enabled,false);
  assert.equal(boundary.acceptance_decision_write_enabled,false);
  assert.equal(boundary.network_connection_enabled,false);
  assert.equal(boundary.execution_authorization_enabled,false);
});
