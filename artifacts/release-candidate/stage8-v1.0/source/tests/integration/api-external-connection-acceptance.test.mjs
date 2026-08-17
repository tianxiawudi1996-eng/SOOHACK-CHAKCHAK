import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase34-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('pre-connection acceptance packet requires external certificate, trust, rotation, authorization, recovery, and acceptance evidence without enabling connection',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase34-identity',evidence_sha256:'f'.repeat(64)})).response.status,200);
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
  const adapter=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validation.payload.data.id}/intake-adapter-contracts`,securityAuth,'adapter');
  assert.equal(adapter.response.status,201);
  const adapterId=adapter.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapterId}/connection-acceptance-packets`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapterId}/connection-acceptance-packets`,securityAuth,'packet-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'PRE_CONNECTION_ACCEPTANCE_BLOCKED_EXTERNAL');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.packet_manifest),first.payload.data.packet_sha256);
  assert.equal(first.payload.data.requirements.length,6);
  assert.equal(new Set(first.payload.data.requirements.map((item)=>item.owner_role)).size,6);
  assert.equal(first.payload.data.requirements.flatMap((item)=>item.required_evidence).length,12);
  assert.equal(first.payload.data.requirements.every((item)=>item.status==='EXTERNAL_CONFIGURATION_REQUIRED'&&item.configuration_status==='MISSING_EXTERNAL'),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.required_approver_roles.join(',')==='PRIVACY_APPROVER,SECURITY_APPROVER'&&item.dual_approval_required),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.artifact_reference===null&&item.artifact_sha256===null&&item.verified_at===null),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.external_test_required&&item.external_test_status==='NOT_RUN_EXTERNAL'),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.acceptance_decision_status==='NOT_REVIEWED_EXTERNAL'&&!item.connection_enablement_allowed),true);
  assert.equal(first.payload.data.requirements.every((item)=>!item.credential_material_storage_allowed&&!item.secret_material_storage_allowed),true);
  assert.equal(first.payload.data.boundary.certificate_material_write_enabled,false);
  assert.equal(first.payload.data.boundary.trust_store_activation_enabled,false);
  assert.equal(first.payload.data.boundary.acceptance_decision_write_enabled,false);
  assert.equal(first.payload.data.boundary.network_connection_enabled,false);
  assert.equal(first.payload.data.connection_authorized,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapterId}/connection-acceptance-packets`,securityAuth,'packet-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_packet_id,first.payload.data.id);

  const newerAdapter=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validation.payload.data.id}/intake-adapter-contracts`,securityAuth,'newer-adapter');
  assert.equal(newerAdapter.response.status,201);
  const stalePacket=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapterId}/connection-acceptance-packets`,securityAuth,'stale-packet');
  assert.equal(stalePacket.response.status,409);
  assert.equal(stalePacket.payload.error.code,'CONNECTION_ACCEPTANCE_ADAPTER_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/connection-acceptance-packets/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/connection-acceptance-packets/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  assert.equal((await post(`/api/v1/privacy-operations/connection-acceptance-packets/${second.payload.data.id}/configurations`,securityAuth,'unsupported-config',{certificate:'forbidden'})).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/connection-acceptance-packets/${second.payload.data.id}/approve`,securityAuth,'unsupported-approve')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/connection-acceptance-packets/${second.payload.data.id}/test`,securityAuth,'unsupported-test')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/connection-acceptance-packets/${second.payload.data.id}/connect`,securityAuth,'unsupported-connect')).response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'ACCEPTANCE_PACKET_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase34',evidence_sha256:'1'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
