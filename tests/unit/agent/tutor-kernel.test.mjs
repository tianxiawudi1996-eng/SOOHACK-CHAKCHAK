import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTutorModelInput,createTutorKernel,validateTutorTurn} from '../../../developer/src/agent/tutor-kernel.mjs';

const context={locale:'ko',stage:'REPEAT',outcome:'INCORRECT',misconception_code:'ADD_DENOMINATORS',hint_level:1,
  formula_title:'분모가 다른 분수의 덧셈',formula_notation:'a/b + c/d',step_prompt:'어떻게 계산할까요?',step_hint:'같은 크기의 조각인지 확인해요.',
  response_value:{value:'2/5'},expected_response:{value:'5/6'},student_id:'secret-student'};

test('model input excludes learner identity, raw response, and expected answer',()=>{
  const input=buildTutorModelInput(context),serialized=JSON.stringify(input);
  assert.equal(serialized.includes('secret-student'),false);
  assert.equal(serialized.includes('response_value'),false);
  assert.equal(serialized.includes('expected_response'),false);
  assert.equal(input.misconception_code,'ADD_DENOMINATORS');
});

test('validated provider output becomes a generative-assisted turn',async()=>{
  const provider={generate:async()=>({model_reference:'test-model',output:{
    chakchaki:'어떤 조각의 크기를 먼저 맞춰야 할까?',gongsickyi:'분모는 조각의 크기라는 규칙부터 확인해 보자.',
    next_action:'RETRY',strategy:'CONNECT_REPRESENTATION'
  }})};
  const turn=await createTutorKernel({provider}).generate(context);
  assert.equal(turn.mode,'GENERATIVE_ASSISTED');
  assert.equal(turn.model_reference,'test-model');
  assert.equal(turn.safety_status,'VALIDATED');
});

test('answer-revealing output is rejected and replaced with safe fallback',async()=>{
  const provider={generate:async()=>({model_reference:'bad-model',output:{
    chakchaki:'정답은 5/6이야.',gongsickyi:'확인 완료.',next_action:'RETRY',strategy:'VERIFY_RULE'
  }})};
  const turn=await createTutorKernel({provider}).generate(context);
  assert.equal(turn.mode,'RULE_FALLBACK');
  assert.equal(turn.fallback_reason,'PROVIDER_OR_VALIDATION_FAILURE');
  assert.equal(validateTutorTurn({
    chakchaki:turn.chakchaki,gongsickyi:turn.gongsickyi,next_action:turn.next_action,strategy:turn.strategy
  },context.outcome),true);
});

test('missing provider keeps the lesson available with localized fallback',async()=>{
  const turn=await createTutorKernel().generate(context);
  assert.equal(turn.mode,'RULE_FALLBACK');
  assert.equal(turn.next_action,'RETRY');
  assert.equal(turn.model_reference,null);
});
