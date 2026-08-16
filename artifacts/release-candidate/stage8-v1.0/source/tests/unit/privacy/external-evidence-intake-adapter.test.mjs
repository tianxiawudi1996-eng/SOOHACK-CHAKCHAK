import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTAKE_PIPELINE_STAGES,buildExternalEvidenceIntakeAdapterContract,
  externalEvidenceIntakeAdapterBoundary,mapExternalEvidenceIntakeAdapterContract
} from '../../../developer/src/privacy/external-evidence-intake-adapter.mjs';
import {EXECUTION_READINESS_CONTROLS} from '../../../developer/src/privacy/execution-readiness.mjs';
import {hashCanonical} from '../../../developer/src/privacy/fulfilment-package.mjs';

function validValidationContract(){
  return {
    id:'11111111-1111-4111-8111-111111111111',
    package_manifest_id:'22222222-2222-4222-8222-222222222222',
    status:'POLICY_DEFINED_EXTERNAL_CHANNEL_MISSING',
    is_latest_validation_contract:true,
    kill_switch_engaged:true,
    execution_authorized:false,
    rules:EXECUTION_READINESS_CONTROLS.map((control_key)=>({
      control_key,current_status:'AWAITING_EXTERNAL_CHANNEL',submission_channel_status:'MISSING_EXTERNAL',
      expiry_policy_status:'MISSING_EXTERNAL',raw_content_storage_allowed:false
    }))
  };
}

test('intake adapter contract is hash-bound and defines six ordered pipeline stages',()=>{
  const built=buildExternalEvidenceIntakeAdapterContract({
    contract_id:'33333333-3333-4333-8333-333333333333',revision:1,validation_contract:validValidationContract()
  });
  assert.equal(INTAKE_PIPELINE_STAGES.length,6);
  assert.deepEqual(built.contract_manifest.pipeline_stages,[...INTAKE_PIPELINE_STAGES]);
  assert.equal(hashCanonical(built.contract_manifest),built.contract_sha256);
  assert.equal(built.status,'CONTRACT_ONLY_EXTERNAL_ADAPTER_MISSING');
});

test('all control ports fail closed until external transport and trust policy are supplied',()=>{
  const built=buildExternalEvidenceIntakeAdapterContract({contract_id:'contract',revision:1,validation_contract:validValidationContract()});
  assert.equal(built.ports.length,6);
  assert.equal(built.ports.every((port)=>port.port_status==='MISSING_EXTERNAL'&&!port.network_connection_enabled&&port.mtls_required),true);
  assert.equal(built.ports.every((port)=>port.signature_verification_required&&port.signature_policy_status==='MISSING_EXTERNAL'&&port.accepted_signature_algorithms.length===0),true);
  assert.equal(built.ports.every((port)=>port.trusted_issuer_count===0&&port.replay_guard_required&&port.replay_window_seconds===null),true);
  assert.equal(built.ports.every((port)=>port.quarantine_required&&!port.automatic_release_allowed&&port.reprocess_dual_approval_required),true);
  assert.equal(built.ports.every((port)=>!port.raw_payload_storage_allowed),true);
});

test('adapter rejects stale, executable, or incomplete validation sources',()=>{
  const valid=validValidationContract();
  assert.throws(()=>buildExternalEvidenceIntakeAdapterContract({contract_id:'x',revision:1,validation_contract:{...valid,is_latest_validation_contract:false}}),/VALIDATION_SUPERSEDED/);
  assert.throws(()=>buildExternalEvidenceIntakeAdapterContract({contract_id:'x',revision:1,validation_contract:{...valid,execution_authorized:true}}),/SAFETY_BOUNDARY_INVALID/);
  assert.throws(()=>buildExternalEvidenceIntakeAdapterContract({contract_id:'x',revision:1,validation_contract:{...valid,rules:valid.rules.slice(1)}}),/RULES_INCOMPLETE/);
  const unsafe={...valid,rules:valid.rules.map((rule,index)=>index?rule:{...rule,raw_content_storage_allowed:true})};
  assert.throws(()=>buildExternalEvidenceIntakeAdapterContract({contract_id:'x',revision:1,validation_contract:unsafe}),/RULE_INVALID/);
});

test('adapter mapping hides creator identity and exposes no intake or release capability',()=>{
  const mapped=mapExternalEvidenceIntakeAdapterContract({
    id:'adapter',validation_contract_id:'validation',package_manifest_id:'manifest',revision:'1',predecessor_contract_id:null,
    schema_version:'1.0.0',status:'CONTRACT_ONLY_EXTERNAL_ADAPTER_MISSING',contract_sha256:'a'.repeat(64),
    contract_manifest:{safe:true},created_by_user_id:'hidden',kill_switch_engaged:true,execution_authorized:false,created_at:'2026-08-08T00:00:00Z'
  });
  assert.equal('created_by_user_id' in mapped,false);
  const boundary=externalEvidenceIntakeAdapterBoundary();
  assert.equal(boundary.network_connection_enabled,false);
  assert.equal(boundary.evidence_intake_enabled,false);
  assert.equal(boundary.quarantine_release_enabled,false);
  assert.equal(boundary.retry_execution_enabled,false);
  assert.equal(boundary.raw_payload_storage_enabled,false);
  assert.equal(boundary.execution_authorization_enabled,false);
});
