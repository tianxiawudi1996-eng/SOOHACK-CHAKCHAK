export const ROUTES=Object.freeze(['REMEDIATE','CORE','EXTEND']);

export function diagnosticProgress(index,total) {
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1) throw new Error('INVALID_PROGRESS');
  return Math.min(100,Math.max(0,Math.round((index/total)*100)));
}

export function recommendationMessageKeys(route) {
  if (!ROUTES.includes(route)) throw new Error('INVALID_ROUTE');
  return {title:`route.${route}.title`,description:`route.${route}.description`};
}

export function createIdempotencyKey(scope,randomUuid=crypto.randomUUID()) {
  return `${scope}-${randomUuid}`;
}
