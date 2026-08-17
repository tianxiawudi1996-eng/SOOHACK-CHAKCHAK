import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('client/operations/index.html','utf8');
const app=fs.readFileSync('client/operations/app.js','utf8');
const messages=fs.readFileSync('client/operations/messages.mjs','utf8');

test('operations console keeps teacher writes and parent read-only views in one role-aware shell',()=>{
  for(const token of ['/api/v1/local-demo/${state.role}/session','/overview','/assignments','/interventions','/transition'])assert.ok(app.includes(token),`missing ${token}`);
  assert.match(app,/state\.role==='parent'/);
  assert.match(app,/data\.capabilities\.assign/);
  assert.match(html,/id="teacherRole"/);
  assert.match(html,/id="parentRole"/);
  assert.match(html,/id="teacherActions"/);
  assert.doesNotMatch(html,/onclick=/);
});

test('operations console supports eight locales and does not consume raw answer schemas',()=>{
  for(const locale of ['ko','zh-CN','ja','en','es','fr','it','ru'])assert.ok(messages.includes(locale));
  for(const forbidden of ['accepted_values','response_value','problem_text','contact_reference'])assert.doesNotMatch(app,new RegExp(forbidden));
  assert.match(messages,/raw answers/);
  assert.match(app,/textContent/);
});
