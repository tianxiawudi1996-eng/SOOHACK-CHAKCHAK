const denied = new Set(['answer', 'answerText', 'answer_text', 'problemText', 'problem_text', 'password', 'token', 'recoveryCode', 'recovery_code', 'contactReference']);

export function sanitizeTelemetry(value) {
  if (Array.isArray(value)) return value.map(sanitizeTelemetry);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !denied.has(key)).map(([key, item]) => [key, sanitizeTelemetry(item)]));
}

export function containsDeniedTelemetryKey(value) {
  if (Array.isArray(value)) return value.some(containsDeniedTelemetryKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => denied.has(key) || containsDeniedTelemetryKey(item));
}
