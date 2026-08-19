import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app=fs.readFileSync(new URL('../../../client/diagnostic/app.js',import.meta.url),'utf8');
const lesson=fs.readFileSync(new URL('../../../client/math-learning/app.js',import.meta.url),'utf8');

test('diagnostic and lesson use the full social session without local demo tokens',()=>{
  assert.doesNotMatch(`${app}\n${lesson}`,/localStorage|sessionStorage|access_token|authorization:`Bearer|\/api\/v1\/local-demo/);
  assert.match(app,/\/api\/v1\/auth\/session/);
  assert.match(lesson,/\/api\/v1\/auth\/session/);
  assert.match(`${app}\n${lesson}`,/credentials:'include'/);
  assert.match(`${app}\n${lesson}`,/'x-csrf-token'/);
  assert.match(`${app}\n${lesson}`,/mcc_csrf/);
});

test('diagnostic requires an active student account and hands off only an owned path item identifier',()=>{
  assert.match(app,/account_status==='ACTIVE'/);
  assert.match(app,/auth_level==='FULL'/);
  assert.match(app,/role==='STUDENT'/);
  assert.match(app,/\/auth\/\?locale=/);
  assert.match(app,/learning_path_item_id/);
  assert.match(lesson,/searchParams\.get\('learning_path_item_id'\)/);
});

test('diagnostic UI does not request or render answer schemas',()=>{
  assert.match(app,/\/api\/v1\/diagnostic-items/);
  assert.doesNotMatch(app,/answer_schema|correct_answer|expected_response/);
});
