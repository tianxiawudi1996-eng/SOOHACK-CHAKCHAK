import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const readJson = async (relativePath) => JSON.parse(await fs.readFile(path.resolve(root, relativePath), 'utf8'));
const sha256 = async (relativePath) => crypto.createHash('sha256').update(await fs.readFile(path.resolve(root, relativePath))).digest('hex');
const failures = [];
const mappingPath = 'docs/stage8/evidence/gate6/GATE6_PRODUCT_INTEGRATION_EVIDENCE_MAP_v1.0.json';
const mapping = await readJson(mappingPath);
const harness = await readJson('harness/status.json');
const productStatus = await readJson('docs/productization/STATUS.json');
const gate5Review = await readJson('docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_MANUAL_REVIEW_v1.0.json');
const expectedClosureIds = [
  'GATE6_RESPONSIVE_RUNTIME_360_768_1024_1200',
  'GATE6_LINT_AND_RUNTIME_TYPE_CONTRACT',
  'GATE6_CONTENT_ADDRESSED_RELEASE_CANDIDATE',
];

if (mapping.schema_version !== '1.0.0' || mapping.stage !== 8 || mapping.gate !== 6) failures.push('MAPPING_IDENTITY_INVALID');
if (mapping.workflow_status !== 'VERIFIED' || mapping.result !== 'PASS') failures.push('MAPPING_STATUS_INVALID');
if (harness.gate5?.status !== 'VERIFIED' || gate5Review.status !== 'APPROVED' || gate5Review.decision !== 'APPROVE' || gate5Review.approval_applied !== true) failures.push('GATE5_PREREQUISITE_INVALID');
if (harness.gate6?.status !== 'VERIFIED' || harness.gate6?.entry_allowed !== true || harness.gate6?.blockers?.length !== 0) failures.push('GATE6_HARNESS_STATUS_INVALID');
const mappedRcSha256 = mapping.closure_evidence?.find((item) => item.id === 'GATE6_CONTENT_ADDRESSED_RELEASE_CANDIDATE')?.rc_sha256;
if (harness.release_candidate_fixed !== true || !mappedRcSha256 || harness.release_candidate_sha256 !== mappedRcSha256) failures.push('RC_HARNESS_IDENTITY_INVALID');
if (harness.gate7?.entry_allowed !== true || !['IN_PROGRESS', 'VERIFIED'].includes(harness.gate7?.status) || mapping.gate7_entry_allowed !== true) failures.push('GATE7_ENTRY_INVALID');
if (mapping.external_deployment_performed !== false || mapping.product_release_authorized !== false) failures.push('UNSAFE_RELEASE_CLAIM');
if (mapping.phase_mappings?.length !== 4 || JSON.stringify(mapping.phase_mappings.map((item) => item.phase)) !== JSON.stringify([5, 6, 7, 8])) failures.push('PHASE_MAPPING_SET_INVALID');
if (productStatus.stage8_dependency?.gate6_status !== 'VERIFIED' || productStatus.stage8_dependency?.gate7_status !== harness.gate7?.status || productStatus.stage8_dependency?.gate6_evidence_map !== mappingPath) failures.push('PRODUCT_STATUS_STAGE8_DRIFT');

for (const source of [mapping.prerequisite, ...mapping.phase_mappings]) {
  for (const key of source === mapping.prerequisite ? ['manual_review', 'audit'] : ['evidence']) {
    const relativePath = source[`${key}_path`];
    const expectedHash = source[`${key}_sha256`];
    if (!relativePath || !expectedHash || await sha256(relativePath) !== expectedHash) failures.push(`SOURCE_HASH_INVALID:${relativePath || key}`);
  }
}

for (const closure of mapping.closure_evidence || []) {
  if (closure.status !== 'PASS' || !closure.evidence_path || !closure.evidence_sha256) {
    failures.push(`CLOSURE_EVIDENCE_INVALID:${closure.id || 'unknown'}`);
    continue;
  }
  if (await sha256(closure.evidence_path) !== closure.evidence_sha256) failures.push(`CLOSURE_HASH_INVALID:${closure.evidence_path}`);
}

if (mapping.phase_mappings[0]?.status !== 'PASS_WITH_GATE6_RESPONSIVE_CLOSURE') failures.push('PHASE5_CLOSURE_INVALID');
if (productStatus.phases?.['6']?.status !== 'VERIFIED') failures.push('PHASE6_STATUS_INVALID');
const phase7 = await readJson(mapping.phase_mappings[2].evidence_path);
const phase8 = await readJson(mapping.phase_mappings[3].evidence_path);
if (phase7.status !== 'PASS_LOCAL_STAGING' || phase7.external_deployment?.performed !== false) failures.push('PHASE7_EVIDENCE_INVALID');
if (phase8.status !== 'PASS' || phase8.result !== 'FULL_INTEGRATION_PASS_LOCAL_ISOLATED') failures.push('PHASE8_EVIDENCE_INVALID');
if (JSON.stringify(mapping.closure_evidence?.map((item) => item.id)) !== JSON.stringify(expectedClosureIds)) failures.push('CLOSURE_SET_INVALID');
const releaseManifest = await readJson('artifacts/release-candidate/stage8-v1.0/release-manifest.json');
if (releaseManifest.status !== 'FROZEN' || releaseManifest.rc_sha256 !== harness.release_candidate_sha256 || releaseManifest.external_deployment?.performed !== false) failures.push('RELEASE_CANDIDATE_INVALID');

console.log(`GATE6_PRODUCT_INTEGRATION_MAPPING_${failures.length ? 'FAIL' : 'PASS'}`);
console.log(`gate6=${mapping.workflow_status} phase_mappings=${mapping.phase_mappings?.length || 0}/4 closure_evidence=${mapping.closure_evidence?.length || 0}/3`);
console.log(`gate7_entry=${mapping.gate7_entry_allowed} external_deployment=${mapping.external_deployment_performed} release=${mapping.product_release_authorized}`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
