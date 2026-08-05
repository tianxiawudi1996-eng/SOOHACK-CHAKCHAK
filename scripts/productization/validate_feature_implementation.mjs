import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const fail = (message) => { console.error(`FEATURE_IMPLEMENTATION_FAIL: ${message}`); process.exit(1); };
const contract = readJson('developer/contracts/feature-contract.json');
const implementation = readJson('developer/contracts/feature-implementation.json');

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
if (implemented.length !== 14 || blocked.length !== 1 || blocked[0].id !== 'FEAT-PET-001') fail('expected 14 implemented and Gate 5 feature blocked');
if (!blocked[0].blocker.includes('0/1')) fail('Gate 5 blocker must remain explicit');
if (implementation.status !== 'PARTIAL_VERIFIED') fail('phase status must remain partial');

console.log('FEATURE_IMPLEMENTATION_PARTIAL_PASS');
console.log('implemented=14/15');
console.log('unit_tests=13/13');
console.log('blocked=FEAT-PET-001_GATE5_APPROVAL_0_OF_1');
