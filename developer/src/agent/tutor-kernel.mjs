import {isTutorOutputSafe} from './tutor-safety.mjs';

const SUPPORTED_LOCALES = ['ko','zh-CN','ja','en','es','fr','it','ru'];
const STRATEGIES = ['RESTATE_GOAL','CONNECT_REPRESENTATION','VERIFY_RULE','EXPLAIN_REASONING'];
const NEXT_ACTIONS = ['RETRY','CONTINUE'];

const COPY = {
  ko:{correct:['착착! 방금 풀이에서 중요한 연결을 스스로 찾아냈어.','공식이로 확인했어. 사용한 규칙을 한 문장으로 설명해 볼래?'],incorrect:['괜찮아. 지금 선택은 다음에 확인할 지점을 알려 줬어.','분모는 조각의 크기, 분자는 조각의 수를 나타내. 같은 크기의 조각인지 먼저 확인해 보자.']},
  'zh-CN':{correct:['很好！你刚才自己找到了关键联系。','公式检查完成。你能用一句话说明刚才使用的规则吗？'],incorrect:['没关系，这次选择告诉了我们下一步要检查什么。','分母表示每份的大小，分子表示份数。先确认每份大小是否相同。']},
  ja:{correct:['いいね！大切なつながりを自分で見つけられたね。','公式を確認できました。使った規則を一文で説明してみよう。'],incorrect:['大丈夫。この答えから次に確かめる場所が分かったよ。','分母は一つ分の大きさ、分子はその個数です。同じ大きさか先に確かめよう。']},
  en:{correct:['Nice work. You found the important connection yourself.','The rule checks out. Can you explain the rule you used in one sentence?'],incorrect:['That attempt helps us see what to check next.','The denominator names the piece size and the numerator counts pieces. First check whether the pieces are the same size.']},
  es:{correct:['Muy bien. Encontraste por tu cuenta la conexión importante.','La regla es correcta. ¿Puedes explicarla en una frase?'],incorrect:['Este intento nos muestra qué revisar después.','El denominador indica el tamaño de las partes y el numerador cuántas hay. Primero comprueba si tienen el mismo tamaño.']},
  fr:{correct:['Bravo. Tu as trouvé toi-même le lien important.','La règle est vérifiée. Peux-tu l’expliquer en une phrase ?'],incorrect:['Cet essai nous indique ce qu’il faut vérifier ensuite.','Le dénominateur indique la taille des parts et le numérateur leur nombre. Vérifie d’abord si les parts ont la même taille.']},
  it:{correct:['Ottimo. Hai trovato da solo il collegamento importante.','La regola è corretta. Puoi spiegarla in una frase?'],incorrect:['Questo tentativo ci mostra cosa controllare dopo.','Il denominatore indica la grandezza delle parti e il numeratore quante sono. Controlla prima se le parti hanno la stessa grandezza.']},
  ru:{correct:['Отлично! Ты сам нашёл важную связь.','Правило проверено. Объясни его одним предложением.'],incorrect:['Эта попытка показывает, что проверить дальше.','Знаменатель задаёт размер доли, а числитель — число долей. Сначала проверь, одинаковы ли доли.']}
};

export const TUTOR_OUTPUT_SCHEMA = {
  type:'object',additionalProperties:false,
  required:['chakchaki','gongsickyi','next_action','strategy'],
  properties:{
    chakchaki:{type:'string',minLength:1,maxLength:240},
    gongsickyi:{type:'string',minLength:1,maxLength:240},
    next_action:{type:'string',enum:NEXT_ACTIONS},
    strategy:{type:'string',enum:STRATEGIES}
  }
};

function safeLocale(locale){return SUPPORTED_LOCALES.includes(locale)?locale:'en';}
export function validateTutorTurn(value,outcome,locale){return isTutorOutputSafe(value,{outcome,locale});}

function fallbackTurn(context, reason){
  const locale=safeLocale(context.locale), correct=context.outcome==='CORRECT', copy=COPY[locale][correct?'correct':'incorrect'];
  return {
    chakchaki:copy[0],gongsickyi:copy[1],next_action:correct?'CONTINUE':'RETRY',
    strategy:correct?'EXPLAIN_REASONING':context.misconception_code?'CONNECT_REPRESENTATION':'RESTATE_GOAL',
    mode:'RULE_FALLBACK',model_reference:null,safety_status:'SAFE_FALLBACK',fallback_reason:reason
  };
}

export function buildTutorModelInput(context){
  return {
    locale:safeLocale(context.locale),stage:String(context.stage||''),outcome:context.outcome,
    misconception_code:context.misconception_code||null,hint_level:Number(context.hint_level||0),
    formula:{title:String(context.formula_title||'').slice(0,160),notation:String(context.formula_notation||'').slice(0,160)},
    step:{prompt:String(context.step_prompt||'').slice(0,400),hint:String(context.step_hint||'').slice(0,400)}
  };
}

export function createTutorKernel({provider=null,timeoutMs=1500,clock=()=>performance.now(),operations=null}={}){
  return {
    async generate(context){
      const started=clock();
      const fallback=(reason,{providerFailure=false,safetyRejected=false}={})=>{
        const latencyMs=Math.max(0,Math.round(clock()-started));
        if(providerFailure)operations?.recordProviderFailure?.({latencyMs});
        const turn={...fallbackTurn(context,reason),latency_ms:latencyMs};
        operations?.recordTurn?.({mode:turn.mode,fallbackReason:reason,safetyRejected});
        return turn;
      };
      const admission=operations?.admit?.()||{allowed:true,reason:null};
      if(!admission.allowed)return fallback(admission.reason);
      if(!provider)return fallback('PROVIDER_NOT_CONFIGURED');
      operations?.beginProviderAttempt?.();
      try{
        const result=await Promise.race([
          provider.generate({input:buildTutorModelInput(context),schema:TUTOR_OUTPUT_SCHEMA}),
          new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('TUTOR_TIMEOUT')),timeoutMs);timer.unref?.();})
        ]);
        if(operations&&!operations.validateProviderResult(result))throw new Error('VERSION_PIN_MISMATCH');
        if(!validateTutorTurn(result.output,context.outcome,safeLocale(context.locale)))throw new Error('UNSAFE_OR_INVALID_OUTPUT');
        const latencyMs=Math.max(0,Math.round(clock()-started));
        operations?.recordProviderSuccess?.({latencyMs,usage:result.usage});
        operations?.recordTurn?.({mode:'GENERATIVE_ASSISTED'});
        return {...result.output,mode:'GENERATIVE_ASSISTED',model_reference:result.model_reference,
          safety_status:'VALIDATED',fallback_reason:null,latency_ms:latencyMs};
      }catch(error){
        const reason=error?.message==='TUTOR_TIMEOUT'?'TIMEOUT':
          error?.message==='VERSION_PIN_MISMATCH'?'VERSION_PIN_MISMATCH':'PROVIDER_OR_VALIDATION_FAILURE';
        return fallback(reason,{providerFailure:true,safetyRejected:error?.message==='UNSAFE_OR_INVALID_OUTPUT'});
      }
    }
  };
}
