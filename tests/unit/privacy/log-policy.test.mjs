import test from 'node:test';
import assert from 'node:assert/strict';
import {containsDeniedTelemetryKey, sanitizeTelemetry} from '../../../developer/src/privacy/log-policy.mjs';

test('telemetry sanitizer removes sensitive keys recursively', () => {
  const value = {locale:'ko',answerText:'secret',nested:{problem_text:'private',duration:42}};
  const sanitized = sanitizeTelemetry(value);
  assert.deepEqual(sanitized, {locale:'ko',nested:{duration:42}});
  assert.equal(containsDeniedTelemetryKey(sanitized), false);
});
