import {normalizeLocale} from '../i18n/locale-resolver.mjs';
import {containsDeniedTelemetryKey} from '../privacy/log-policy.mjs';

const allowedEvents = new Set(['locale.resolved', 'diagnosis.started', 'diagnosis.completed', 'learning.step.completed', 'review.attempted', 'request.completed']);

export function validateEvent(event) {
  const errors = [];
  if (!allowedEvents.has(event.eventName)) errors.push('EVENT_NOT_ALLOWED');
  if (!event.schemaVersion || !event.requestId || !event.release) errors.push('ENVELOPE_INCOMPLETE');
  if (!normalizeLocale(event.locale)) errors.push('LOCALE_INVALID');
  if (containsDeniedTelemetryKey(event.properties ?? {})) errors.push('SENSITIVE_PROPERTY_DENIED');
  return {valid: errors.length === 0, errors};
}
