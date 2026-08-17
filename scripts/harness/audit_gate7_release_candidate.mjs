import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = async (relativePath) => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const sha256 = async (relativePath) => createHash('sha256').update(await fs.readFile(path.join(root, relativePath))).digest('hex');
const failures = [];
const qaPath = 'docs/stage8/evidence/gate7/GATE7_RELEASE_BLOCKING_QA_v1.0.json';
const browserPath = 'docs/stage8/evidence/gate7/GATE7_BROWSER_ACCESSIBILITY_QA_v1.0.json';
const releasePath = 'artifacts/release-candidate/stage8-v1.0/release-manifest.json';
const qa = await readJson(qaPath);
const browser = await readJson(browserPath);
const release = await readJson(releasePath);
const harness = await readJson('harness/status.json');

if (harness.gate6?.status !== 'VERIFIED' || harness.release_candidate_fixed !== true) failures.push('GATE6_PREREQUISITE_INVALID');
if (!['IN_PROGRESS', 'VERIFIED'].includes(harness.gate7?.status) || harness.gate7?.entry_allowed !== true) failures.push('GATE7_HARNESS_STATE_INVALID');
if (release.status !== 'FROZEN' || release.rc_sha256 !== harness.release_candidate_sha256) failures.push('RELEASE_CANDIDATE_IDENTITY_INVALID');
if (qa.status !== 'PASS' || qa.result !== 'RELEASE_BLOCKING_QA_PASS' || qa.release_candidate?.rc_sha256 !== release.rc_sha256) failures.push('GATE7_QA_RESULT_INVALID');
if (qa.release_candidate?.workspace_source_match_before !== true || qa.release_candidate?.workspace_source_match_after !== true || qa.release_candidate?.drift_before?.length || qa.release_candidate?.drift_after?.length) failures.push('QA_SOURCE_DRIFT_INVALID');
if (qa.summary?.command_pass_count !== 14 || qa.summary?.command_expected_count !== 14 || qa.summary?.unit_tests !== '336/336 PASS' || qa.summary?.integration_tests !== '61/61 PASS' || qa.summary?.p0_defects !== 0) failures.push('QA_SUMMARY_INVALID');
if (qa.data_boundary?.actual_child_data_used !== false || qa.data_boundary?.synthetic_local_database_only !== true || qa.data_boundary?.external_deployment_performed !== false) failures.push('QA_DATA_BOUNDARY_INVALID');
if (qa.claim_boundary?.automated_qa_is_product_owner_release_approval !== false || qa.claim_boundary?.automated_accessibility_is_human_screen_reader_approval !== false) failures.push('QA_CLAIM_BOUNDARY_INVALID');
if (browser.status !== 'PASS' || Object.keys(browser.checks || {}).length !== 6 || Object.values(browser.checks || {}).some((item) => item.status !== 'PASS') || browser.failures?.length) failures.push('BROWSER_ACCESSIBILITY_INVALID');
if (release.external_deployment?.performed !== false || release.external_deployment?.claimed !== false) failures.push('UNSAFE_EXTERNAL_DEPLOYMENT_CLAIM');

const evidence = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 7,
  audited_at: new Date().toISOString(),
  status: failures.length === 0 ? 'VERIFIED' : 'FAIL',
  release_candidate_sha256: release.rc_sha256,
  evidence: [
    { path: qaPath, sha256: await sha256(qaPath) },
    { path: browserPath, sha256: await sha256(browserPath) },
    { path: releasePath, sha256: await sha256(releasePath) },
  ],
  release_blocking_commands: `${qa.summary?.command_pass_count || 0}/${qa.summary?.command_expected_count || 14}`,
  unit_tests: qa.summary?.unit_tests,
  integration_tests: qa.summary?.integration_tests,
  browser_accessibility_checks: qa.summary?.browser_accessibility_checks,
  p0_defects: qa.summary?.p0_defects,
  external_deployment_performed: false,
  gate8_entry_allowed: failures.length === 0,
  failures,
};
const outputPath = path.join(root, 'docs/stage8/evidence/gate7/GATE7_RELEASE_CANDIDATE_AUDIT_v1.0.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

console.log(`GATE7_RELEASE_CANDIDATE_AUDIT_${evidence.status}`);
console.log(`commands=${evidence.release_blocking_commands} unit=${evidence.unit_tests} integration=${evidence.integration_tests}`);
console.log(`p0_defects=${evidence.p0_defects} gate8_entry=${evidence.gate8_entry_allowed}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
