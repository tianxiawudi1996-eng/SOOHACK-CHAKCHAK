import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app=fs.readFileSync(new URL('../../../client/diagnostic/app.js',import.meta.url),'utf8');
const lesson=fs.readFileSync(new URL('../../../client/math-learning/app.js',import.meta.url),'utf8');

test('diagnostic and handoff tokens remain memory-only',()=>{
  assert.match(app,/token:null/);
  assert.doesNotMatch(`${app}\n${lesson}`,/localStorage|sessionStorage|document\.cookie/);
  assert.match(lesson,/history\.replaceState/);
});

test('diagnostic UI does not request or render answer schemas',()=>{
  assert.match(app,/\/api\/v1\/diagnostic-items/);
  assert.doesNotMatch(app,/answer_schema|correct_answer|expected_response/);
});
