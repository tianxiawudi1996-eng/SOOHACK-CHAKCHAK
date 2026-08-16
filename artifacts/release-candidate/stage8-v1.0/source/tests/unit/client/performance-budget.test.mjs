import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePerformance,PERFORMANCE_BUDGET} from '../../../scripts/productization/performance_budget.mjs';

const passing = {
  performanceScore:90, accessibilityScore:100, bestPracticesScore:100,
  fcp:1800, lcp:2500, tbt:200, cls:0.1, speedIndex:3400, transferBytes:350000,
};

test('Phase 23 performance budget accepts every inclusive boundary',()=>{
  const result=evaluatePerformance(passing);
  assert.equal(result.pass,true);
  assert.equal(Object.values(result.checks).every(Boolean),true);
});

test('Phase 23 performance budget identifies the failed metric',()=>{
  const result=evaluatePerformance({...passing,cls:0.101,lcp:2501});
  assert.equal(result.pass,false);
  assert.equal(result.checks.cls,false);
  assert.equal(result.checks.lcp,false);
  assert.equal(PERFORMANCE_BUDGET.singleAssetBytesMax,100000);
});
