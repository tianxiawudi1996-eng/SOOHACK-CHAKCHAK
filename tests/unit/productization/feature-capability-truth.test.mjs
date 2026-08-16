import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const capability = JSON.parse(fs.readFileSync('developer/contracts/feature-implementation.json', 'utf8'));

test('feature capability contract separates local evidence from production readiness', () => {
  assert.equal(capability.schema_version, '1.1.0');
  assert.equal(capability.features.length, 15);
  assert.equal(capability.summary.production_ready, 0);
  assert.ok(capability.features.every((feature) => feature.production_ready === false));
  assert.ok(capability.features.every((feature) => feature.status !== 'IMPLEMENTED'));
  assert.ok(capability.features.every((feature) => typeof feature.gap === 'string' && feature.gap.length > 0));
});

test('rule engines and disconnected automation remain explicitly labelled', () => {
  const byId = Object.fromEntries(capability.features.map((feature) => [feature.id, feature]));
  assert.equal(byId['FEAT-HINT-001'].status, 'RUNTIME_WIRED_LOCAL_PARTIAL');
  assert.equal(byId['FEAT-FEED-001'].status, 'RUNTIME_WIRED_LOCAL_PARTIAL');
  assert.equal(byId['FEAT-REVIEW-001'].status, 'CODED_NOT_AUTOMATED');
  assert.equal(byId['FEAT-REPORT-001'].status, 'CODED_NO_END_USER_UI');
  assert.equal(byId['FEAT-PET-001'].status, 'APPROVED_NOT_RUNTIME_WIRED');
});
