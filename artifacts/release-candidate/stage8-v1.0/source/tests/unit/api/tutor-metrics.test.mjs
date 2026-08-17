import test from 'node:test';
import assert from 'node:assert/strict';
import {createMathChakChakServer} from '../../../developer/src/api/server.mjs';
import {createTutorOperations,resolveTutorOperationsPolicy} from '../../../developer/src/agent/tutor-operations.mjs';

test('metrics endpoint includes AI tutor controls without exposing configuration secrets',async(t)=>{
  const tutorOperations=createTutorOperations({policy:resolveTutorOperationsPolicy({})});
  tutorOperations.recordTurn({mode:'RULE_FALLBACK',fallbackReason:'FEATURE_DISABLED'});
  const server=createMathChakChakServer({
    repository:{health:async()=>true},
    auth:{allowedOrigins:[],localDemoEnabled:false,allowTrustedHeaders:true},
    tutorOperations
  });
  await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise((resolve)=>server.close(resolve)));
  const address=server.address();
  const response=await fetch(`http://127.0.0.1:${address.port}/metrics`);
  const body=await response.text();
  assert.equal(response.status,200);
  assert.match(body,/mathchakchak_tutor_turns_total 1/);
  assert.match(body,/mathchakchak_tutor_fallback_reason_total\{reason="FEATURE_DISABLED"\} 1/);
  assert.doesNotMatch(body,/OPENAI_API_KEY|Bearer /);
});
