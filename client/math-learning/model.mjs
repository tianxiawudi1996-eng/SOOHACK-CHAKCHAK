export const STAGES = Object.freeze(['UNDERSTAND','CONNECT','REPEAT','RECALL','APPLY']);

export function stageProgress(stage) {
  const index = STAGES.indexOf(stage);
  return index < 0 ? 0 : index + 1;
}

export function createIdempotencyKey(scope, randomUuid = crypto.randomUUID()) {
  return `${scope}-${randomUuid}`;
}

export function buildStepResponse(interactionType, values) {
  if (interactionType === 'CONCEPT_CHOICE' || interactionType === 'VISUAL_CHOICE') {
    if (!values.choice) throw new Error('CHOICE_REQUIRED');
    return {value:values.choice};
  }
  if (interactionType === 'GUIDED_FRACTION' || interactionType === 'APPLICATION_FRACTION') {
    const numerator = Number(values.numerator);
    const denominator = Number(values.denominator);
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) throw new Error('VALID_FRACTION_REQUIRED');
    return {numerator,denominator};
  }
  if (interactionType === 'FORMULA_RECALL') {
    if (!values.numerator_rule || !values.denominator_rule) throw new Error('FORMULA_TERMS_REQUIRED');
    return {numerator_rule:values.numerator_rule,denominator_rule:values.denominator_rule};
  }
  throw new Error('UNSUPPORTED_INTERACTION');
}
