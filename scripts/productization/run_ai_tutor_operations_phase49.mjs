import fs from 'node:fs';
import crypto from 'node:crypto';
import {createTutorKernel} from '../../developer/src/agent/tutor-kernel.mjs';
import {
  createTutorOperations,
  resolveTutorOperationsPolicy,
  TUTOR_OPERATIONS_DEFAULTS
} from '../../developer/src/agent/tutor-operations.mjs';

const evidencePath='docs/productization/evidence/PHASE_49_AI_TUTOR_OPERATIONS_QA.json';
const contractPath='developer/contracts/ai-tutor-operations-v1.json';
const scenarios=[];
const context={
  locale:'en',stage:'REPEAT',outcome:'INCORRECT',misconception_code:'ADD_DENOMINATORS',hint_level:1,
  formula_title:'Adding fractions',formula_notation:'a/b + c/d',step_prompt:'What should you check?',
  step_hint:'Check whether the pieces are the same size.'
};

function policy(overrides={}){return {...resolveTutorOperationsPolicy({TUTOR_AI_ENABLED:'true'}),...overrides};}
function validResult(){return {
  model_reference:TUTOR_OPERATIONS_DEFAULTS.modelReference,prompt_version:TUTOR_OPERATIONS_DEFAULTS.promptVersion,
  usage:{input_tokens:30,output_tokens:20},output:{
    chakchaki:'Try one more connection.',gongsickyi:'Check whether the denominator rule applies.',
    next_action:'RETRY',strategy:'VERIFY_RULE'
  }
};}
function record(id,passed,observed){scenarios.push({id,passed,observed});}

{
  let calls=0;
  const operations=createTutorOperations({policy:resolveTutorOperationsPolicy({})});
  const turn=await createTutorKernel({operations,provider:{generate:async()=>{calls+=1;return validResult();}}}).generate(context);
  record('feature-default-off',turn.fallback_reason==='FEATURE_DISABLED'&&calls===0,{mode:turn.mode,reason:turn.fallback_reason,provider_calls:calls});
}
{
  let calls=0;
  const operations=createTutorOperations({policy:policy({killSwitch:true})});
  const turn=await createTutorKernel({operations,provider:{generate:async()=>{calls+=1;return validResult();}}}).generate(context);
  record('emergency-kill-switch',turn.fallback_reason==='EMERGENCY_KILL_SWITCH'&&calls===0,{reason:turn.fallback_reason,provider_calls:calls});
}
{
  let calls=0;
  const operations=createTutorOperations({policy:policy({promptVersion:'unapproved-prompt'})});
  const turn=await createTutorKernel({operations,provider:{generate:async()=>{calls+=1;return validResult();}}}).generate(context);
  record('version-pin-mismatch',turn.fallback_reason==='VERSION_PIN_MISMATCH'&&calls===0,{reason:turn.fallback_reason,provider_calls:calls});
}
{
  let calls=0;
  const operations=createTutorOperations({policy:policy({dailyRequestLimit:1})});
  const provider={generate:async()=>{calls+=1;return validResult();}};
  const kernel=createTutorKernel({operations,provider});
  const first=await kernel.generate(context),second=await kernel.generate(context);
  record('daily-budget-envelope',first.mode==='GENERATIVE_ASSISTED'&&second.fallback_reason==='BUDGET_EXHAUSTED'&&calls===1,
    {first:first.mode,second_reason:second.fallback_reason,provider_calls:calls});
}
{
  let now=Date.parse('2026-08-10T00:00:00Z'),calls=0,healthy=false;
  const operations=createTutorOperations({policy:policy(),now:()=>now});
  const provider={generate:async()=>{calls+=1;if(!healthy)throw new Error('UPSTREAM_FAILURE');return validResult();}};
  const kernel=createTutorKernel({operations,provider});
  for(let index=0;index<3;index+=1)await kernel.generate(context);
  const blocked=await kernel.generate(context),openState=operations.snapshot().circuit_state;
  record('circuit-opens-after-threshold',openState==='OPEN'&&blocked.fallback_reason==='CIRCUIT_OPEN'&&calls===3,
    {state:openState,blocked_reason:blocked.fallback_reason,provider_calls:calls});
  now+=TUTOR_OPERATIONS_DEFAULTS.circuitCooldownMs;
  healthy=true;
  const recovered=await kernel.generate(context),closedState=operations.snapshot().circuit_state;
  record('half-open-probe-recovery',recovered.mode==='GENERATIVE_ASSISTED'&&closedState==='CLOSED',
    {mode:recovered.mode,state:closedState,provider_calls:calls});
}
{
  const operations=createTutorOperations({policy:policy()});
  const unsafe={...validResult(),output:{
    chakchaki:'The answer is 5/6.',gongsickyi:'The answer is 5/6.',next_action:'RETRY',strategy:'VERIFY_RULE'
  }};
  const turn=await createTutorKernel({operations,provider:{generate:async()=>unsafe}}).generate(context);
  const snapshot=operations.snapshot();
  record('unsafe-output-fallback-and-signal',turn.mode==='RULE_FALLBACK'&&snapshot.safety_rejections===1,
    {mode:turn.mode,safety_rejections:snapshot.safety_rejections});
}

const contractBytes=fs.readFileSync(contractPath);
const passed=scenarios.filter((scenario)=>scenario.passed).length;
const evidence={
  schema_version:'1.0.0',phase:49,generated_at:new Date().toISOString(),
  status:passed===scenarios.length?'AUTO_QA_PASS_LOCAL_OPERATIONS_CONTROL':'FAIL',
  external_provider_live_tested:false,openai_api_key_accessed:false,external_deployment_performed:false,
  contract_sha256:crypto.createHash('sha256').update(contractBytes).digest('hex'),
  summary:{scenarios:scenarios.length,passed,failed:scenarios.length-passed},
  scenarios,
  controls:{
    feature_flag_default_off:true,emergency_kill_switch:true,version_pins:3,
    request_and_token_budgets:3,circuit_states:3,automatic_application_retries:0,
    deterministic_fallback:true,personal_data_metric_labels:false
  },
  external_blockers:[
    'APPROVED_OPENAI_PROJECT_AND_SECRET_MANAGER','PLATFORM_RATE_AND_SPEND_LIMITS',
    'IMMUTABLE_MODEL_SNAPSHOT_CONFIRMATION','HUMAN_EVAL_CALIBRATION',
    'UNDER_18_DATA_CONTROL_REVIEW','CENTRAL_DURABLE_METRICS_AND_ALERT_ROUTE'
  ]
};
fs.writeFileSync(evidencePath,`${JSON.stringify(evidence,null,2)}\n`);
if(evidence.status!=='AUTO_QA_PASS_LOCAL_OPERATIONS_CONTROL'){
  console.error('PHASE49_AI_TUTOR_OPERATIONS_FAIL');
  for(const scenario of scenarios.filter((item)=>!item.passed))console.error(scenario.id);
  process.exit(1);
}
console.log('PHASE49_AI_TUTOR_OPERATIONS_PASS');
console.log(`scenarios=${passed}/${scenarios.length}`);
console.log('external_provider_live_tested=false');
console.log('external_deployment_performed=false');
