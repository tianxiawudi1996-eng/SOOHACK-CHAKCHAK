import {normalizeLocale} from '../i18n/locale-resolver.mjs';

export function createDiagnostic({id, studentId, locale, createdAt = new Date().toISOString()}) {
  if (!id || !studentId) throw new Error('DIAGNOSTIC_ID_AND_STUDENT_REQUIRED');
  const normalizedLocale = normalizeLocale(locale);
  if (!normalizedLocale) throw new Error('UNSUPPORTED_LOCALE');
  return {id, studentId, locale: normalizedLocale, status: 'CREATED', responses: [], createdAt, startedAt: null, completedAt: null};
}

export function startDiagnostic(session, at = new Date().toISOString()) {
  if (session.status !== 'CREATED') throw new Error('INVALID_DIAGNOSTIC_TRANSITION');
  return {...session, status: 'IN_PROGRESS', startedAt: at};
}

export function recordDiagnosticResponse(session, response) {
  if (session.status !== 'IN_PROGRESS') throw new Error('DIAGNOSTIC_NOT_IN_PROGRESS');
  if (!response.problemItemId || !['CORRECT', 'INCORRECT', 'SKIPPED'].includes(response.outcome)) throw new Error('INVALID_DIAGNOSTIC_RESPONSE');
  if (session.responses.some((item) => item.problemItemId === response.problemItemId)) throw new Error('DUPLICATE_DIAGNOSTIC_RESPONSE');
  return {...session, responses: [...session.responses, {...response, sequenceNo: session.responses.length + 1}]};
}

export function completeDiagnostic(session, at = new Date().toISOString()) {
  if (session.status !== 'IN_PROGRESS' || session.responses.length === 0) throw new Error('DIAGNOSTIC_NOT_COMPLETABLE');
  const correct = session.responses.filter((response) => response.outcome === 'CORRECT').length;
  return {...session, status: 'COMPLETED', completedAt: at, result: {answered: session.responses.length, correct, accuracy: correct / session.responses.length}};
}
