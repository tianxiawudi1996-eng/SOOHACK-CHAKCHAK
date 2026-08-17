import crypto from 'node:crypto';
import {isPrivacyRequestType} from './data-rights.mjs';
import {APPROVAL_ROLES} from './fulfilment-controls.mjs';

export const FULFILMENT_PACKAGE_SCHEMA_VERSION='1.0.0';
export const DEFAULT_PACKAGE_VALIDITY_SECONDS=24*60*60;

function iso(value){
  return value instanceof Date?value.toISOString():new Date(value).toISOString();
}

export function hashCanonical(value){
  return crypto.createHash('sha256').update(canonicalManifest(value)).digest('hex');
}

export function impactSnapshot(value){
  return {
    profile_rows:Number(value.profile_rows),
    diagnostic_sessions:Number(value.diagnostic_sessions),
    learning_sessions:Number(value.learning_sessions),
    review_items:Number(value.review_items),
    formula_sessions:Number(value.formula_sessions),
    preserved_privacy_records:Number(value.preserved_privacy_records),
    active_legal_hold:Boolean(value.active_legal_hold)
  };
}

export function hashImpactSnapshot(value){
  return hashCanonical(impactSnapshot(value));
}

export function approvalBundleSnapshot(approvals){
  return approvals.map(({approval_role,decision,reason_code,decided_at})=>({
    approval_role,decision,reason_code,decided_at:iso(decided_at)
  })).sort((a,b)=>a.approval_role.localeCompare(b.approval_role));
}

export function hashApprovalBundle(approvals){
  return hashCanonical(approvalBundleSnapshot(approvals));
}

export function buildPackageManifestPayload({
  id,planId,requestId,requestType,policyVersion,executionMode,assessmentSha256,
  approvalBundleSha256,revision,predecessorManifestId=null,sealedAt,expiresAt
}){
  return {
    schema_version:FULFILMENT_PACKAGE_SCHEMA_VERSION,
    manifest_id:id,
    fulfilment_plan_id:planId,
    privacy_request_id:requestId,
    request_type:requestType,
    policy_version:policyVersion,
    execution_mode:executionMode,
    assessment_sha256:assessmentSha256,
    approval_bundle_sha256:approvalBundleSha256,
    revision:Number(revision),
    predecessor_manifest_id:predecessorManifestId,
    sealed_at:iso(sealedAt),
    expires_at:iso(expiresAt)
  };
}

export function packageLifecycleStatus({expiresAt,successorManifestId=null,activeLegalHold=false,now=new Date()}){
  if(successorManifestId)return 'SUPERSEDED';
  if(activeLegalHold)return 'BLOCKED_LEGAL_HOLD';
  if(new Date(expiresAt).getTime()<=new Date(now).getTime())return 'EXPIRED_REVALIDATION_REQUIRED';
  return 'SEALED_VALID';
}

export function mapFulfilmentPackage(row,{checkpoint=null,now=new Date()}={}){
  return {
    id:row.id,
    fulfilment_plan_id:row.fulfilment_plan_id,
    privacy_request_id:row.privacy_request_id,
    request_type:row.request_type,
    revision:Number(row.revision),
    predecessor_manifest_id:row.predecessor_manifest_id,
    successor_manifest_id:row.successor_manifest_id??null,
    policy_version:row.policy_version,
    execution_mode:row.execution_mode,
    assessment_sha256:row.assessment_sha256,
    approval_bundle_sha256:row.approval_bundle_sha256,
    manifest_sha256:row.manifest_sha256,
    sealed_at:row.sealed_at,
    expires_at:row.expires_at,
    lifecycle_status:packageLifecycleStatus({
      expiresAt:row.expires_at,successorManifestId:row.successor_manifest_id,
      activeLegalHold:Boolean(row.active_legal_hold),now
    }),
    recovery_checkpoint:checkpoint?{
      id:checkpoint.id,
      recovery_mode:checkpoint.recovery_mode,
      checkpoint_sha256:checkpoint.checkpoint_sha256,
      recorded_at:checkpoint.recorded_at
    }:null
  };
}

export function fulfilmentPackageBoundary(){
  return {
    manifest_immutable:true,
    lifecycle_append_only:true,
    expired_package_executable:false,
    revalidation_requires_unchanged_impact:true,
    recovery_mode:'NO_MUTATION_BASELINE',
    destructive_executor_enabled:false,
    completion_transition_enabled:false
  };
}

export const FULFILMENT_PACKAGE_TTL_MS=DEFAULT_PACKAGE_VALIDITY_SECONDS*1000;
export const FULFILMENT_PACKAGE_STATUS='DRY_RUN_ONLY';
const ID_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const SHA256_PATTERN=/^[0-9a-f]{64}$/;

function packageError(code,message){
  const error=new Error(message);
  error.code=code;
  return error;
}

function freezeDeep(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function canonicalize(value){
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalize(value[key])]));
  return value;
}

export function canonicalManifest(value){
  return JSON.stringify(canonicalize(value));
}

export function sha256(value){
  return crypto.createHash('sha256').update(typeof value==='string'?value:canonicalManifest(value)).digest('hex');
}

function packageIso(value,label){
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))throw packageError('INVALID_TIME',`${label} must be an ISO timestamp`);
  return date.toISOString();
}

function validId(value,label){
  if(typeof value!=='string'||!ID_PATTERN.test(value))throw packageError('INVALID_ID',`${label} is invalid`);
  return value;
}

function validSha(value,label){
  if(typeof value!=='string'||!SHA256_PATTERN.test(value))throw packageError('INVALID_SHA256',`${label} is invalid`);
  return value;
}

function safeArtifact(artifact,index){
  if(!artifact||typeof artifact!=='object')throw packageError('INVALID_ARTIFACT',`artifact ${index} is invalid`);
  const artifactId=validId(artifact.artifact_id,`artifact ${index} id`);
  const relativePath=typeof artifact.relative_path==='string'?artifact.relative_path:'';
  if(!relativePath||relativePath.startsWith('/')||/^[A-Za-z]:[\\/]/.test(relativePath)||relativePath.split(/[\\/]/).includes('..'))throw packageError('UNSAFE_ARTIFACT_PATH',`artifact ${artifactId} path is not relative`);
  const purpose=typeof artifact.purpose==='string'&&/^[A-Z][A-Z0-9_]{2,63}$/.test(artifact.purpose)?artifact.purpose:null;
  if(!purpose)throw packageError('INVALID_ARTIFACT_PURPOSE',`artifact ${artifactId} purpose is invalid`);
  const rowCount=Number(artifact.row_count);
  if(!Number.isSafeInteger(rowCount)||rowCount<0)throw packageError('INVALID_ARTIFACT_COUNT',`artifact ${artifactId} row_count is invalid`);
  return {artifact_id:artifactId,relative_path:relativePath,purpose,row_count:rowCount,content_sha256:validSha(artifact.content_sha256,`artifact ${artifactId} content_sha256`)};
}

function approvalSummary(approvals){
  if(!Array.isArray(approvals)||approvals.length!==APPROVAL_ROLES.length)throw packageError('DUAL_APPROVAL_REQUIRED','exactly two approval records are required');
  const seen=new Set();
  const summary=approvals.map((approval,index)=>{
    const role=approval?.approval_role;
    if(!APPROVAL_ROLES.includes(role))throw packageError('INVALID_APPROVAL_ROLE',`approval ${index} role is invalid`);
    if(approval.decision!=='APPROVE')throw packageError('APPROVAL_NOT_GRANTED',`approval ${role} is not approved`);
    const approver=validId(approval.approver_user_id,`approval ${role} approver`);
    if(seen.has(approver))throw packageError('DISTINCT_APPROVER_REQUIRED','approval identities must be distinct');
    seen.add(approver);
    return {approval_role:role,decision:'APPROVE',approval_reference:validId(approval.approval_reference,`approval ${role} reference`),decided_at:packageIso(approval.decided_at,`approval ${role} decided_at`),approver_fingerprint:sha256(approver)};
  });
  if(new Set(summary.map(item=>item.approval_role)).size!==APPROVAL_ROLES.length)throw packageError('DUAL_APPROVAL_REQUIRED','privacy and security approvals are both required');
  return summary.sort((left,right)=>left.approval_role.localeCompare(right.approval_role));
}

export function createFulfilmentPackage(input){
  if(!input||typeof input!=='object')throw packageError('INVALID_PACKAGE_INPUT','package input is required');
  const requestId=validId(input.request_id,'request_id');
  if(!isPrivacyRequestType(input.request_type))throw packageError('INVALID_REQUEST_TYPE','request_type is not supported');
  const sourceRevision=validSha(input.source_revision,'source_revision');
  if(input.legal_hold_active===true)throw packageError('LEGAL_HOLD_ACTIVE','active legal hold blocks package creation');
  if(input.source_mutation===true)throw packageError('SOURCE_MUTATION_FORBIDDEN','source mutation is forbidden');
  if(!Array.isArray(input.artifacts)||input.artifacts.length===0)throw packageError('ARTIFACTS_REQUIRED','at least one artifact is required');
  const artifacts=input.artifacts.map(safeArtifact).sort((left,right)=>left.artifact_id.localeCompare(right.artifact_id));
  const createdAt=packageIso(input.created_at??new Date(),'created_at');
  const expiresAt=packageIso(input.expires_at??new Date(new Date(createdAt).getTime()+FULFILMENT_PACKAGE_TTL_MS),'expires_at');
  if(new Date(expiresAt).getTime()<=new Date(createdAt).getTime())throw packageError('INVALID_EXPIRY','expires_at must be after created_at');
  const approvals=approvalSummary(input.approvals);
  const packageId=validId(input.package_id??`pkg-${requestId}-${sourceRevision.slice(0,12)}`,'package_id');
  const manifest={schema_version:FULFILMENT_PACKAGE_SCHEMA_VERSION,package_id:packageId,request_id:requestId,request_type:input.request_type,source_revision:sourceRevision,artifacts,source_mutation:false};
  const manifestSha256=sha256(manifest);
  const checkpoint={checkpoint_id:`checkpoint-${packageId}`,package_id:packageId,source_revision:sourceRevision,manifest_sha256:manifestSha256,created_at:createdAt,restore_policy:'REQUIRE_SOURCE_REVISION_AND_MANIFEST_MATCH',source_mutation:false};
  return freezeDeep({schema_version:FULFILMENT_PACKAGE_SCHEMA_VERSION,package_id:packageId,status:FULFILMENT_PACKAGE_STATUS,execution_mode:'DRY_RUN_ONLY',created_at:createdAt,expires_at:expiresAt,manifest,manifest_sha256:manifestSha256,approvals,checkpoint,revalidation_required:true,source_mutation:false});
}

export function revalidateFulfilmentPackage(pkg,{now=new Date(),sourceRevision,manifestSha256}={}){
  const failures=[];
  const nowMs=new Date(now).getTime();
  if(!Number.isFinite(nowMs))failures.push('INVALID_NOW');
  if(pkg?.status!==FULFILMENT_PACKAGE_STATUS||pkg?.execution_mode!=='DRY_RUN_ONLY')failures.push('EXECUTION_MODE_INVALID');
  if(pkg?.source_mutation===true||pkg?.manifest?.source_mutation===true)failures.push('SOURCE_MUTATION_FORBIDDEN');
  const recomputed=pkg?.manifest?sha256(pkg.manifest):null;
  if(!recomputed||recomputed!==pkg.manifest_sha256)failures.push('MANIFEST_HASH_MISMATCH');
  if(manifestSha256&&manifestSha256!==pkg.manifest_sha256)failures.push('CURRENT_MANIFEST_HASH_MISMATCH');
  if(sourceRevision&&sourceRevision!==pkg.manifest?.source_revision)failures.push('SOURCE_REVISION_MISMATCH');
  if(Number.isFinite(nowMs)&&new Date(pkg?.expires_at).getTime()<=nowMs)failures.push('PACKAGE_EXPIRED');
  return {valid:failures.length===0,failures,manifest_sha256:recomputed};
}

export function restoreRecoveryCheckpoint(pkg,checkpoint,{now=new Date(),sourceRevision,manifestSha256}={}){
  const validation=revalidateFulfilmentPackage(pkg,{now,sourceRevision,manifestSha256});
  if(!validation.valid)return {restored:false,validation};
  if(!checkpoint||checkpoint.package_id!==pkg.package_id||checkpoint.manifest_sha256!==pkg.manifest_sha256)return {restored:false,validation:{valid:false,failures:['CHECKPOINT_MISMATCH']}};
  return {restored:true,validation,checkpoint_id:checkpoint.checkpoint_id,package_id:pkg.package_id,source_mutation:false};
}
