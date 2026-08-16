const STRATEGIES=['RESTATE_GOAL','CONNECT_REPRESENTATION','VERIFY_RULE','EXPLAIN_REASONING'];
const NEXT_ACTIONS=['RETRY','CONTINUE'];
const ALLOWED_KEYS=new Set(['chakchaki','gongsickyi','next_action','strategy']);

const PII_PATTERNS=[
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /(?:\+?\d[\s.-]?){9,}/u
];
const SHAMING_PATTERNS=[/\b(?:stupid|idiot|dumb|lazy|hopeless)\b/iu,/(?:바보|멍청|한심|게으르)/u,/(?:笨蛋|愚か|дурак)/iu];
const LANGUAGE_SIGNALS={
  ko:/[가-힣]/u,'zh-CN':/[\u4e00-\u9fff]/u,ja:/[\u3040-\u30ff]/u,ru:/[\u0400-\u04ff]/u,
  en:/\b(?:you|the|rule|check|try|next)\b/iu,es:/\b(?:el|la|que|regla|puedes|primero)\b/iu,
  fr:/\b(?:le|la|règle|peux|vérifie|ensuite)\b/iu,it:/\b(?:il|la|regola|puoi|prima|dopo)\b/iu
};

function normalized(text){return text.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');}
function hasAnswerLeak(text){
  return /-?\d+\s*\/\s*\d+/u.test(text)||/=\s*-?\d+(?:\.\d+)?/u.test(text)
    || /(?:정답|answer|respuesta|réponse|risposta|ответ|答案|答え)\s*(?:은|는|is|es|est|è|:)?\s*-?\d/iu.test(text);
}

export function inspectTutorOutput(value,{outcome,locale}={}){
  const failures=[];
  if(!value||typeof value!=='object'||Array.isArray(value))return {passed:false,failures:['SCHEMA_OBJECT_REQUIRED']};
  const keys=Object.keys(value);
  if(keys.some((key)=>!ALLOWED_KEYS.has(key))||keys.length!==4)failures.push('SCHEMA_KEYS_INVALID');
  if(typeof value.chakchaki!=='string'||value.chakchaki.length<1||value.chakchaki.length>240)failures.push('CHAKCHAKI_LENGTH_INVALID');
  if(typeof value.gongsickyi!=='string'||value.gongsickyi.length<1||value.gongsickyi.length>240)failures.push('GONGSICKYI_LENGTH_INVALID');
  if(!NEXT_ACTIONS.includes(value.next_action)||!STRATEGIES.includes(value.strategy))failures.push('ENUM_INVALID');
  if(outcome&&value.next_action!==(outcome==='CORRECT'?'CONTINUE':'RETRY'))failures.push('NEXT_ACTION_MISMATCH');
  const text=`${value.chakchaki||''} ${value.gongsickyi||''}`;
  if(hasAnswerLeak(text))failures.push('ANSWER_LEAK');
  if(PII_PATTERNS.some((pattern)=>pattern.test(text)))failures.push('PII_EXPOSURE');
  if(SHAMING_PATTERNS.some((pattern)=>pattern.test(text)))failures.push('SHAMING_LANGUAGE');
  if(normalized(value.chakchaki||'')===normalized(value.gongsickyi||''))failures.push('ROLE_COLLAPSE');
  if(locale&&LANGUAGE_SIGNALS[locale]&&!LANGUAGE_SIGNALS[locale].test(text))failures.push('LOCALE_MISMATCH');
  return {passed:failures.length===0,failures};
}

export function isTutorOutputSafe(value,context){return inspectTutorOutput(value,context).passed;}
