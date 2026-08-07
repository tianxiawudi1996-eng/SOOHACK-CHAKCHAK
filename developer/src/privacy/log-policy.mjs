const denied = new Set([
  'answer','answerText','answer_text','response_value','problemText','problem_text',
  'password','token','authorization','cookie','recoveryCode','recovery_code','contactReference',
  'userId','user_id','studentId','student_id','email','name','ip','ip_address'
]);

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
