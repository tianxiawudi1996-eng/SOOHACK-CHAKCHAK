export const PERFORMANCE_BUDGET = Object.freeze({
  performanceScoreMin: 90,
  accessibilityScoreMin: 100,
  bestPracticesScoreMin: 100,
  fcpMaxMs: 1800,
  lcpMaxMs: 2500,
  tbtMaxMs: 200,
  clsMax: 0.1,
  speedIndexMaxMs: 3400,
  transferBytesMax: 400000,
  singleAssetBytesMax: 100000,
  artifactLibraryBytesMax: 4000000,
  artifactLibrarySingleAssetBytesMax: 140000,
});

export function evaluatePerformance(metrics, budget = PERFORMANCE_BUDGET) {
  const checks = {
    performanceScore: metrics.performanceScore >= budget.performanceScoreMin,
    accessibilityScore: metrics.accessibilityScore >= budget.accessibilityScoreMin,
    bestPracticesScore: metrics.bestPracticesScore >= budget.bestPracticesScoreMin,
    fcp: metrics.fcp <= budget.fcpMaxMs,
    lcp: metrics.lcp <= budget.lcpMaxMs,
    tbt: metrics.tbt <= budget.tbtMaxMs,
    cls: metrics.cls <= budget.clsMax,
    speedIndex: metrics.speedIndex <= budget.speedIndexMaxMs,
    transferBytes: metrics.transferBytes <= budget.transferBytesMax,
  };
  return {pass:Object.values(checks).every(Boolean), checks};
}
