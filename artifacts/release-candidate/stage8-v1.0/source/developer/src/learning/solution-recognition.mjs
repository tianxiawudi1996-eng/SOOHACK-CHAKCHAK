import crypto from 'node:crypto';

export const SOLUTION_SOURCE_TYPES=Object.freeze(['MANUAL_TEXT','HANDWRITING_IMAGE','CAMERA_IMAGE']);
export const RECOGNITION_DECISIONS=Object.freeze(['STUDENT_CONFIRMATION_REQUIRED','TEACHER_REVIEW_REQUIRED','MANUAL_ENTRY_REQUIRED','REJECTED']);

const bounded=(value,fallback=0)=>{
  const number=Number(value);
  return Number.isFinite(number)?Math.max(0,Math.min(1,number)):fallback;
};
const expressionPattern=/^[0-9a-zA-Z\uAC00-\uD7A3+\-*/÷×=().,^_{}\[\]\\\s]+$/u;
const normalizeExpression=(value)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,500);
const hash=(value)=>crypto.createHash('sha256').update(value).digest('hex');

export function evaluateSolutionRecognition(input={}){
  const sourceType=String(input.source_type??'').toUpperCase();
  if(!SOLUTION_SOURCE_TYPES.includes(sourceType))throw new TypeError('INVALID_SOLUTION_SOURCE_TYPE');
  const candidates=Array.isArray(input.candidates)?input.candidates.slice(0,5).map((candidate)=>({
    expression:normalizeExpression(candidate?.expression),
    confidence:bounded(candidate?.confidence)
  })).filter(({expression})=>expression.length>0):[];
  const validCandidates=candidates.filter(({expression})=>expressionPattern.test(expression));
  const sorted=[...validCandidates].sort((a,b)=>b.confidence-a.confidence);
  const top=sorted[0]??null;
  const margin=top?Math.max(0,top.confidence-(sorted[1]?.confidence??0)):0;
  const imageQuality=sourceType==='MANUAL_TEXT'?1:bounded(input.image_quality);
  const mathConsistency=bounded(input.math_consistency,sourceType==='MANUAL_TEXT'?1:0);
  const stepContinuity=bounded(input.step_continuity,sourceType==='MANUAL_TEXT'?1:0);
  const providerVerified=input.provider_verified===true;
  const reasons=[];
  let decision='STUDENT_CONFIRMATION_REQUIRED';

  if(candidates.length===0){decision='MANUAL_ENTRY_REQUIRED';reasons.push('NO_RECOGNITION_CANDIDATE');}
  else if(validCandidates.length===0){decision='REJECTED';reasons.push('UNSAFE_OR_INVALID_EXPRESSION');}
  else if(sourceType!=='MANUAL_TEXT'&&!providerVerified){decision='MANUAL_ENTRY_REQUIRED';reasons.push('OCR_PROVIDER_NOT_VERIFIED');}
  else if(sourceType!=='MANUAL_TEXT'&&(imageQuality<0.65||top.confidence<0.75)){
    decision='MANUAL_ENTRY_REQUIRED';reasons.push(imageQuality<0.65?'IMAGE_QUALITY_LOW':'RECOGNITION_CONFIDENCE_LOW');
  }else if(mathConsistency<0.65||stepContinuity<0.6){
    decision='TEACHER_REVIEW_REQUIRED';
    if(mathConsistency<0.65)reasons.push('MATH_CONSISTENCY_LOW');
    if(stepContinuity<0.6)reasons.push('STEP_CONTINUITY_LOW');
  }else{
    decision='STUDENT_CONFIRMATION_REQUIRED';
    if(sourceType!=='MANUAL_TEXT'&&(top.confidence<0.92||margin<0.12||imageQuality<0.8))reasons.push('AMBIGUITY_REQUIRES_CONFIRMATION');
    else reasons.push('CONFIRM_BEFORE_SCORING');
  }

  return {
    decision,
    source_type:sourceType,
    candidate_count:candidates.length,
    valid_candidate_count:validCandidates.length,
    candidate_hashes:validCandidates.map(({expression})=>hash(expression)),
    top_candidate_preview:top?.expression??null,
    confidence:{top:top?.confidence??0,margin,image_quality:imageQuality,math_consistency:mathConsistency,step_continuity:stepContinuity},
    reason_codes:reasons,
    next_action:decision==='STUDENT_CONFIRMATION_REQUIRED'?'ASK_STUDENT_TO_CONFIRM':decision==='TEACHER_REVIEW_REQUIRED'?'QUEUE_TEACHER_REVIEW':decision==='MANUAL_ENTRY_REQUIRED'?'OPEN_MANUAL_ENTRY':'REQUEST_NEW_INPUT',
    character_roles:{chakchaki:'ASK_AND_REASSURE',gongsickyi:'VALIDATE_MATH_STRUCTURE'},
    safety:{automatic_scoring_allowed:false,raw_image_persisted:false,raw_candidates_persisted:false,provider_execution_claimed:false}
  };
}
