import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLABORATION_PHASE_SIGNALS,evaluateCollaborationEvidence,nextCollaborationPhase,summarizeCollaborationEvidence} from '../../../developer/src/learning/collaboration-runtime.mjs';

test('each collaboration phase accepts only its two structured signals',()=>{
  assert.equal(Object.keys(COLLABORATION_PHASE_SIGNALS).length,5);
  const pass=evaluateCollaborationEvidence({phaseNo:3,signal:'DERIVED',hintLevel:0,durationMs:1200});
  assert.equal(pass.outcome,'PASS');assert.equal(pass.lead_character,'GONGSICKYI');
  const support=evaluateCollaborationEvidence({phaseNo:3,signal:'NEEDS_GUIDANCE'});
  assert.equal(support.outcome,'NEEDS_SUPPORT');assert.equal(support.hint_level,1);
  assert.throws(()=>evaluateCollaborationEvidence({phaseNo:3,signal:'CONFIDENT'}),/INVALID_COLLABORATION_SIGNAL/);
});

test('five phase evidence produces a bounded progress score and review interval',()=>{
  const evidence=[1,2,3,4,5].map((phase_no)=>({phase_no,outcome:phase_no===4?'NEEDS_SUPPORT':'PASS',hint_level:phase_no===4?1:0}));
  const summary=summarizeCollaborationEvidence(evidence);
  assert.equal(summary.evidence_score,0.835);
  assert.equal(summary.next_review_days,3);
  assert.equal(nextCollaborationPhase(4),5);assert.equal(nextCollaborationPhase(5),5);
  assert.throws(()=>summarizeCollaborationEvidence(evidence.slice(1)),/FIVE_PHASE_EVIDENCE_REQUIRED/);
});
