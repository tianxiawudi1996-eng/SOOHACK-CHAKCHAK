export function gateAiPetBehavior({automatedQaStatus, manualDecision, featureFlag}) {
  const approved = automatedQaStatus === 'PASS' && manualDecision === 'APPROVE';
  return {
    enabled: approved && featureFlag === true,
    gateStatus: approved ? 'VERIFIED' : 'BLOCKED',
    reason: approved ? (featureFlag ? 'ENABLED' : 'FEATURE_FLAG_OFF') : 'MANUAL_APPROVAL_REQUIRED'
  };
}
