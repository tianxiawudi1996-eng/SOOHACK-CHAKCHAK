import crypto from 'node:crypto';
import pg from 'pg';
import {buildProgressReport} from '../report/progress-report.mjs';
import {conflict, forbidden, notFound} from './errors.mjs';
import {scoreResponse} from './scoring.mjs';

const {Pool} = pg;

function mapDiagnostic(row) {
  return {
    id: row.id,
    student_id: row.student_profile_id,
    locale: row.locale,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at
  };
}

function mapLearningSession(row) {
  return {
    id: row.id,
    student_id: row.student_profile_id,
    learning_path_item_id: row.learning_path_item_id,
    locale: row.locale,
    status: row.status,
    current_step: row.current_step,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export class MathChakChakRepository {
  constructor({connectionString}) {
    if (!connectionString) throw new Error('DATABASE_URL_REQUIRED');
    this.pool = new Pool({
      connectionString,
      application_name: 'mathchakchak-api',
      max: 10,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
      idleTimeoutMillis: 10000
    });
  }

  async close() {
    await this.pool.end();
  }

  async health() {
    const result = await this.pool.query('SELECT current_database() AS database, 1 AS ready');
    return {database: result.rows[0].database, ready: result.rows[0].ready === 1};
  }

  async withTransaction(operation) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async assertStudentOwner(client, actor) {
    const result = await client.query(
      `SELECT 1
         FROM mathchakchak.student_profile sp
         JOIN mathchakchak.app_user u ON u.id = sp.user_id
        WHERE sp.id = $1 AND u.id = $2 AND u.role = 'STUDENT' AND u.status = 'ACTIVE'`,
      [actor.studentId, actor.userId]
    );
    if (result.rowCount !== 1) throw forbidden();
  }

  async findIdempotency(client, {actor, scope, key, hash}) {
    const result = await client.query(
      `SELECT request_hash, response_reference
         FROM mathchakchak.idempotency_record
        WHERE actor_user_id = $1 AND scope = $2 AND idempotency_key = $3 AND expires_at > now()`,
      [actor.userId, scope, key]
    );
    if (!result.rowCount) return null;
    if (result.rows[0].request_hash !== hash) throw conflict('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST');
    return result.rows[0].response_reference;
  }

  async saveIdempotency(client, {actor, scope, key, hash, reference, status}) {
    await client.query(
      `INSERT INTO mathchakchak.idempotency_record
        (id, actor_user_id, scope, idempotency_key, request_hash, response_status, response_reference, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now() + interval '24 hours')`,
      [crypto.randomUUID(), actor.userId, scope, key, hash, status, reference]
    );
  }

  async createDiagnostic({actor, locale, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const replayReference = await this.findIdempotency(client, {actor, scope: 'diagnostics.create', key, hash});
      if (replayReference) {
        const replay = await client.query('SELECT * FROM mathchakchak.diagnostic_session WHERE id = $1', [replayReference]);
        if (!replay.rowCount) throw notFound();
        return {...mapDiagnostic(replay.rows[0]), replayed: true};
      }
      const id = crypto.randomUUID();
      const result = await client.query(
        `INSERT INTO mathchakchak.diagnostic_session
          (id, student_profile_id, locale, status, started_at)
         VALUES ($1, $2, $3, 'IN_PROGRESS', now())
         RETURNING *`,
        [id, actor.studentId, locale]
      );
      await this.saveIdempotency(client, {actor, scope: 'diagnostics.create', key, hash, reference: id, status: 201});
      return {...mapDiagnostic(result.rows[0]), replayed: false};
    });
  }

  async addDiagnosticResponse({actor, diagnosticId, problemItemId, responseValue, durationMs, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const diagnostic = await client.query(
        `SELECT * FROM mathchakchak.diagnostic_session
          WHERE id = $1 AND student_profile_id = $2 FOR UPDATE`,
        [diagnosticId, actor.studentId]
      );
      if (!diagnostic.rowCount) throw notFound();
      const scope = `diagnostics.response.${diagnosticId}`;
      const replayReference = await this.findIdempotency(client, {actor, scope, key, hash});
      if (replayReference) {
        const replay = await client.query('SELECT id, sequence_no, outcome, duration_ms, created_at FROM mathchakchak.diagnostic_response WHERE id = $1', [replayReference]);
        if (!replay.rowCount) throw notFound();
        return {...replay.rows[0], replayed: true};
      }
      if (diagnostic.rows[0].status !== 'IN_PROGRESS') throw conflict('DIAGNOSTIC_NOT_IN_PROGRESS');

      const problem = await client.query('SELECT answer_schema FROM mathchakchak.problem_item WHERE id = $1 AND active = true', [problemItemId]);
      if (!problem.rowCount) throw notFound();
      const outcome = scoreResponse(problem.rows[0].answer_schema, responseValue);
      const sequence = await client.query('SELECT count(*)::integer + 1 AS next FROM mathchakchak.diagnostic_response WHERE diagnostic_session_id = $1', [diagnosticId]);
      const id = crypto.randomUUID();
      let result;
      try {
        result = await client.query(
          `INSERT INTO mathchakchak.diagnostic_response
            (id, diagnostic_session_id, problem_item_id, sequence_no, response_value, outcome, duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, sequence_no, outcome, duration_ms, created_at`,
          [id, diagnosticId, problemItemId, sequence.rows[0].next, responseValue, outcome, durationMs ?? null]
        );
      } catch (error) {
        if (error.code === '23505') throw conflict('DUPLICATE_DIAGNOSTIC_RESPONSE');
        throw error;
      }
      await this.saveIdempotency(client, {actor, scope, key, hash, reference: id, status: 201});
      return {...result.rows[0], replayed: false};
    });
  }

  async completeDiagnostic({actor, diagnosticId, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const session = await client.query(
        'SELECT * FROM mathchakchak.diagnostic_session WHERE id = $1 AND student_profile_id = $2 FOR UPDATE',
        [diagnosticId, actor.studentId]
      );
      if (!session.rowCount) throw notFound();
      const scope = `diagnostics.complete.${diagnosticId}`;
      const replayReference = await this.findIdempotency(client, {actor, scope, key, hash});
      if (replayReference) return {...await this.diagnosticCompletionResult(client, diagnosticId, replayReference), replayed: true};
      if (session.rows[0].status !== 'IN_PROGRESS') throw conflict('DIAGNOSTIC_NOT_COMPLETABLE');

      const summary = await client.query(
        `SELECT count(*)::integer AS answered,
                count(*) FILTER (WHERE dr.outcome = 'CORRECT')::integer AS correct,
                (array_agg(pi.topic_id ORDER BY CASE WHEN dr.outcome = 'INCORRECT' THEN 0 ELSE 1 END, dr.sequence_no))[1] AS topic_id
           FROM mathchakchak.diagnostic_response dr
           JOIN mathchakchak.problem_item pi ON pi.id = dr.problem_item_id
          WHERE dr.diagnostic_session_id = $1`,
        [diagnosticId]
      );
      if (summary.rows[0].answered === 0) throw conflict('DIAGNOSTIC_NOT_COMPLETABLE');
      await client.query("UPDATE mathchakchak.diagnostic_session SET status = 'COMPLETED', completed_at = now() WHERE id = $1", [diagnosticId]);
      const pathId = crypto.randomUUID();
      const pathItemId = crypto.randomUUID();
      await client.query(
        `INSERT INTO mathchakchak.learning_path
          (id, student_profile_id, source_diagnostic_id, status, algorithm_version)
         VALUES ($1, $2, $3, 'ACTIVE', 'diagnostic-v1')`,
        [pathId, actor.studentId, diagnosticId]
      );
      await client.query(
        `INSERT INTO mathchakchak.learning_path_item
          (id, learning_path_id, topic_id, sequence_no, status)
         VALUES ($1, $2, $3, 1, 'READY')`,
        [pathItemId, pathId, summary.rows[0].topic_id]
      );
      await this.saveIdempotency(client, {actor, scope, key, hash, reference: pathItemId, status: 200});
      return {...await this.diagnosticCompletionResult(client, diagnosticId, pathItemId), replayed: false};
    });
  }

  async diagnosticCompletionResult(client, diagnosticId, pathItemId) {
    const summary = await client.query(
      `SELECT count(*)::integer AS answered,
              count(*) FILTER (WHERE outcome = 'CORRECT')::integer AS correct
         FROM mathchakchak.diagnostic_response WHERE diagnostic_session_id = $1`,
      [diagnosticId]
    );
    const {answered, correct} = summary.rows[0];
    return {diagnostic_id: diagnosticId, status: 'COMPLETED', answered, correct, accuracy: answered ? correct / answered : null, learning_path_item_id: pathItemId};
  }

  async createLearningSession({actor, pathItemId, locale, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const pathItem = await client.query(
        `SELECT lpi.id
           FROM mathchakchak.learning_path_item lpi
           JOIN mathchakchak.learning_path lp ON lp.id = lpi.learning_path_id
          WHERE lpi.id = $1 AND lp.student_profile_id = $2`,
        [pathItemId, actor.studentId]
      );
      if (!pathItem.rowCount) throw notFound();
      const replayReference = await this.findIdempotency(client, {actor, scope: 'learning-sessions.create', key, hash});
      if (replayReference) {
        const replay = await client.query('SELECT * FROM mathchakchak.learning_session WHERE id = $1', [replayReference]);
        if (!replay.rowCount) throw notFound();
        return {...mapLearningSession(replay.rows[0]), replayed: true};
      }
      const existing = await client.query(
        `SELECT * FROM mathchakchak.learning_session
          WHERE student_profile_id = $1 AND learning_path_item_id = $2 AND status IN ('CREATED','IN_PROGRESS')`,
        [actor.studentId, pathItemId]
      );
      if (existing.rowCount) throw conflict('ACTIVE_LEARNING_SESSION_EXISTS');
      const id = crypto.randomUUID();
      const result = await client.query(
        `INSERT INTO mathchakchak.learning_session
          (id, student_profile_id, learning_path_item_id, locale, status, started_at)
         VALUES ($1, $2, $3, $4, 'IN_PROGRESS', now()) RETURNING *`,
        [id, actor.studentId, pathItemId, locale]
      );
      await client.query("UPDATE mathchakchak.learning_path_item SET status = 'IN_PROGRESS' WHERE id = $1", [pathItemId]);
      await this.saveIdempotency(client, {actor, scope: 'learning-sessions.create', key, hash, reference: id, status: 201});
      return {...mapLearningSession(result.rows[0]), replayed: false};
    });
  }

  async getLearningSession({actor, sessionId}) {
    const client = await this.pool.connect();
    try {
      await this.assertStudentOwner(client, actor);
      const result = await client.query('SELECT * FROM mathchakchak.learning_session WHERE id = $1 AND student_profile_id = $2', [sessionId, actor.studentId]);
      if (!result.rowCount) throw notFound();
      return mapLearningSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async addLearningAnswer({actor, sessionId, problemItemId, responseValue, durationMs, hintLevel, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const session = await client.query(
        'SELECT * FROM mathchakchak.learning_session WHERE id = $1 AND student_profile_id = $2 FOR UPDATE',
        [sessionId, actor.studentId]
      );
      if (!session.rowCount) throw notFound();
      const scope = `learning-sessions.answer.${sessionId}`;
      const replayReference = await this.findIdempotency(client, {actor, scope, key, hash});
      if (replayReference) {
        const replay = await client.query('SELECT id, sequence_no, outcome, hint_level, duration_ms, created_at FROM mathchakchak.learning_attempt WHERE id = $1', [replayReference]);
        if (!replay.rowCount) throw notFound();
        return {...replay.rows[0], replayed: true};
      }
      if (session.rows[0].status !== 'IN_PROGRESS') throw conflict('LEARNING_SESSION_NOT_ACTIVE');
      const problem = await client.query('SELECT answer_schema FROM mathchakchak.problem_item WHERE id = $1 AND active = true', [problemItemId]);
      if (!problem.rowCount) throw notFound();
      const outcome = scoreResponse(problem.rows[0].answer_schema, responseValue);
      const sequence = await client.query('SELECT count(*)::integer + 1 AS next FROM mathchakchak.learning_attempt WHERE learning_session_id = $1', [sessionId]);
      const id = crypto.randomUUID();
      const result = await client.query(
        `INSERT INTO mathchakchak.learning_attempt
          (id, learning_session_id, problem_item_id, sequence_no, response_value, outcome, hint_level, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, sequence_no, outcome, hint_level, duration_ms, created_at`,
        [id, sessionId, problemItemId, sequence.rows[0].next, responseValue, outcome, hintLevel ?? 0, durationMs ?? null]
      );
      await client.query('UPDATE mathchakchak.learning_session SET current_step = current_step + 1, updated_at = now() WHERE id = $1', [sessionId]);
      await this.saveIdempotency(client, {actor, scope, key, hash, reference: id, status: 201});
      return {...result.rows[0], replayed: false};
    });
  }

  async completeLearningSession({actor, sessionId, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const session = await client.query(
        'SELECT * FROM mathchakchak.learning_session WHERE id = $1 AND student_profile_id = $2 FOR UPDATE',
        [sessionId, actor.studentId]
      );
      if (!session.rowCount) throw notFound();
      const scope = `learning-sessions.complete.${sessionId}`;
      const replayReference = await this.findIdempotency(client, {actor, scope, key, hash});
      if (replayReference) {
        const replay = await client.query('SELECT * FROM mathchakchak.learning_session WHERE id = $1', [replayReference]);
        return {...mapLearningSession(replay.rows[0]), replayed: true};
      }
      if (session.rows[0].status !== 'IN_PROGRESS') throw conflict('LEARNING_SESSION_NOT_ACTIVE');
      const attempts = await client.query('SELECT count(*)::integer AS count FROM mathchakchak.learning_attempt WHERE learning_session_id = $1', [sessionId]);
      if (attempts.rows[0].count === 0) throw conflict('LEARNING_SESSION_NOT_COMPLETABLE');
      const result = await client.query(
        `UPDATE mathchakchak.learning_session
            SET status = 'COMPLETED', completed_at = now(), updated_at = now()
          WHERE id = $1 RETURNING *`,
        [sessionId]
      );
      if (session.rows[0].learning_path_item_id) {
        await client.query("UPDATE mathchakchak.learning_path_item SET status = 'COMPLETED' WHERE id = $1", [session.rows[0].learning_path_item_id]);
      }
      await this.saveIdempotency(client, {actor, scope, key, hash, reference: sessionId, status: 200});
      return {...mapLearningSession(result.rows[0]), replayed: false};
    });
  }

  async getProgress({actor, studentId}) {
    const client = await this.pool.connect();
    try {
      await this.assertStudentOwner(client, actor);
      if (studentId !== actor.studentId) throw forbidden();
      const attempts = await client.query(
        `SELECT la.outcome, pi.topic_id AS "topicId"
           FROM mathchakchak.learning_attempt la
           JOIN mathchakchak.learning_session ls ON ls.id = la.learning_session_id
           JOIN mathchakchak.problem_item pi ON pi.id = la.problem_item_id
          WHERE ls.student_profile_id = $1 ORDER BY la.created_at`,
        [studentId]
      );
      const reviews = await client.query(
        `SELECT ra.outcome
           FROM mathchakchak.review_attempt ra
           JOIN mathchakchak.review_item ri ON ri.id = ra.review_item_id
          WHERE ri.student_profile_id = $1 ORDER BY ra.attempted_at`,
        [studentId]
      );
      const sessions = await client.query(
        `SELECT count(*)::integer AS total,
                count(*) FILTER (WHERE status = 'COMPLETED')::integer AS completed
           FROM mathchakchak.learning_session WHERE student_profile_id = $1`,
        [studentId]
      );
      return {
        student_id: studentId,
        ...buildProgressReport({attempts: attempts.rows, reviews: reviews.rows}),
        learning_sessions: sessions.rows[0]
      };
    } finally {
      client.release();
    }
  }
}
