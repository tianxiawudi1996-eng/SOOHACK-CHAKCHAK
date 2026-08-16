import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectTutorOutput} from '../../../developer/src/agent/tutor-safety.mjs';

const valid={chakchaki:'조각의 크기를 먼저 연결해 보자.',gongsickyi:'분모가 뜻하는 규칙을 확인하자.',next_action:'RETRY',strategy:'CONNECT_REPRESENTATION'};

test('safe dual-character Korean output passes every deterministic gate',()=>{
  assert.deepEqual(inspectTutorOutput(valid,{outcome:'INCORRECT',locale:'ko'}),{passed:true,failures:[]});
});

test('answer, PII, shame, role collapse, locale mismatch, and action mismatch are classified',()=>{
  const cases=[
    [{...valid,chakchaki:'정답은 5/6이야.'},'ANSWER_LEAK'],
    [{...valid,chakchaki:'learner@example.com을 확인했어.'},'PII_EXPOSURE'],
    [{...valid,chakchaki:'바보 같은 답이야.'},'SHAMING_LANGUAGE'],
    [{...valid,gongsickyi:valid.chakchaki},'ROLE_COLLAPSE'],
    [{...valid,chakchaki:'Try again.',gongsickyi:'Check the rule.'},'LOCALE_MISMATCH'],
    [{...valid,next_action:'CONTINUE'},'NEXT_ACTION_MISMATCH']
  ];
  for(const [candidate,expected] of cases)assert.ok(inspectTutorOutput(candidate,{outcome:'INCORRECT',locale:'ko'}).failures.includes(expected));
});
