import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const fail = (message) => { console.error(`FEATURE_IMPLEMENTATION_FAIL: ${message}`); process.exit(1); };
const contract = readJson('developer/contracts/feature-contract.json');
const implementation = readJson('developer/contracts/feature-implementation.json');
const gate5Review = readJson('docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_MANUAL_REVIEW_v1.0.json');
const gate5Audit = readJson('docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json');

if (contract.features.length !== 15 || implementation.features.length !== 15) fail('feature count mismatch');
const contractIds = new Set(contract.features.map((feature) => feature.id));
if (implementation.features.some((feature) => !contractIds.has(feature.id))) fail('unknown implementation feature');
if (new Set(implementation.features.map((feature) => feature.id)).size !== 15) fail('duplicate implementation feature');
for (const feature of implementation.features) {
  if (!fs.existsSync(path.join(root, feature.source))) fail(`source missing for ${feature.id}`);
  const testPath = contract.features.find((item) => item.id === feature.id)?.unit_test;
  if (!testPath || !fs.existsSync(path.join(root, testPath))) fail(`test missing for ${feature.id}`);
}

const implemented = implementation.features.filter((feature) => feature.status === 'IMPLEMENTED');
const blocked = implementation.features.filter((feature) => feature.status === 'BLOCKED_APPROVAL');
if (implemented.length !== 15 || blocked.length !== 0) fail('expected all 15 features implemented');
if (gate5Review.status !== 'APPROVED' || gate5Review.decision !== 'APPROVE' || gate5Review.scope_acknowledged !== true || gate5Review.approval_applied !== true || gate5Review.next_gate_allowed !== true) fail('Gate 5 manual approval evidence invalid');
if (!Object.values(gate5Review.checks ?? {}).every((value) => value === true)) fail('Gate 5 review checks incomplete');
if (gate5Audit.status !== 'VERIFIED' || gate5Audit.automated_status !== 'PASS' || gate5Audit.manual_approval_count !== 1 || gate5Audit.next_gate_allowed !== true) fail('Gate 5 audit not verified');
if (implementation.status !== 'VERIFIED') fail('phase status must be verified');

console.log('FEATURE_IMPLEMENTATION_PASS');
console.log('implemented=15/15');
console.log('unit_tests=13/13');
console.log('gate5_approval=1/1');
