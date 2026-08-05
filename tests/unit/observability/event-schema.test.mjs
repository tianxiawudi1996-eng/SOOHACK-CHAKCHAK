import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvent} from '../../../developer/src/observability/event-schema.mjs';

const envelope = {eventName:'learning.step.completed',schemaVersion:'1.0',requestId:'r1',release:'dev',locale:'ko'};

test('event schema accepts safe properties and rejects answer text', () => {
  assert.equal(validateEvent({...envelope,properties:{step:2,duration:40}}).valid, true);
  const denied = validateEvent({...envelope,properties:{nested:{answer_text:'4'}}});
  assert.equal(denied.valid, false);
  assert.ok(denied.errors.includes('SENSITIVE_PROPERTY_DENIED'));
});
