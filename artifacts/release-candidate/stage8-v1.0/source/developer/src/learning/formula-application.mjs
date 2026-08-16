function normalize(value){
  return String(value??'').trim().toLowerCase().replaceAll(' ','').replaceAll('−','-').replaceAll('㎠','cm²').replaceAll('cm2','cm²').replaceAll('m2','m²');
}

export function evaluateFormulaApplication({answerSchema,misconceptionRules=[]},response){
  const value=normalize(response?.value);
  const unit=normalize(response?.unit);
  const accepted=(answerSchema?.accepted_values??[]).map(normalize);
  if(!value) return {outcome:'INCORRECT',misconception_code:'RESPONSE_REQUIRED'};
  const valueCorrect=accepted.includes(value);
  const acceptedUnits=(answerSchema?.accepted_units??[]).map(normalize);
  const unitCorrect=acceptedUnits.length===0||acceptedUnits.includes(unit);
  if(valueCorrect&&unitCorrect)return {outcome:'CORRECT',misconception_code:null};
  if(valueCorrect&&!unitCorrect)return {outcome:'INCORRECT',misconception_code:'UNIT_MISMATCH'};
  const matched=misconceptionRules.find((rule)=>(rule.values??[]).map(normalize).includes(value));
  return {outcome:'INCORRECT',misconception_code:matched?.code??'APPLICATION_ERROR'};
}

export function applicationReviewDays({attemptedItems,score,mastered}){
  if(mastered&&attemptedItems>=3)return 14;
  if(score>=0.5)return 3;
  return 1;
}
