import test from 'node:test';
import assert from 'node:assert/strict';
import {createTutorKernel} from '../../../developer/src/agent/tutor-kernel.mjs';
import {
  createTutorOperations,
  resolveTutorOperationsPolicy,
  TUTOR_OPERATIONS_DEFAULTS
} from '../../../developer/src/agent/tutor-operations.mjs';

const context={
  locale:'en',stage:'REPEAT',outcome:'INCORRECT',misconception_code:'ADD_DENOMINATORS',hint_level:1,
  formula_title:'Adding fractions',formula_notation:'a/b + c/d',step_prompt:'What should you check?',
  step_hint:'Check whether the pieces are the same size.'
};

function policy(overrides={}){
  return {...resolveTutorOperationsPolicy({TUTOR_AI_ENABLED:'true'}),...overrides};
}

function validResult(overrides={}){
  return {
    model_reference:TUTOR_OPERATIONS_DEFAULTS.modelReference,
    prompt_version:TUTOR_OPERATIONS_DEFAULTS.promptVersion,
    usage:{input_tokens:30,output_tokens:20},
    output:{
      chakchaki:'Try one more connection.',gongsickyi:'Check whether the denominator rule applies.',
      next_action:'RETRY',strategy:'VERIFY_RULE'
    },
    ...overrides
  };
}

test('feature flag and emergency kill switch fail closed without provider calls',async()=>{
  let calls=0;
  const provider={generate:async()=>{calls+=1;return validResult();}};
  const disabled=createTutorOperations({policy:resolveTutorOperationsPolicy({})});
  const disabledTurn=await createTutorKernel({provider,operations:disabled}).generate(context);
  assert.equal(disabledTurn.fallback_reason,'FEATURE_DISABLED');
  const killed=createTutorOperations({policy:policy({killSwitch:true})});
  const killedTurn=await createTutorKernel({provider,operations:killed}).generate(context);
  assert.equal(killedTurn.fallback_reason,'EMERGENCY_KILL_SWITCH');
  assert.equal(calls,0);
});

test('approved model and prompt pins admit a measured generative turn',async()=>{
  const operations=createTutorOperations({policy:policy()});
  const provider={generate:async()=>validResult()};
  const turn=await createTutorKernel({provider,operations}).generate(context);
  const snapshot=operations.snapshot();
  assert.equal(turn.mode,'GENERATIVE_ASSISTED');
  assert.equal(snapshot.provider_attempts,1);
  assert.equal(snapshot.provider_attempts_total,1);
  assert.equal(snapshot.generative_turns,1);
  assert.equal(snapshot.input_tokens,30);
  assert.equal(snapshot.output_tokens,20);
  assert.equal(snapshot.output_tokens_total,20);
});

test('unapproved runtime version is denied before external execution',async()=>{
  let calls=0;
  const operations=createTutorOperations({policy:policy({modelReference:'unapproved-model'})});
  assert.equal(operations.isProviderConfigurationApproved(),false);
  const turn=await createTutorKernel({provider:{generate:async()=>{calls+=1;return validResult();}},operations}).generate(context);
  assert.equal(turn.fallback_reason,'VERSION_PIN_MISMATCH');
  assert.equal(calls,0);
});

test('daily request envelope stops additional provider attempts',async()=>{
  let calls=0;
  const operations=createTutorOperations({policy:policy({dailyRequestLimit:1})});
  const provider={generate:async()=>{calls+=1;return validResult();}};
  assert.equal((await createTutorKernel({provider,operations}).generate(context)).mode,'GENERATIVE_ASSISTED');
  const blocked=await createTutorKernel({provider,operations}).generate(context);
  assert.equal(blocked.fallback_reason,'BUDGET_EXHAUSTED');
  assert.equal(calls,1);
});

test('three provider failures open the circuit and cooldown probe closes it',async()=>{
  let now=Date.parse('2026-08-10T00:00:00Z'),calls=0,healthy=false;
  const operations=createTutorOperations({policy:policy(),now:()=>now});
  const provider={generate:async()=>{
    calls+=1;
    if(!healthy)throw new Error('UPSTREAM_FAILURE');
    return validResult();
  }};
  const kernel=createTutorKernel({provider,operations});
  for(let index=0;index<3;index+=1)assert.equal((await kernel.generate(context)).mode,'RULE_FALLBACK');
  assert.equal(operations.snapshot().circuit_state,'OPEN');
  const blocked=await kernel.generate(context);
  assert.equal(blocked.fallback_reason,'CIRCUIT_OPEN');
  assert.equal(calls,3);
  now+=TUTOR_OPERATIONS_DEFAULTS.circuitCooldownMs;
  healthy=true;
  assert.equal((await kernel.generate(context)).mode,'GENERATIVE_ASSISTED');
  assert.equal(operations.snapshot().circuit_state,'CLOSED');
});

test('unsafe provider output is counted and exposed without personal data labels',async()=>{
  const operations=createTutorOperations({policy:policy()});
  const unsafe=validResult({output:{
    chakchaki:'The answer is 5/6.',gongsickyi:'The answer is 5/6.',next_action:'RETRY',strategy:'VERIFY_RULE'
  }});
  const turn=await createTutorKernel({provider:{generate:async()=>unsafe},operations}).generate(context);
  const metrics=operations.renderMetrics();
  assert.equal(turn.mode,'RULE_FALLBACK');
  assert.equal(operations.snapshot().safety_rejections,1);
  assert.match(metrics,/mathchakchak_tutor_safety_rejections_total 1/);
  assert.match(metrics,/mathchakchak_tutor_provider_latency_ms_average/);
  assert.doesNotMatch(metrics,/student|email|phone/i);
});
