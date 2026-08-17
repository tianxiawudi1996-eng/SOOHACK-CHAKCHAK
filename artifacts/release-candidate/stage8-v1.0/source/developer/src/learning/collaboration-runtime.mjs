const PHASE_SIGNALS=Object.freeze({
  1:Object.freeze({pass:'CONFIDENT',support:'NEEDS_REVIEW',lead_character:'CHAKCHAKI'}),
  2:Object.freeze({pass:'CONNECTED',support:'NEEDS_EXAMPLE',lead_character:'CHAKCHAKI'}),
  3:Object.freeze({pass:'DERIVED',support:'NEEDS_GUIDANCE',lead_character:'GONGSICKYI'}),
  4:Object.freeze({pass:'APPLIED',support:'NEEDS_HINT',lead_character:'BOTH'}),
  5:Object.freeze({pass:'VERIFIED',support:'REVIEW_REQUIRED',lead_character:'GONGSICKYI'})
});

const PHASE_WEIGHTS=Object.freeze({1:0.10,2:0.15,3:0.25,4:0.30,5:0.20});

export function evaluateCollaborationEvidence({phaseNo,signal,hintLevel=0,durationMs=null}) {
  const phase=PHASE_SIGNALS[phaseNo];
  if(!phase) throw new Error('INVALID_COLLABORATION_PHASE');
  if(signal!==phase.pass&&signal!==phase.support) throw new Error('INVALID_COLLABORATION_SIGNAL');
  if(!Number.isInteger(hintLevel)||hintLevel<0||hintLevel>3) throw new Error('INVALID_HINT_LEVEL');
  if(durationMs!==null&&(!Number.isInteger(durationMs)||durationMs<0||durationMs>3600000)) throw new Error('INVALID_DURATION');
  return {
    phase_no:phaseNo,signal,outcome:signal===phase.pass?'PASS':'NEEDS_SUPPORT',
    hint_level:signal===phase.support?Math.max(1,hintLevel):hintLevel,
    duration_ms:durationMs,lead_character:phase.lead_character
  };
}

export function summarizeCollaborationEvidence(evidence) {
  if(!Array.isArray(evidence)||evidence.length!==5||new Set(evidence.map((item)=>item.phase_no)).size!==5) {
    throw new Error('FIVE_PHASE_EVIDENCE_REQUIRED');
  }
  let score=0;
  for(const item of evidence){
    const weight=PHASE_WEIGHTS[item.phase_no];
    if(!weight||!['PASS','NEEDS_SUPPORT'].includes(item.outcome)) throw new Error('INVALID_COLLABORATION_EVIDENCE');
    const outcomeValue=item.outcome==='PASS'?1:0.5;
    const hintPenalty=Math.min(Number(item.hint_level??0),3)*0.05;
    score+=weight*Math.max(0.25,outcomeValue-hintPenalty);
  }
  const evidenceScore=Math.round(score*10000)/10000;
  return {evidence_score:evidenceScore,next_review_days:evidenceScore>=0.85?7:evidenceScore>=0.65?3:1};
}

export function nextCollaborationPhase(currentPhaseNo) {
  if(!Number.isInteger(currentPhaseNo)||currentPhaseNo<1||currentPhaseNo>5) throw new Error('INVALID_COLLABORATION_PHASE');
  return currentPhaseNo===5?5:currentPhaseNo+1;
}

export const COLLABORATION_PHASE_SIGNALS=PHASE_SIGNALS;
