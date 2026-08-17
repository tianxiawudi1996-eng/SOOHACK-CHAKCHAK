import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase35-${label}-${crypto.randomUUID()}`;
const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{
    method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)
  });
  return {response,payload:await response.json()};
};

test('configuration evidence queue defines immutable-reference metadata slots without accepting, fetching, reviewing, or promoting evidence',async()=>{
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;

  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase35-identity',evidence_sha256:'f'.repeat(64)})).response.status,200);
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
  const acceptance=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapter.payload.data.id}/connection-acceptance-packets`,securityAuth,'acceptance');
  assert.equal(acceptance.response.status,201);
  const acceptanceId=acceptance.payload.data.id;

  const operatorDenied=await post(`/api/v1/privacy-operations/connection-acceptance-packets/${acceptanceId}/configuration-evidence-queue-contracts`,operatorAuth,'operator-denied');
  assert.equal(operatorDenied.response.status,403);
  const first=await post(`/api/v1/privacy-operations/connection-acceptance-packets/${acceptanceId}/configuration-evidence-queue-contracts`,securityAuth,'queue-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'QUEUE_CONTRACT_ONLY_EXTERNAL_SUBMISSION_MISSING');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.equal(first.payload.data.contract_manifest.queue_stages.length,7);
  assert.equal(first.payload.data.slots.length,6);
  assert.equal(first.payload.data.slots.flatMap((slot)=>slot.allowed_evidence_types).length,12);
  assert.equal(first.payload.data.slots.every((slot)=>slot.queue_status==='AWAITING_EXTERNAL_SUBMISSION_CHANNEL'&&slot.submission_channel_status==='MISSING_EXTERNAL'),true);
  assert.equal(first.payload.data.slots.every((slot)=>slot.reference_policy_status==='MISSING_EXTERNAL'&&slot.allowed_reference_schemes.length===0),true);
  assert.equal(first.payload.data.slots.every((slot)=>slot.immutable_reference_required&&slot.sha256_required&&slot.issuer_provenance_required&&slot.duplicate_guard_required),true);
  assert.equal(first.payload.data.slots.every((slot)=>slot.artifact_reference===null&&slot.artifact_sha256===null&&slot.submission_id===null&&slot.queue_entry_id===null&&slot.submitted_at===null),true);
  assert.equal(first.payload.data.slots.every((slot)=>slot.validation_status==='NOT_SUBMITTED'&&slot.review_ttl_policy_status==='MISSING_EXTERNAL'&&slot.review_ttl_seconds===null),true);
  assert.equal(first.payload.data.slots.every((slot)=>!slot.raw_payload_storage_allowed&&!slot.credential_material_storage_allowed&&!slot.secret_material_storage_allowed&&!slot.automatic_promotion_allowed),true);
  assert.equal(first.payload.data.boundary.configuration_evidence_submission_enabled,false);
  assert.equal(first.payload.data.boundary.external_reference_fetch_enabled,false);
  assert.equal(first.payload.data.boundary.queue_transition_enabled,false);
  assert.equal(first.payload.data.boundary.automatic_promotion_enabled,false);
  assert.equal(first.payload.data.connection_authorized,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(`/api/v1/privacy-operations/connection-acceptance-packets/${acceptanceId}/configuration-evidence-queue-contracts`,securityAuth,'queue-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);

  const newerAcceptance=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapter.payload.data.id}/connection-acceptance-packets`,securityAuth,'newer-acceptance');
  assert.equal(newerAcceptance.response.status,201);
  const staleQueue=await post(`/api/v1/privacy-operations/connection-acceptance-packets/${acceptanceId}/configuration-evidence-queue-contracts`,securityAuth,'stale-queue');
  assert.equal(staleQueue.response.status,409);
  assert.equal(staleQueue.payload.error.code,'CONFIG_QUEUE_ACCEPTANCE_SUPERSEDED');

  const operatorRead=await fetch(`${baseUrl}/api/v1/privacy-operations/configuration-evidence-queue-contracts/${second.payload.data.id}`,{headers:{authorization:operatorAuth}});
  assert.equal(operatorRead.status,200);
  const studentDenied=await fetch(`${baseUrl}/api/v1/privacy-operations/configuration-evidence-queue-contracts/${second.payload.data.id}`,{headers:{authorization:studentAuth}});
  assert.equal(studentDenied.status,403);
  assert.equal((await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${second.payload.data.id}/submissions`,securityAuth,'unsupported-submit',{artifact_reference:'forbidden'})).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${second.payload.data.id}/enqueue`,securityAuth,'unsupported-enqueue')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${second.payload.data.id}/decisions`,securityAuth,'unsupported-decision')).response.status,404);
  assert.equal((await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${second.payload.data.id}/activate`,securityAuth,'unsupported-activate')).response.status,404);
  const completion=await transition('COMPLETED',{reason_code:'QUEUE_CONTRACT_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase35',evidence_sha256:'1'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
