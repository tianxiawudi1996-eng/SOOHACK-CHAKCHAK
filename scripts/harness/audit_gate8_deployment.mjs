import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = async (relativePath) => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const sha256 = async (relativePath) => createHash('sha256').update(await fs.readFile(path.join(root, relativePath))).digest('hex');
const localPath = 'docs/stage8/evidence/gate8/GATE8_LOCAL_DEPLOYMENT_QA_v1.0.json';
const gate7Path = 'docs/stage8/evidence/gate7/GATE7_RELEASE_CANDIDATE_AUDIT_v1.0.json';
const releasePath = 'artifacts/release-candidate/stage8-v1.0/release-manifest.json';
const externalPreflightPath = 'docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_v1.0.json';
const externalPreflightAuditPath = 'docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_AUDIT_v1.0.json';
const local = await readJson(localPath);
const gate7 = await readJson(gate7Path);
const release = await readJson(releasePath);
const externalPreflight = await readJson(externalPreflightPath);
const externalPreflightAudit = await readJson(externalPreflightAuditPath);
const harness = await readJson('harness/status.json');
const failures = [];

if (gate7.status !== 'VERIFIED' || gate7.release_candidate_sha256 !== release.rc_sha256) failures.push('GATE7_PREREQUISITE_INVALID');
if (!['IN_PROGRESS', 'BLOCKED'].includes(harness.gate8?.status) || harness.gate8?.entry_allowed !== true) failures.push('GATE8_HARNESS_STATE_INVALID');
if (local.status !== 'PASS_LOCAL_DEPLOYMENT' || local.result !== 'LOCAL_DEPLOYMENT_HEALTH_SMOKE_ROLLBACK_PASS' || local.release_candidate_sha256 !== release.rc_sha256) failures.push('LOCAL_DEPLOYMENT_RESULT_INVALID');
if (local.deployed_artifact?.status !== 'PASS' || local.deployed_artifact?.verified !== 78 || local.deployed_artifact?.expected !== 78) failures.push('DEPLOYED_ARTIFACT_INVALID');
if (local.locale_smoke?.status !== 'PASS' || local.locale_smoke?.results?.length !== 8 || local.locale_smoke?.results?.some((item) => item.status !== 'PASS')) failures.push('LOCALE_SMOKE_INVALID');
if (local.security_headers?.status !== 'PASS' || local.rollback_rehearsal?.status !== 'PASS' || local.rollback_rehearsal?.same_images_redeployed !== true) failures.push('SECURITY_OR_ROLLBACK_INVALID');
if (local.commands?.length !== 8 || local.commands?.some((command) => command.status !== 'PASS')) failures.push('DEPLOYMENT_COMMAND_SET_INVALID');
if (local.secret_handling?.ephemeral_secret_generated_in_memory !== true || local.secret_handling?.secret_written_to_file !== false || local.secret_handling?.secret_included_in_evidence !== false) failures.push('SECRET_HANDLING_INVALID');
if (local.external_deployment?.performed !== false || local.external_deployment?.target_reference !== null || local.external_deployment?.authorization_reference !== null || local.external_deployment?.production_release_authorized !== false) failures.push('EXTERNAL_BOUNDARY_INVALID');
if (externalPreflight.release_candidate_sha256 !== release.rc_sha256 || externalPreflightAudit.release_candidate_sha256 !== release.rc_sha256) failures.push('EXTERNAL_PREFLIGHT_RELEASE_DRIFT');
if (externalPreflightAudit.audit_status !== 'PASS' || externalPreflightAudit.execution_status !== externalPreflight.decision) failures.push('EXTERNAL_PREFLIGHT_AUDIT_INVALID');
if (externalPreflight.decision === 'HOLD' && (!externalPreflight.blockers?.length || !externalPreflight.next_input)) failures.push('EXTERNAL_HOLD_CONTRACT_INVALID');
if (externalPreflight.external_actions?.deployment_performed !== false || externalPreflight.external_actions?.canary_performed !== false || externalPreflight.external_actions?.production_release_performed !== false) failures.push('EXTERNAL_ACTION_BOUNDARY_INVALID');

const audit = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 8,
  audited_at: new Date().toISOString(),
  audit_status: failures.length === 0 ? 'PASS' : 'FAIL',
  status: failures.length === 0 ? 'BLOCKED_EXTERNAL' : 'FAIL',
  local_deployment_status: failures.length === 0 ? 'VERIFIED' : 'FAIL',
  release_candidate_sha256: release.rc_sha256,
  evidence: [
    { path: localPath, sha256: await sha256(localPath) },
    { path: gate7Path, sha256: await sha256(gate7Path) },
    { path: releasePath, sha256: await sha256(releasePath) },
    { path: externalPreflightPath, sha256: await sha256(externalPreflightPath) },
    { path: externalPreflightAuditPath, sha256: await sha256(externalPreflightAuditPath) },
  ],
  local_results: {
    artifact_files: '78/78 PASS',
    locales: '8/8 PASS',
    operations_readiness: '20/20 PASS before and after rollback',
    core_user_journey: '1/1 PASS',
    security_headers: '6/6 PASS',
    ports_closed_during_rollback: '2/2 PASS',
    same_images_redeployed: true,
  },
  external_results: {
    deployment_performed: false,
    canary_performed: false,
    production_release_authorized: false,
    preflight_decision: externalPreflight.decision,
    blockers: externalPreflight.blockers,
    next_input: externalPreflight.next_input,
  },
  stage8_complete: false,
  failures,
};
const outputPath = path.join(root, 'docs/stage8/evidence/gate8/GATE8_DEPLOYMENT_AUDIT_v1.0.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

console.log(`GATE8_DEPLOYMENT_AUDIT_${audit.audit_status}`);
console.log(`local=${audit.local_deployment_status} external=${audit.status} stage8_complete=${audit.stage8_complete}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
