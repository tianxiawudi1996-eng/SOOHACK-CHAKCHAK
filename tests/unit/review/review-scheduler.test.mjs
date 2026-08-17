import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleNextReview} from '../../../developer/src/review/review-scheduler.mjs';

test('review schedule expands on recall and resets on miss', () => {
  assert.deepEqual(scheduleNextReview({outcome:'RECALLED',currentIntervalDays:3,attemptedAt:'2026-01-01T00:00:00Z'}), {intervalDays:7,nextDueAt:'2026-01-08T00:00:00.000Z'});
  assert.equal(scheduleNextReview({outcome:'MISSED',currentIntervalDays:14,attemptedAt:'2026-01-01T00:00:00Z'}).intervalDays, 1);
});
