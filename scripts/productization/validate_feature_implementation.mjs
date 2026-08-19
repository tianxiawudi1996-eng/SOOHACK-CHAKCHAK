import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const fail = (message) => { console.error(`FEATURE_IMPLEMENTATION_FAIL: ${message}`); process.exit(1); };
const contract = readJson('developer/contracts/feature-contract.json');
const implementation = readJson('developer/contracts/feature-implementation.json');
const gate5Review = readJson('docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_MANUAL_REVIEW_v1.0.json');
const gate5Audit = readJson('docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json');

const allowedStatuses = new Set([
  'E2E_VERIFIED_LOCAL',
  'UI_AVAILABLE_LOCAL',
  'AUTO_VERIFIED_HUMAN_REVIEW_REQUIRED',
  'RULE_ENGINE_ONLY',
  'CODED_NOT_AUTOMATED',
  'CODED_NO_END_USER_UI',
  'RUNTIME_WIRED_LOCAL_PARTIAL',
  'CODED_LOCAL_CONTROLS',
  'RUNTIME_VERIFIED_LOCAL',
  'RUNTIME_WIRED_LOCAL_ONLY',
  'APPROVED_NOT_RUNTIME_WIRED'
]);

if (contract.features.length !== 16 || implementation.features.length !== 16) fail('feature count mismatch');
const contractIds = new Set(contract.features.map((feature) => feature.id));
if (implementation.features.some((feature) => !contractIds.has(feature.id))) fail('unknown implementation feature');
if (new Set(implementation.features.map((feature) => feature.id)).size !== 16) fail('duplicate implementation feature');
if (implementation.schema_version !== '1.1.0' || implementation.status !== 'TRUTHFUL_CAPABILITY_BASELINE') fail('truthful capability schema missing');

for (const feature of implementation.features) {
  if (!fs.existsSync(path.join(root, feature.source))) fail(`source missing for ${feature.id}`);
  const testPath = contract.features.find((item) => item.id === feature.id)?.unit_test;
  if (!testPath || !fs.existsSync(path.join(root, testPath))) fail(`test missing for ${feature.id}`);
  if (!allowedStatuses.has(feature.status)) fail(`unsupported capability status for ${feature.id}`);
  if (feature.status === 'IMPLEMENTED') fail(`ambiguous IMPLEMENTED status is forbidden for ${feature.id}`);
  if (feature.production_ready !== false) fail(`production readiness must not be inferred for ${feature.id}`);
  if (typeof feature.gap !== 'string' || !feature.gap.trim()) fail(`remaining gap missing for ${feature.id}`);
}

const counts = {
  total: implementation.features.length,
  production_ready: implementation.features.filter((feature) => feature.production_ready).length,
  end_user_verified_local: implementation.features.filter((feature) => ['E2E_VERIFIED_LOCAL','UI_AVAILABLE_LOCAL'].includes(feature.status)).length,
  human_review_required: implementation.features.filter((feature) => feature.status === 'AUTO_VERIFIED_HUMAN_REVIEW_REQUIRED').length,
  rule_engine_only: implementation.features.filter((feature) => feature.status === 'RULE_ENGINE_ONLY').length,
  code_only_or_partial: implementation.features.filter((feature) => ['CODED_NOT_AUTOMATED','CODED_NO_END_USER_UI','RUNTIME_WIRED_LOCAL_PARTIAL','CODED_LOCAL_CONTROLS'].includes(feature.status)).length,
  local_runtime_support: implementation.features.filter((feature) => ['RUNTIME_VERIFIED_LOCAL','RUNTIME_WIRED_LOCAL_ONLY'].includes(feature.status)).length,
  approved_not_runtime_wired: implementation.features.filter((feature) => feature.status === 'APPROVED_NOT_RUNTIME_WIRED').length
};
if (JSON.stringify(counts) !== JSON.stringify(implementation.summary)) fail('capability summary does not match feature records');
if (counts.production_ready !== 0) fail('production readiness cannot be inferred from local verification');

if (gate5Review.status !== 'APPROVED' || gate5Review.decision !== 'APPROVE' || gate5Review.scope_acknowledged !== true || gate5Review.approval_applied !== true || gate5Review.next_gate_allowed !== true) fail('Gate 5 manual approval evidence invalid');
if (!Object.values(gate5Review.checks ?? {}).every((value) => value === true)) fail('Gate 5 review checks incomplete');
if (gate5Audit.status !== 'VERIFIED' || gate5Audit.automated_status !== 'PASS' || gate5Audit.manual_approval_count !== 1 || gate5Audit.next_gate_allowed !== true) fail('Gate 5 audit not verified');

console.log('FEATURE_CAPABILITY_TRUTH_PASS');
console.log(`features=${counts.total}/${counts.total}`);
console.log(`end_user_verified_local=${counts.end_user_verified_local}/${counts.total}`);
console.log(`production_ready=${counts.production_ready}/${counts.total}`);
console.log(`rule_engine_only=${counts.rule_engine_only}/${counts.total}`);
console.log(`human_review_required=${counts.human_review_required}/${counts.total}`);
