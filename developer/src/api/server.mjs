import http from 'node:http';
import {SUPPORTED_LOCALES} from '../i18n/locale-resolver.mjs';
import {ApiError, badRequest, notFound} from './errors.mjs';
import {
  failure,
  newRequestId,
  normalizeRequestedLocale,
  readJson,
  requestContext,
  requestHash,
  requireIdempotencyKey,
  sendJson,
  sendText,
  success
} from './http.mjs';
import {OperationsMetrics} from './metrics.mjs';

const UUID_PATTERN = '[0-9a-fA-F-]{36}';

function requireUuid(value, field) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')) {
    throw badRequest('INVALID_IDENTIFIER', `error.invalid_${field}`);
  }
  return value;
}

function route(method, pathname) {
  if (method === 'GET' && pathname === '/healthz') return {name: 'health'};
  if (method === 'GET' && pathname === '/readyz') return {name: 'health'};
  if (method === 'GET' && pathname === '/metrics') return {name: 'metrics'};
  if (method === 'GET' && pathname === '/api/v1/locales') return {name: 'locales'};
  if (method === 'POST' && pathname === '/api/v1/diagnostics') return {name: 'createDiagnostic'};

  let match = pathname.match(new RegExp(`^/api/v1/diagnostics/(${UUID_PATTERN})/responses$`));
  if (method === 'POST' && match) return {name: 'addDiagnosticResponse', diagnosticId: match[1]};
  match = pathname.match(new RegExp(`^/api/v1/diagnostics/(${UUID_PATTERN})/complete$`));
  if (method === 'POST' && match) return {name: 'completeDiagnostic', diagnosticId: match[1]};

  if (method === 'POST' && pathname === '/api/v1/learning-sessions') return {name: 'createLearningSession'};
  match = pathname.match(new RegExp(`^/api/v1/concepts/(${UUID_PATTERN})/lesson$`));
  if (method === 'GET' && match) return {name: 'getConceptLesson', conceptId: match[1]};
  match = pathname.match(new RegExp(`^/api/v1/learning-sessions/(${UUID_PATTERN})$`));
  if (method === 'GET' && match) return {name: 'getLearningSession', sessionId: match[1]};
  match = pathname.match(new RegExp(`^/api/v1/learning-sessions/(${UUID_PATTERN})/formula-lessons$`));
  if (method === 'POST' && match) return {name: 'startFormulaLesson', sessionId: match[1]};
  match = pathname.match(new RegExp(`^/api/v1/learning-sessions/(${UUID_PATTERN})/answers$`));
  if (method === 'POST' && match) return {name: 'addLearningAnswer', sessionId: match[1]};
  match = pathname.match(new RegExp(`^/api/v1/learning-sessions/(${UUID_PATTERN})/complete$`));
  if (method === 'POST' && match) return {name: 'completeLearningSession', sessionId: match[1]};

  match = pathname.match(new RegExp(`^/api/v1/formula-lessons/(${UUID_PATTERN})$`));
  if (method === 'GET' && match) return {name: 'getFormulaLessonSession', formulaSessionId: match[1]};
  match = pathname.match(new RegExp(`^/api/v1/formula-lessons/(${UUID_PATTERN})/responses$`));
  if (method === 'POST' && match) return {name: 'addFormulaLessonResponse', formulaSessionId: match[1]};
  match = pathname.match(new RegExp(`^/api/v1/formula-lessons/(${UUID_PATTERN})/complete$`));
  if (method === 'POST' && match) return {name: 'completeFormulaLesson', formulaSessionId: match[1]};

  match = pathname.match(new RegExp(`^/api/v1/students/(${UUID_PATTERN})/progress$`));
  if (method === 'GET' && match) return {name: 'getProgress', studentId: match[1]};
  return null;
}

async function execute(repository, request, match, requestId, {auth, metrics}) {
  if (match.name === 'health') {
    return success({status: 'ok', database: await repository.health()}, {requestId});
  }
  if (match.name === 'locales') {
    return success({locales: SUPPORTED_LOCALES, fallback: 'en'}, {requestId});
  }
  if (match.name === 'metrics') return {status: 200, text: metrics.render()};

  const actor = requestContext(request, auth);
  if (match.name === 'getLearningSession') {
    const data = await repository.getLearningSession({actor, sessionId: requireUuid(match.sessionId, 'session_id')});
    return success(data, {requestId, locale: data.locale});
  }
  if (match.name === 'getConceptLesson') {
    const url = new URL(request.url, 'http://localhost');
    const locale = normalizeRequestedLocale(url.searchParams.get('locale') || 'en');
    const data = await repository.getConceptLesson({actor, conceptId:requireUuid(match.conceptId, 'concept_id'), locale});
    return success(data, {requestId, locale});
  }
  if (match.name === 'getFormulaLessonSession') {
    const data = await repository.getFormulaLessonSession({actor, formulaSessionId:requireUuid(match.formulaSessionId, 'formula_session_id')});
    return success(data, {requestId, locale:data.locale});
  }
  if (match.name === 'getProgress') {
    const data = await repository.getProgress({actor, studentId: requireUuid(match.studentId, 'student_id')});
    return success(data, {requestId});
  }

  const key = requireIdempotencyKey(request);
  const body = await readJson(request);
  const hash = requestHash({path: request.url, body});

  if (match.name === 'createDiagnostic') {
    const locale = normalizeRequestedLocale(body.locale);
    const data = await repository.createDiagnostic({actor, locale, key, hash});
    return success(data, {requestId, locale, status: data.replayed ? 200 : 201, extraMeta: {replayed: data.replayed}});
  }
  if (match.name === 'addDiagnosticResponse') {
    const data = await repository.addDiagnosticResponse({
      actor,
      diagnosticId: requireUuid(match.diagnosticId, 'diagnostic_id'),
      problemItemId: requireUuid(body.problem_item_id, 'problem_item_id'),
      responseValue: body.response_value,
      durationMs: body.duration_ms,
      key,
      hash
    });
    return success(data, {requestId, status: data.replayed ? 200 : 201, extraMeta: {replayed: data.replayed}});
  }
  if (match.name === 'completeDiagnostic') {
    const data = await repository.completeDiagnostic({actor, diagnosticId: requireUuid(match.diagnosticId, 'diagnostic_id'), key, hash});
    return success(data, {requestId, extraMeta: {replayed: data.replayed}});
  }
  if (match.name === 'createLearningSession') {
    const locale = normalizeRequestedLocale(body.locale);
    const data = await repository.createLearningSession({
      actor,
      pathItemId: requireUuid(body.learning_path_item_id, 'learning_path_item_id'),
      locale,
      key,
      hash
    });
    return success(data, {requestId, locale, status: data.replayed ? 200 : 201, extraMeta: {replayed: data.replayed}});
  }
  if (match.name === 'startFormulaLesson') {
    const data = await repository.startFormulaLesson({
      actor,
      learningSessionId:requireUuid(match.sessionId, 'session_id'),
      lessonDefinitionId:body.lesson_definition_id === undefined ? undefined : requireUuid(body.lesson_definition_id, 'lesson_definition_id'),
      key,
      hash
    });
    return success(data, {requestId, locale:data.locale, status:data.replayed ? 200 : 201, extraMeta:{replayed:data.replayed}});
  }
  if (match.name === 'addFormulaLessonResponse') {
    if (body.response_value === undefined) throw badRequest('RESPONSE_VALUE_REQUIRED', 'error.response_value_required');
    if (body.hint_level !== undefined && (!Number.isInteger(body.hint_level) || body.hint_level < 0 || body.hint_level > 3)) {
      throw badRequest('INVALID_HINT_LEVEL', 'error.invalid_hint_level');
    }
    const data = await repository.addFormulaLessonResponse({
      actor,
      formulaSessionId:requireUuid(match.formulaSessionId, 'formula_session_id'),
      responseValue:body.response_value,
      hintLevel:body.hint_level,
      durationMs:body.duration_ms,
      key,
      hash
    });
    return success(data, {requestId, status:data.replayed ? 200 : 201, extraMeta:{replayed:data.replayed}});
  }
  if (match.name === 'completeFormulaLesson') {
    const data = await repository.completeFormulaLesson({
      actor,
      formulaSessionId:requireUuid(match.formulaSessionId, 'formula_session_id'),
      key,
      hash
    });
    return success(data, {requestId, locale:data.locale, extraMeta:{replayed:data.replayed}});
  }
  if (match.name === 'addLearningAnswer') {
    if (body.hint_level !== undefined && (!Number.isInteger(body.hint_level) || body.hint_level < 0 || body.hint_level > 3)) {
      throw badRequest('INVALID_HINT_LEVEL', 'error.invalid_hint_level');
    }
    const data = await repository.addLearningAnswer({
      actor,
      sessionId: requireUuid(match.sessionId, 'session_id'),
      problemItemId: requireUuid(body.problem_item_id, 'problem_item_id'),
      responseValue: body.response_value,
      durationMs: body.duration_ms,
      hintLevel: body.hint_level,
      key,
      hash
    });
    return success(data, {requestId, status: data.replayed ? 200 : 201, extraMeta: {replayed: data.replayed}});
  }
  if (match.name === 'completeLearningSession') {
    const data = await repository.completeLearningSession({actor, sessionId: requireUuid(match.sessionId, 'session_id'), key, hash});
    return success(data, {requestId, locale: data.locale, extraMeta: {replayed: data.replayed}});
  }
  throw notFound();
}

export function createMathChakChakServer({repository, auth, metrics = new OperationsMetrics()}) {
  return http.createServer(async (request, response) => {
    const requestId = newRequestId();
    const startedAt = performance.now();
    let status = 500;
    try {
      const url = new URL(request.url, 'http://localhost');
      const matched = route(request.method, url.pathname);
      if (!matched) throw notFound();
      const result = await execute(repository, request, matched, requestId, {auth, metrics});
      status = result.status;
      if (result.text !== undefined) sendText(response, result.status, result.text, {requestId, contentType: 'text/plain; version=0.0.4; charset=utf-8'});
      else sendJson(response, result.status, result.payload, {requestId, locale: result.payload.meta?.locale});
    } catch (error) {
      if (error?.code === '22P02') error = badRequest('INVALID_IDENTIFIER', 'error.invalid_identifier');
      if (error?.code === '23503') error = badRequest('INVALID_REFERENCE', 'error.invalid_reference');
      const result = failure(error, requestId);
      status = result.status;
      sendJson(response, result.status, result.payload, {requestId});
      if (!(error instanceof ApiError)) {
        console.error(JSON.stringify({event: 'request_failure', request_id: requestId, code: 'INTERNAL_ERROR'}));
      }
    } finally {
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
      metrics.record({status, durationMs});
      console.log(JSON.stringify({
        event: 'http_request',
        request_id: requestId,
        method: request.method,
        path: new URL(request.url, 'http://localhost').pathname,
        status,
        duration_ms: durationMs
      }));
    }
  });
}
