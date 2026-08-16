import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProgressReport} from '../../../developer/src/report/progress-report.mjs';

test('progress report calculates rates and difficult topics', () => {
  const report = buildProgressReport({
    attempts:[{outcome:'CORRECT',topicId:'t1'},{outcome:'INCORRECT',topicId:'t2'},{outcome:'CORRECT',topicId:'t1'}],
    reviews:[{outcome:'RECALLED'},{outcome:'MISSED'}]
  });
  assert.equal(report.accuracy, 2/3);
  assert.equal(report.reviewRecall, 0.5);
  assert.deepEqual(report.difficultTopics, ['t2']);
  assert.equal(report.dataSufficient, true);
});
