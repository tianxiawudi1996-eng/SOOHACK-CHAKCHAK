import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approvalBundleSnapshot,buildPackageManifestPayload,fulfilmentPackageBoundary,
  createFulfilmentPackage,hashApprovalBundle,hashCanonical,hashImpactSnapshot,packageLifecycleStatus,
  restoreRecoveryCheckpoint,revalidateFulfilmentPackage,sha256
} from '../../../developer/src/privacy/fulfilment-package.mjs';

const packageInput={
  request_id:'request-29',request_type:'EXPORT',source_revision:'a'.repeat(64),created_at:'2026-08-07T10:00:00.000Z',
  artifacts:[
    {artifact_id:'learning-summary',relative_path:'package/learning-summary.json',purpose:'LEARNING_SUMMARY',row_count:3,content_sha256:'b'.repeat(64)},
    {artifact_id:'request-audit',relative_path:'package/request-audit.json',purpose:'REQUEST_AUDIT',row_count:1,content_sha256:'c'.repeat(64)}
  ],
  approvals:[
    {approval_role:'PRIVACY_APPROVER',decision:'APPROVE',approver_user_id:'privacy-approver-1',approval_reference:'approval-privacy-29',decided_at:'2026-08-07T10:01:00.000Z'},
    {approval_role:'SECURITY_APPROVER',decision:'APPROVE',approver_user_id:'security-approver-1',approval_reference:'approval-security-29',decided_at:'2026-08-07T10:02:00.000Z'}
  ]
};

test('canonical dry-run package keeps raw actor identifiers and source mutation out',()=>{
  assert.equal(sha256({b:2,a:1}),sha256({a:1,b:2}));
  const pkg=createFulfilmentPackage(packageInput);
  assert.equal(pkg.execution_mode,'DRY_RUN_ONLY');
  assert.equal(pkg.source_mutation,false);
  assert.equal(JSON.stringify(pkg).includes('privacy-approver-1'),false);
  assert.equal(Object.isFrozen(pkg),true);
});

test('dry-run package rejects expiry, revision drift, manifest tampering, and unsafe inputs',()=>{
  const pkg=createFulfilmentPackage(packageInput);
  assert.equal(revalidateFulfilmentPackage(pkg,{now:'2026-08-07T10:05:00.000Z',sourceRevision:packageInput.source_revision}).valid,true);
  assert.deepEqual(revalidateFulfilmentPackage(pkg,{now:'2026-08-08T10:01:00.000Z',sourceRevision:packageInput.source_revision}).failures,['PACKAGE_EXPIRED']);
  assert.deepEqual(revalidateFulfilmentPackage(pkg,{now:'2026-08-07T10:05:00.000Z',sourceRevision:'d'.repeat(64)}).failures,['SOURCE_REVISION_MISMATCH']);
  const tampered={...pkg,manifest:{...pkg.manifest,artifacts:[...pkg.manifest.artifacts,{artifact_id:'unexpected',relative_path:'package/unexpected.json',purpose:'REQUEST_AUDIT',row_count:0,content_sha256:'e'.repeat(64)}]}};
  assert.equal(revalidateFulfilmentPackage(tampered,{now:'2026-08-07T10:05:00.000Z'}).valid,false);
  assert.throws(()=>createFulfilmentPackage({...packageInput,artifacts:[{...packageInput.artifacts[0],relative_path:'../outside.json'}]}),{code:'UNSAFE_ARTIFACT_PATH'});
  assert.throws(()=>createFulfilmentPackage({...packageInput,legal_hold_active:true}),{code:'LEGAL_HOLD_ACTIVE'});
});

test('recovery checkpoint restore is revision-bound and non-mutating',()=>{
  const pkg=createFulfilmentPackage(packageInput);
  const restored=restoreRecoveryCheckpoint(pkg,pkg.checkpoint,{now:'2026-08-07T10:05:00.000Z',sourceRevision:packageInput.source_revision,manifestSha256:pkg.manifest_sha256});
  assert.equal(restored.restored,true);
  assert.equal(restored.source_mutation,false);
  assert.equal(restoreRecoveryCheckpoint(pkg,pkg.checkpoint,{now:'2026-08-07T10:05:00.000Z',sourceRevision:'d'.repeat(64)}).restored,false);
  assert.equal(pkg.status,'DRY_RUN_ONLY');
});

test('package lifecycle derives validity without mutating the sealed manifest',()=>{
  const expiresAt='2026-08-07T12:00:00.000Z';
  assert.equal(packageLifecycleStatus({expiresAt,now:'2026-08-07T11:59:59.000Z'}),'SEALED_VALID');
  assert.equal(packageLifecycleStatus({expiresAt,now:expiresAt}),'EXPIRED_REVALIDATION_REQUIRED');
  assert.equal(packageLifecycleStatus({expiresAt,activeLegalHold:true,now:'2026-08-07T11:00:00.000Z'}),'BLOCKED_LEGAL_HOLD');
  assert.equal(packageLifecycleStatus({expiresAt,successorManifestId:'next',now:'2026-08-08T11:00:00.000Z'}),'SUPERSEDED');
});

test('approval bundle hash is stable regardless of query order',()=>{
  const privacy={approval_role:'PRIVACY_APPROVER',decision:'APPROVE',reason_code:'PRIVACY_OK',decided_at:'2026-08-07T10:00:00Z'};
  const security={approval_role:'SECURITY_APPROVER',decision:'APPROVE',reason_code:'SECURITY_OK',decided_at:'2026-08-07T10:01:00Z'};
  assert.deepEqual(approvalBundleSnapshot([security,privacy]).map((item)=>item.approval_role),['PRIVACY_APPROVER','SECURITY_APPROVER']);
  assert.equal(hashApprovalBundle([privacy,security]),hashApprovalBundle([security,privacy]));
});

test('manifest and impact hashes bind every approved package input',()=>{
  const impact={profile_rows:1,diagnostic_sessions:2,learning_sessions:3,review_items:4,formula_sessions:5,preserved_privacy_records:6,active_legal_hold:false};
  assert.match(hashImpactSnapshot(impact),/^[0-9a-f]{64}$/);
  const payload=buildPackageManifestPayload({
    id:'manifest-1',planId:'plan-1',requestId:'request-1',requestType:'DELETION',policyVersion:'v1',
    executionMode:'DRY_RUN_ONLY',assessmentSha256:'a'.repeat(64),approvalBundleSha256:'b'.repeat(64),
    revision:1,sealedAt:'2026-08-07T10:00:00Z',expiresAt:'2026-08-08T10:00:00Z'
  });
  assert.match(hashCanonical(payload),/^[0-9a-f]{64}$/);
  assert.notEqual(hashCanonical(payload),hashCanonical({...payload,revision:2}));
});

test('package boundary keeps execution disabled after sealing and revalidation',()=>{
  const boundary=fulfilmentPackageBoundary();
  assert.equal(boundary.manifest_immutable,true);
  assert.equal(boundary.lifecycle_append_only,true);
  assert.equal(boundary.expired_package_executable,false);
  assert.equal(boundary.destructive_executor_enabled,false);
  assert.equal(boundary.completion_transition_enabled,false);
});
