import test from 'node:test';import assert from 'node:assert/strict';import {hashCanonical} from '../../developer/src/privacy/fulfilment-package.mjs';
import {baseUrl,post,prepareQuarantineContract} from './api-external-reference-proof-scanner-readiness.test.mjs';

test('scan attestation policy remains empty and blocks validation, reconciliation, decision, and release',async()=>{
  const context=await prepareQuarantineContract();const quarantineId=context.quarantine.payload.data.id;
  const scanner=await post(`/api/v1/privacy-operations/quarantine-readiness-contracts/${quarantineId}/scanner-readiness-contracts`,context.securityAuth,'p43-scanner');assert.equal(scanner.response.status,201);
  const path=`/api/v1/privacy-operations/scanner-readiness-contracts/${scanner.payload.data.id}/scan-attestation-contracts`;
  assert.equal((await post(path,context.operatorAuth,'p43-denied')).response.status,403);
  const first=await post(path,context.securityAuth,'p43-first');assert.equal(first.response.status,201);assert.equal(first.payload.data.status,'SCAN_ATTESTATION_POLICY_ONLY_EXTERNAL_RESULTS_MISSING');assert.equal(hashCanonical(first.payload.data.contract_manifest),first.payload.data.contract_sha256);
  assert.deepEqual([first.payload.data.contract_manifest.verification_steps.length,first.payload.data.contract_manifest.result_enums.length,first.payload.data.contract_manifest.reconciliation_rules.length,first.payload.data.contract_manifest.failure_codes.length,first.payload.data.contract_manifest.release_guards.length],[10,4,8,12,10]);
  assert.equal(first.payload.data.contract_manifest.accepted_attestations.length,0);assert.equal(first.payload.data.requirements.length,6);assert.equal(first.payload.data.requirements.every(x=>x.object_reference===null&&x.primary_attestation_reference===null&&!x.result_intake_allowed&&!x.attestation_validation_execution_allowed&&!x.result_reconciliation_allowed&&!x.release_decision_write_allowed&&!x.quarantine_release_allowed),true);
  const second=await post(path,context.securityAuth,'p43-second');assert.equal(second.response.status,201);assert.equal(second.payload.data.revision,2);assert.equal(second.payload.data.predecessor_contract_id,first.payload.data.id);
  const newerScanner=await post(`/api/v1/privacy-operations/quarantine-readiness-contracts/${quarantineId}/scanner-readiness-contracts`,context.securityAuth,'p43-new-scanner');assert.equal(newerScanner.response.status,201);const stale=await post(path,context.securityAuth,'p43-stale');assert.equal(stale.response.status,409);assert.equal(stale.payload.error.code,'SCAN_ATTESTATION_SCANNER_SUPERSEDED');
  const read=`${baseUrl}/api/v1/privacy-operations/scan-attestation-contracts/${second.payload.data.id}`;assert.equal((await fetch(read,{headers:{authorization:context.operatorAuth}})).status,200);assert.equal((await fetch(read,{headers:{authorization:context.studentAuth}})).status,403);
  for(const suffix of ['results','validate','reconcile','release-decisions','release'])assert.equal((await post(`/api/v1/privacy-operations/scan-attestation-contracts/${second.payload.data.id}/${suffix}`,context.securityAuth,`p43-${suffix}`)).response.status,404);
});
