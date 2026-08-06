import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`OPERATIONS_VALIDATION_FAIL: ${message}`); process.exit(1); };
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const slo = readJson('infra/operations/slo-contract.json');
const alerts = readJson('infra/operations/alert-rules.json');
const maintenance = readJson('infra/operations/maintenance-contract.json');
const evidence = readJson('docs/productization/evidence/PHASE_9_OPERATIONS_QA.json');
const status = readJson('docs/productization/STATUS.json');
const compose = read('infra/deployment/compose.api-staging.yaml');
const auth = read('developer/src/api/auth.mjs');
const metrics = read('developer/src/api/metrics.mjs');
const retention = read('infra/database/maintenance/retention_audit.sql');

if (slo.service !== 'MathChakChak' || slo.slos.availability_percent !== 99.9 || slo.slos.database_backup_rpo_hours !== 24 || slo.slos.service_restore_rto_hours !== 4) fail('SLO baseline invalid');
if (slo.local_rehearsal_thresholds.api_p95_ms !== 500 || slo.signals.prometheus_metrics !== '/metrics') fail('local SLI contract invalid');
if (alerts.rules.length !== 5 || alerts.production_notifications_enabled !== false || alerts.notification_target !== 'EXTERNAL_CONFIGURATION_REQUIRED') fail('alert boundary invalid');
if (maintenance.cycles.length !== 7 || maintenance.release_policy.rollback_required !== true) fail('maintenance cycle invalid');
if (!compose.includes('SESSION_HMAC_SECRET: ${MATHCHAKCHAK_STAGE_SESSION_SECRET:?') || !compose.includes('ALLOW_TRUSTED_TEST_HEADERS: "false"')) fail('runtime secret or trust-header boundary invalid');
if (!auth.includes('timingSafeEqual') || !auth.includes("EXPECTED_AUDIENCE = 'mathchakchak-api'")) fail('signed session verification invalid');
if (!metrics.includes('mathchakchak_http_server_errors_total') || !metrics.includes('mathchakchak_http_request_duration_ms_bucket')) fail('runtime metrics invalid');
if (!retention.includes('expires_at <= now()') || !retention.includes("interval '24 months'")) fail('retention audit invalid');
if (evidence.status !== 'PASS_LOCAL_OPERATIONS' || evidence.backup_restore.status !== 'PASS' || evidence.authentication.status !== 'PASS' || evidence.runtime_observability.status !== 'PASS') fail('operations evidence invalid');
if (evidence.external_operations.status !== 'BLOCKED_EXTERNAL_CONFIGURATION' || evidence.external_operations.performed !== false) fail('external operations were inferred');
if (status.phases['9'].status !== 'PARTIAL_VERIFIED') fail('Phase 9 status boundary invalid');

console.log('OPERATIONS_LOCAL_PASS');
console.log('signed_session_auth=PASS');
console.log('runtime_observability=PASS');
console.log('backup_restore=PASS');
console.log('maintenance_contract=PASS');
console.log('external_operations=BLOCKED_CONFIGURATION');
