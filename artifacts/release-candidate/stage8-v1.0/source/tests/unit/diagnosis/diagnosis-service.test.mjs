import test from 'node:test';
import assert from 'node:assert/strict';
import {completeDiagnostic, createDiagnostic, recordDiagnosticResponse, startDiagnostic} from '../../../developer/src/diagnosis/diagnosis-service.mjs';

test('diagnostic enforces state, unique response, and result calculation', () => {
  let session = createDiagnostic({id:'d1',studentId:'s1',locale:'ko',createdAt:'2026-01-01T00:00:00Z'});
  session = startDiagnostic(session, '2026-01-01T00:01:00Z');
  session = recordDiagnosticResponse(session, {problemItemId:'p1',outcome:'CORRECT'});
  assert.throws(() => recordDiagnosticResponse(session, {problemItemId:'p1',outcome:'INCORRECT'}), /DUPLICATE/);
  session = recordDiagnosticResponse(session, {problemItemId:'p2',outcome:'INCORRECT'});
  session = completeDiagnostic(session, '2026-01-01T00:03:00Z');
  assert.deepEqual(session.result, {answered:2,correct:1,accuracy:0.5});
});
