import {normalizeLocale} from '../i18n/locale-resolver.mjs';
import {containsDeniedTelemetryKey} from '../privacy/log-policy.mjs';

const eventProperties = new Map([
  ['locale.resolved',new Set(['source','fallback_used'])],
  ['diagnosis.started',new Set(['grade_band','topic_id'])],
  ['diagnosis.completed',new Set(['duration_ms','outcome','route_id'])],
  ['learning.step.completed',new Set(['step','attempt_count','hint_level','duration','duration_ms','outcome'])],
  ['review.attempted',new Set(['due_bucket','outcome'])],
  ['request.completed',new Set(['status','duration_ms','route_template'])],
  ['learning.quality.viewed',new Set(['data_sufficient'])]
]);

function hasInvalidProperties(properties, allowed) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return true;
  return Object.entries(properties).some(([key,value]) =>
    !allowed.has(key) || (value!==null&&!['string','number','boolean'].includes(typeof value))
  );
}

export function validateEvent(event) {
  const errors = [];
  const allowed=eventProperties.get(event.eventName);
  if (!allowed) errors.push('EVENT_NOT_ALLOWED');
  if (!event.schemaVersion || !event.requestId || !event.release) errors.push('ENVELOPE_INCOMPLETE');
  if (!normalizeLocale(event.locale)) errors.push('LOCALE_INVALID');
  if (containsDeniedTelemetryKey(event.properties ?? {})) errors.push('SENSITIVE_PROPERTY_DENIED');
  if (allowed&&hasInvalidProperties(event.properties??{},allowed)) errors.push('PROPERTY_NOT_ALLOWED');
  return {valid: errors.length === 0, errors};
}
