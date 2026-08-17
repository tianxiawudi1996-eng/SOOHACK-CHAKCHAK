import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('client/academy/index.html','utf8');
const app=fs.readFileSync('client/academy/app.js','utf8');
const messages=fs.readFileSync('client/academy/messages.mjs','utf8');

test('academy dashboard exposes four evidence-gated specialist tracks',()=>{
  for(const track of ['CONCEPT_RECOVERY','SCHOOL_EXAM','ADVANCED_REASONING','CONTEST_BRIDGE'])assert.match(app,new RegExp(track));
  assert.match(app,/academy-readiness\?target=/);
  assert.match(html,/id="metricsGrid"/);
  assert.match(html,/id="actionList"/);
  assert.match(html,/id="curriculumFormulaGrid"/);
  assert.match(app,/academy-curriculum\?target=/);
  assert.match(app,/EVIDENCE_GATED_FALLBACK/);
  assert.match(app,/textContent=formula\.explanation/);
  assert.doesNotMatch(app,/accepted_values/);
});

test('academy dashboard preserves eight locales and privacy disclosure',()=>{
  for(const locale of ['ko','zh-CN','ja','en','es','fr','it','ru'])assert.ok(messages.includes(locale));
  assert.match(messages,/raw answers/);
  assert.match(messages,/CURRICULUM_MESSAGES/);
  assert.doesNotMatch(html,/onclick=/);
});
