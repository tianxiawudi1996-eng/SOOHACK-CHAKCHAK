import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';

export const baseUrl=process.env.API_BASE_URL||'http://127.0.0.1:4181';
const key=(label)=>`phase42-${label}-${crypto.randomUUID()}`;
export const post=async(path,authorization,label,body={})=>{
  const response=await fetch(`${baseUrl}${path}`,{method:'POST',headers:{authorization,'content-type':'application/json','idempotency-key':key(label)},body:JSON.stringify(body)});
  return {response,payload:await response.json()};
};

export async function prepareQuarantineContract(){
  const studentIssued=await post('/api/v1/local-demo/session','','student-session');
  const studentAuth=`Bearer ${studentIssued.payload.data.access_token}`;
  const request=await post('/api/v1/privacy/requests',studentAuth,'request',{request_type:'EXPORT',locale:'ko'});
  assert.equal(request.response.status,201);
  const requestId=request.payload.data.id;
  const operatorIssued=await post('/api/v1/local-demo/privacy-operator/session','','operator-session');
  const operatorAuth=`Bearer ${operatorIssued.payload.data.access_token}`;
  const transition=(to_status,body={})=>post(`/api/v1/privacy-operations/requests/${requestId}/transition`,operatorAuth,to_status,{to_status,...body});
  assert.equal((await transition('IDENTITY_VERIFIED',{evidence_reference:'LOCAL-EVIDENCE/phase42-identity',evidence_sha256:'d'.repeat(64)})).response.status,200);
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
  const manifest=await post(`/api/v1/privacy-operations/fulfilment-plans/${planId}/package-manifests`,operatorAuth,'seal');
  const manifestId=manifest.payload.data.id;
  assert.equal((await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/recovery-checkpoints`,operatorAuth,'checkpoint')).response.status,201);
  const readiness=await post(`/api/v1/privacy-operations/package-manifests/${manifestId}/execution-readiness-reviews`,securityAuth,'readiness');
  const handoff=await post(`/api/v1/privacy-operations/execution-readiness-reviews/${readiness.payload.data.id}/handoff-packets`,securityAuth,'handoff');
  const validation=await post(`/api/v1/privacy-operations/execution-handoff-packets/${handoff.payload.data.id}/evidence-validation-contracts`,securityAuth,'validation');
  const adapter=await post(`/api/v1/privacy-operations/evidence-validation-contracts/${validation.payload.data.id}/intake-adapter-contracts`,securityAuth,'adapter');
  const acceptance=await post(`/api/v1/privacy-operations/intake-adapter-contracts/${adapter.payload.data.id}/connection-acceptance-packets`,securityAuth,'acceptance');
  const queue=await post(`/api/v1/privacy-operations/connection-acceptance-packets/${acceptance.payload.data.id}/configuration-evidence-queue-contracts`,securityAuth,'queue');
  const envelope=await post(`/api/v1/privacy-operations/configuration-evidence-queue-contracts/${queue.payload.data.id}/submission-envelope-contracts`,securityAuth,'envelope');
  const governance=await post(`/api/v1/privacy-operations/submission-envelope-contracts/${envelope.payload.data.id}/reference-scheme-governance-contracts`,securityAuth,'governance');
  const target=await post(`/api/v1/privacy-operations/reference-scheme-governance-contracts/${governance.payload.data.id}/reference-target-validation-contracts`,securityAuth,'target');
  const proofHandoff=await post(`/api/v1/privacy-operations/reference-target-validation-contracts/${target.payload.data.id}/reference-proof-handoff-contracts`,securityAuth,'proof-handoff');
  const intake=await post(`/api/v1/privacy-operations/reference-proof-handoff-contracts/${proofHandoff.payload.data.id}/reference-proof-intake-contracts`,securityAuth,'intake');
  const quarantine=await post(`/api/v1/privacy-operations/reference-proof-intake-contracts/${intake.payload.data.id}/quarantine-readiness-contracts`,securityAuth,'quarantine');
  assert.equal(quarantine.response.status,201);
  return {studentAuth,operatorAuth,securityAuth,transition,intakeId:intake.payload.data.id,quarantine};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)test('scanner readiness defines fail-closed scanner policy without reading, scanning, attesting, or releasing content',async()=>{
  const context=await prepareQuarantineContract();
  const quarantineId=context.quarantine.payload.data.id;
  const path=`/api/v1/privacy-operations/quarantine-readiness-contracts/${quarantineId}/scanner-readiness-contracts`;
  assert.equal((await post(path,context.operatorAuth,'operator-denied')).response.status,403);
  const first=await post(path,context.securityAuth,'scanner-1');
  assert.equal(first.response.status,201);
  assert.equal(first.payload.data.status,'SCANNER_READINESS_POLICY_ONLY_EXTERNAL_ATTESTATION_MISSING');
  assert.equal(first.payload.data.revision,1);
  assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.deepEqual([
    first.payload.data.contract_manifest.trust_requirements.length,
    first.payload.data.contract_manifest.signature_freshness_controls.length,
    first.payload.data.contract_manifest.execution_stages.length,
    first.payload.data.contract_manifest.failure_policies.length,
    first.payload.data.contract_manifest.attestation_required_fields.length
  ],[8,7,9,10,12]);
  assert.equal(first.payload.data.contract_manifest.approved_scanner_engines.length,0);
  assert.equal(first.payload.data.requirements.length,6);
  assert.equal(first.payload.data.requirements.every((item)=>item.approved_scanner_engines.length===0&&item.scanner_identity_status==='MISSING_EXTERNAL'&&item.signature_database_status==='MISSING_EXTERNAL'),true);
  assert.equal(first.payload.data.requirements.every((item)=>item.object_reference===null&&item.scan_result===null&&item.attestation_reference===null),true);
  assert.equal(first.payload.data.requirements.every((item)=>!item.object_read_allowed&&!item.scan_execution_allowed&&!item.retry_execution_allowed&&!item.attestation_write_allowed&&!item.release_decision_write_allowed&&!item.quarantine_release_allowed),true);
  assert.equal(first.payload.data.boundary.object_read_enabled,false);
  assert.equal(first.payload.data.boundary.primary_scan_execution_enabled,false);
  assert.equal(first.payload.data.boundary.attestation_write_enabled,false);
  assert.equal(first.payload.data.scanner_execution_authorized,false);
  assert.equal(first.payload.data.attestation_write_authorized,false);
  assert.equal(first.payload.data.network_connection_authorized,false);
  assert.equal(first.payload.data.execution_authorized,false);

  const second=await post(path,context.securityAuth,'scanner-2');
  assert.equal(second.response.status,201);
  assert.equal(second.payload.data.revision,2);
  assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);
  const newerQuarantine=await post(`/api/v1/privacy-operations/reference-proof-intake-contracts/${context.intakeId}/quarantine-readiness-contracts`,context.securityAuth,'newer-quarantine');
  assert.equal(newerQuarantine.response.status,201);
  const stale=await post(path,context.securityAuth,'stale-scanner');
  assert.equal(stale.response.status,409);
  assert.equal(stale.payload.error.code,'SCANNER_READINESS_QUARANTINE_SUPERSEDED');

  const readPath=`${baseUrl}/api/v1/privacy-operations/scanner-readiness-contracts/${second.payload.data.id}`;
  assert.equal((await fetch(readPath,{headers:{authorization:context.operatorAuth}})).status,200);
  assert.equal((await fetch(readPath,{headers:{authorization:context.studentAuth}})).status,403);
  for(const suffix of ['object-reads','scans','retries','attestations','release']){
    assert.equal((await post(`/api/v1/privacy-operations/scanner-readiness-contracts/${second.payload.data.id}/${suffix}`,context.securityAuth,`unsupported-${suffix}`)).response.status,404);
  }
  const completion=await context.transition('COMPLETED',{reason_code:'SCANNER_POLICY_PRESENT',evidence_reference:'LOCAL-EVIDENCE/no-execution-phase42',evidence_sha256:'5'.repeat(64)});
  assert.equal(completion.response.status,409);
  assert.equal(completion.payload.error.code,'PRIVACY_FULFILMENT_EXECUTOR_DISABLED');
});
