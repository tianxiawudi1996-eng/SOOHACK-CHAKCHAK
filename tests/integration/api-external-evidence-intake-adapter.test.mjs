import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase33-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('external evidence intake adapter remains disconnected and fail-closed across trust, replay, quarantine, and recovery controls',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase33-identity',evidence_sha256:'f'.repeat(64)})).response.status,200);
  assert.equal((await transition('IN_REVIEW')).response.status,200);
  assert.equal((await transition('APPROVED',{reason_code:'REQUEST_AND_SCOPE_VERIFIED'})).response.status,200);
  const plan=await post(`/api/v1/privacy-operations/requests/${requestId}/fulfilment-plans`,operatorAuth,'plan');
  const planId=plan.payload.data.id;
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/impact-assessment`,operatorAuth,'impact')).response.status,200);

  const privacyIssued=await post('/api/v1/local-demo/privacy-approver/privacy/session','','privacy-session');
  const securityIssued=await post('/api/v1/local-demo/privacy-approver/security/session','','security-session');
  const privacyAuth=`Bearer ${privacyIssued.payload.data.access_token}`;
  const securityAuth=`Bearer ${securityIssued.payload.data.access_token}`;
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,privacyAuth,'privacy-approval',{decision:'APPROVE',reason_code:'PRIVACY_SCOPE_VERIFIED'})).response.status,200);
  assert.equal((await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/approvals`,securityAuth,'security-approval',{decision:'APPROVE',reason_code:'SECURITY_SCOPE_VERIFIED'})).payload.data.status,'DUAL_APPROVED');
  const sealed=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/package-manifests`,operatorAuth,'seal');
  const manifestId=sealed.payload.data.id;
  assert.equal((await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/recovery-checkpoints`,operatorAuth,'checkpoint')).response.status,201);
  const readiness=await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/execution-readiness-reviews`,securityAuth,'readiness');
  const handoff=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${readiness.payload.data.id}/handoff-packets`,securityAuth,'handoff');
  const validation=await post(`/api/v1/privacy-operations/execution-handoff-packets/${handoff.payload.data.id}/evidence-validation-contracts`,securityAuth,'validation');
  assert.equal(validation.response.status,201);
  const validationId=validation.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validationId}/intake-adapter-contracts`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validationId}/intake-adapter-contracts`,securityAuth,'adapter-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'CONTRACT_ONLY_EXTERNAL_ADAPTER_MISSING');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.equal(first.payload.data.contract_manifest.pipeline_stages.length,6);
  assert.equal(first.payload.data.ports.length,6);
  assert.equal(first.payload.data.ports.every((port)=>port.port_status==='MISSING_EXTERNAL'&&port.endpoint_reference===null&&port.transport_identity_reference===null),true);
  assert.equal(first.payload.data.ports.every((port)=>!port.network_connection_enabled&&port.mtls_required&&port.transport_policy_status==='MISSING_EXTERNAL'),true);
  assert.equal(first.payload.data.ports.every((port)=>port.signature_verification_required&&port.signature_policy_status==='MISSING_EXTERNAL'&&port.accepted_signature_algorithms.length===0),true);
  assert.equal(first.payload.data.ports.every((port)=>port.trusted_issuer_list_status==='MISSING_EXTERNAL'&&port.trusted_issuer_count===0),true);
  assert.equal(first.payload.data.ports.every((port)=>port.replay_guard_required&&port.submission_id_required&&port.content_hash_required&&port.replay_window_seconds===null),true);
  assert.equal(first.payload.data.ports.every((port)=>port.quarantine_required&&!port.automatic_release_allowed&&port.reprocess_dual_approval_required),true);
  assert.equal(first.payload.data.ports.every((port)=>port.retry_policy_status==='MISSING_EXTERNAL'&&port.dead_letter_route_status==='MISSING_EXTERNAL'&&!port.raw_payload_storage_allowed),true);
  assert.equal(first.payload.data.boundary.network_connection_enabled,false);
  assert.equal(first.payload.data.boundary.evidence_intake_enabled,false);
  assert.equal(first.payload.data.boundary.quarantine_release_enabled,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validationId}/intake-adapter-contracts`,securityAuth,'adapter-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);

  const newerValidation=await post(`/api/v1/privacy-operations/execution-handoff-packets/${handoff.payload.data.id}/evidence-validation-contracts`,securityAuth,'newer-validation');
  assert.equal(newerValidation.response.status,201);
  const staleAdapter=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validationId}/intake-adapter-contracts`,securityAuth,'stale-adapter');
  assert.equal(staleAdapter.response.status,409);
  assert.equal(staleAdapter.payload.error.code,'INTAKE_ADAPTER_VALIDATION_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/intake-adapter-contracts/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/intake-adapter-contracts/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  assert.equal((await post(`/api/v1/privacy-operations/intake-adapter-contracts/${second.payload.data.id}/connect`,securityAuth,'unsupported-connect')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/intake-adapter-contracts/${second.payload.data.id}/submissions`,securityAuth,'unsupported-submit',{raw_payload:'forbidden'})).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/intake-adapter-contracts/${second.payload.data.id}/quarantine/release`,securityAuth,'unsupported-release')).response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'ADAPTER_CONTRACT_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase33',evidence_sha256:'1'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
