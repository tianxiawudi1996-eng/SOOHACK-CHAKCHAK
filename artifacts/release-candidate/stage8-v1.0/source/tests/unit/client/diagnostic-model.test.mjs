import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticProgress,recommendationMessageKeys,ROUTES} from '../../../client/diagnostic/model.mjs';

test('diagnostic progress is bounded and deterministic',()=>{
  assert.equal(diagnosticProgress(0,3),0);
  assert.equal(diagnosticProgress(1,3),33);
  assert.equal(diagnosticProgress(3,3),100);
});

test('all adaptive routes resolve to result copy keys',()=>{
  assert.deepEqual(ROUTES,['REMEDIATE','CORE','EXTEND']);
  for(const route of ROUTES) assert.deepEqual(recommendationMessageKeys(route),{title:`route.${route}.title`,description:`route.${route}.description`});
  assert.throws(()=>recommendationMessageKeys('UNKNOWN'),/INVALID_ROUTE/);
});
