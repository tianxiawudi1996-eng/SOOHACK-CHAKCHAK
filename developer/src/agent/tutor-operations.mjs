const DEFAULT_MODEL_REFERENCE='gpt-5.6-sol';
const DEFAULT_PROMPT_VERSION='mathchakchak-tutor-duo-v1.0.0';
const DEFAULT_EVAL_DATASET_VERSION='tutor-golden-cases.v1.0.0';

export const TUTOR_OPERATIONS_DEFAULTS=Object.freeze({
  modelReference:DEFAULT_MODEL_REFERENCE,
  promptVersion:DEFAULT_PROMPT_VERSION,
  evalDatasetVersion:DEFAULT_EVAL_DATASET_VERSION,
  requestTimeoutMs:1500,
  dailyRequestLimit:1000,
  dailyInputTokenLimit:1_000_000,
  dailyOutputTokenLimit:250_000,
  circuitFailureThreshold:3,
  circuitWindowMs:60_000,
  circuitCooldownMs:30_000
});

function positiveInteger(value,fallback){
  const parsed=Number.parseInt(value,10);
  return Number.isInteger(parsed)&&parsed>0?parsed:fallback;
}

export function resolveTutorOperationsPolicy(env={}){
  return {
    schemaVersion:'1.0.0',
    enabled:env.TUTOR_AI_ENABLED==='true',
    killSwitch:env.TUTOR_AI_KILL_SWITCH==='true',
    approvedModelReference:DEFAULT_MODEL_REFERENCE,
    modelReference:env.TUTOR_AI_MODEL||DEFAULT_MODEL_REFERENCE,
    approvedPromptVersion:DEFAULT_PROMPT_VERSION,
    promptVersion:env.TUTOR_AI_PROMPT_VERSION||DEFAULT_PROMPT_VERSION,
    evalDatasetVersion:DEFAULT_EVAL_DATASET_VERSION,
    requestTimeoutMs:positiveInteger(env.TUTOR_AI_TIMEOUT_MS,TUTOR_OPERATIONS_DEFAULTS.requestTimeoutMs),
    dailyRequestLimit:positiveInteger(env.TUTOR_AI_DAILY_REQUEST_LIMIT,TUTOR_OPERATIONS_DEFAULTS.dailyRequestLimit),
    dailyInputTokenLimit:positiveInteger(env.TUTOR_AI_DAILY_INPUT_TOKEN_LIMIT,TUTOR_OPERATIONS_DEFAULTS.dailyInputTokenLimit),
    dailyOutputTokenLimit:positiveInteger(env.TUTOR_AI_DAILY_OUTPUT_TOKEN_LIMIT,TUTOR_OPERATIONS_DEFAULTS.dailyOutputTokenLimit),
    circuitFailureThreshold:positiveInteger(env.TUTOR_AI_CIRCUIT_FAILURE_THRESHOLD,TUTOR_OPERATIONS_DEFAULTS.circuitFailureThreshold),
    circuitWindowMs:positiveInteger(env.TUTOR_AI_CIRCUIT_WINDOW_MS,TUTOR_OPERATIONS_DEFAULTS.circuitWindowMs),
    circuitCooldownMs:positiveInteger(env.TUTOR_AI_CIRCUIT_COOLDOWN_MS,TUTOR_OPERATIONS_DEFAULTS.circuitCooldownMs)
  };
}

function usageValue(usage,key){
  const value=Number(usage?.[key]||0);
  return Number.isFinite(value)&&value>0?Math.floor(value):0;
}

function metricLabel(value){return String(value||'UNKNOWN').replace(/[^A-Z0-9_:-]/gi,'_');}

export class TutorOperationsController{
  constructor({policy=resolveTutorOperationsPolicy(),now=()=>Date.now()}={}){
    this.policy=policy;
    this.now=now;
    this.dayKey='';
    this.circuitState='CLOSED';
    this.circuitOpenedAt=null;
    this.halfOpenProbeActive=false;
    this.failureTimes=[];
    this.counters={
      turns:0,providerAttempts:0,providerAttemptsTotal:0,generativeTurns:0,fallbackTurns:0,safetyRejections:0,
      inputTokens:0,inputTokensTotal:0,outputTokens:0,outputTokensTotal:0,latencyMsTotal:0,latencySamples:0,
      admissionDenials:{},fallbackReasons:{}
    };
    this.refreshDay();
  }

  refreshDay(){
    const key=new Date(this.now()).toISOString().slice(0,10);
    if(key!==this.dayKey){
      this.dayKey=key;
      this.counters.providerAttempts=0;
      this.counters.inputTokens=0;
      this.counters.outputTokens=0;
    }
  }

  deny(reason){
    this.counters.admissionDenials[reason]=(this.counters.admissionDenials[reason]||0)+1;
    return {allowed:false,reason};
  }

  admit(){
    this.refreshDay();
    if(!this.policy.enabled)return this.deny('FEATURE_DISABLED');
    if(this.policy.killSwitch)return this.deny('EMERGENCY_KILL_SWITCH');
    if(this.policy.modelReference!==this.policy.approvedModelReference||this.policy.promptVersion!==this.policy.approvedPromptVersion){
      return this.deny('VERSION_PIN_MISMATCH');
    }
    if(this.counters.providerAttempts>=this.policy.dailyRequestLimit||
       this.counters.inputTokens>=this.policy.dailyInputTokenLimit||
       this.counters.outputTokens>=this.policy.dailyOutputTokenLimit){
      return this.deny('BUDGET_EXHAUSTED');
    }
    if(this.circuitState==='OPEN'){
      if(this.now()-this.circuitOpenedAt<this.policy.circuitCooldownMs)return this.deny('CIRCUIT_OPEN');
      this.circuitState='HALF_OPEN';
      this.halfOpenProbeActive=false;
    }
    if(this.circuitState==='HALF_OPEN'){
      if(this.halfOpenProbeActive)return this.deny('CIRCUIT_OPEN');
      this.halfOpenProbeActive=true;
    }
    return {allowed:true,reason:null};
  }

  isProviderConfigurationApproved(){
    return !this.policy.killSwitch&&
      this.policy.modelReference===this.policy.approvedModelReference&&
      this.policy.promptVersion===this.policy.approvedPromptVersion;
  }

  beginProviderAttempt(){
    this.refreshDay();
    this.counters.providerAttempts+=1;
    this.counters.providerAttemptsTotal+=1;
  }

  validateProviderResult(result){
    return result?.model_reference===this.policy.modelReference&&result?.prompt_version===this.policy.promptVersion;
  }

  recordProviderSuccess({latencyMs=0,usage={}}={}){
    this.counters.generativeTurns+=1;
    const inputTokens=usageValue(usage,'input_tokens'),outputTokens=usageValue(usage,'output_tokens');
    this.counters.inputTokens+=inputTokens;
    this.counters.inputTokensTotal+=inputTokens;
    this.counters.outputTokens+=outputTokens;
    this.counters.outputTokensTotal+=outputTokens;
    this.recordLatency(latencyMs);
    this.failureTimes=[];
    this.circuitState='CLOSED';
    this.circuitOpenedAt=null;
    this.halfOpenProbeActive=false;
  }

  recordProviderFailure({latencyMs=0}={}){
    const now=this.now();
    this.recordLatency(latencyMs);
    this.failureTimes=this.failureTimes.filter((time)=>now-time<=this.policy.circuitWindowMs);
    this.failureTimes.push(now);
    if(this.circuitState==='HALF_OPEN'||this.failureTimes.length>=this.policy.circuitFailureThreshold){
      this.circuitState='OPEN';
      this.circuitOpenedAt=now;
      this.halfOpenProbeActive=false;
    }
  }

  recordLatency(latencyMs){
    const value=Number(latencyMs);
    if(Number.isFinite(value)&&value>=0){
      this.counters.latencyMsTotal+=value;
      this.counters.latencySamples+=1;
    }
  }

  recordTurn({mode,fallbackReason=null,safetyRejected=false}={}){
    this.counters.turns+=1;
    if(mode==='RULE_FALLBACK'){
      this.counters.fallbackTurns+=1;
      const reason=fallbackReason||'UNKNOWN';
      this.counters.fallbackReasons[reason]=(this.counters.fallbackReasons[reason]||0)+1;
    }
    if(safetyRejected)this.counters.safetyRejections+=1;
  }

  snapshot(){
    this.refreshDay();
    return {
      enabled:this.policy.enabled,kill_switch:this.policy.killSwitch,
      model_reference:this.policy.modelReference,prompt_version:this.policy.promptVersion,
      eval_dataset_version:this.policy.evalDatasetVersion,circuit_state:this.circuitState,
      day:this.dayKey,turns:this.counters.turns,provider_attempts:this.counters.providerAttempts,
      provider_attempts_total:this.counters.providerAttemptsTotal,
      generative_turns:this.counters.generativeTurns,fallback_turns:this.counters.fallbackTurns,
      safety_rejections:this.counters.safetyRejections,input_tokens:this.counters.inputTokens,
      input_tokens_total:this.counters.inputTokensTotal,output_tokens:this.counters.outputTokens,
      output_tokens_total:this.counters.outputTokensTotal,
      average_provider_latency_ms:this.counters.latencySamples
        ?Math.round(this.counters.latencyMsTotal/this.counters.latencySamples):0,
      admission_denials:{...this.counters.admissionDenials},fallback_reasons:{...this.counters.fallbackReasons}
    };
  }

  renderMetrics(){
    const snapshot=this.snapshot();
    const lines=[
      '# HELP mathchakchak_tutor_turns_total Total tutor turns.',
      '# TYPE mathchakchak_tutor_turns_total counter',
      `mathchakchak_tutor_turns_total ${snapshot.turns}`,
      '# HELP mathchakchak_tutor_provider_attempts_total External provider attempts since process start.',
      '# TYPE mathchakchak_tutor_provider_attempts_total counter',
      `mathchakchak_tutor_provider_attempts_total ${snapshot.provider_attempts_total}`,
      '# HELP mathchakchak_tutor_provider_attempts_daily External provider attempts in the current UTC day.',
      '# TYPE mathchakchak_tutor_provider_attempts_daily gauge',
      `mathchakchak_tutor_provider_attempts_daily ${snapshot.provider_attempts}`,
      '# HELP mathchakchak_tutor_generative_turns_total Validated generative tutor turns.',
      '# TYPE mathchakchak_tutor_generative_turns_total counter',
      `mathchakchak_tutor_generative_turns_total ${snapshot.generative_turns}`,
      '# HELP mathchakchak_tutor_fallback_total Tutor turns served by deterministic fallback.',
      '# TYPE mathchakchak_tutor_fallback_total counter',
      `mathchakchak_tutor_fallback_total ${snapshot.fallback_turns}`,
      '# HELP mathchakchak_tutor_safety_rejections_total Unsafe or invalid provider outputs rejected.',
      '# TYPE mathchakchak_tutor_safety_rejections_total counter',
      `mathchakchak_tutor_safety_rejections_total ${snapshot.safety_rejections}`,
      '# HELP mathchakchak_tutor_circuit_state Circuit state as a labelled gauge.',
      '# TYPE mathchakchak_tutor_circuit_state gauge',
      `mathchakchak_tutor_circuit_state{state="${snapshot.circuit_state}"} 1`,
      '# HELP mathchakchak_tutor_input_tokens_total Provider input tokens since process start.',
      '# TYPE mathchakchak_tutor_input_tokens_total counter',
      `mathchakchak_tutor_input_tokens_total ${snapshot.input_tokens_total}`,
      '# HELP mathchakchak_tutor_input_tokens_daily Provider input tokens in the current UTC day.',
      '# TYPE mathchakchak_tutor_input_tokens_daily gauge',
      `mathchakchak_tutor_input_tokens_daily ${snapshot.input_tokens}`,
      '# HELP mathchakchak_tutor_output_tokens_total Provider output tokens since process start.',
      '# TYPE mathchakchak_tutor_output_tokens_total counter',
      `mathchakchak_tutor_output_tokens_total ${snapshot.output_tokens_total}`,
      '# HELP mathchakchak_tutor_output_tokens_daily Provider output tokens in the current UTC day.',
      '# TYPE mathchakchak_tutor_output_tokens_daily gauge',
      `mathchakchak_tutor_output_tokens_daily ${snapshot.output_tokens}`,
      '# HELP mathchakchak_tutor_provider_latency_ms_average Average provider latency for this process.',
      '# TYPE mathchakchak_tutor_provider_latency_ms_average gauge',
      `mathchakchak_tutor_provider_latency_ms_average ${snapshot.average_provider_latency_ms}`
    ];
    for(const [reason,count] of Object.entries(snapshot.fallback_reasons)){
      lines.push(`mathchakchak_tutor_fallback_reason_total{reason="${metricLabel(reason)}"} ${count}`);
    }
    return `${lines.join('\n')}\n`;
  }
}

export function createTutorOperations(options={}){return new TutorOperationsController(options);}
