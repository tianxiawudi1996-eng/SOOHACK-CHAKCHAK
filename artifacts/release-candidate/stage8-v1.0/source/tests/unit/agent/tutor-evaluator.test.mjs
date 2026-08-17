import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {runTutorEvaluation} from '../../../developer/src/agent/tutor-evaluator.mjs';

const dataset=JSON.parse(fs.readFileSync(new URL('../../../developer/evals/tutor-golden-cases.v1.json',import.meta.url),'utf8'));

test('golden matrix covers eight locales, four scenarios, and adversarial candidates',async()=>{
  const report=await runTutorEvaluation(dataset);
  assert.equal(report.summary.golden_cases,32);
  assert.equal(report.summary.golden_passed,32);
  assert.equal(report.summary.adversarial_cases,9);
  assert.equal(report.summary.adversarial_blocked,9);
  assert.equal(report.summary.pass_rate,1);
  assert.equal(report.summary.status,'PASS');
  assert.equal(report.provider_live_tested,false);
});
