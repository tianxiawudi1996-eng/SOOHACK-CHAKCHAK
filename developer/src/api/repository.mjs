import crypto from 'node:crypto';
import pg from 'pg';
import {canCompleteFormulaLesson, evaluateFormulaResponse} from '../learning/formula-learning.mjs';
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

function localizeValue(value, locale) {
  if (Array.isArray(value)) return value.map((item) => localizeValue(item, locale));
  if (!value || typeof value !== 'object') return value;
  const localeKeys = ['ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru'];
  if (localeKeys.some((key) => Object.hasOwn(value, key))) return value[locale] ?? value.en ?? value.ko;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeValue(item, locale)]));
}

function mapFormulaSession(row) {
  return {
    id: row.id,
    learning_session_id: row.learning_session_id,
    lesson_definition_id: row.lesson_definition_id,
    student_id: row.student_profile_id,
    locale: row.locale,
    status: row.status,
    current_step_no: row.current_step_no,
    mastery_score: Number(row.mastery_score),
    started_at: row.started_at,
    completed_at: row.completed_at,
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

  async getConceptLesson({actor, conceptId, locale}) {
    const client = await this.pool.connect();
    try {
      await this.assertStudentOwner(client, actor);
      const lesson = await client.query(
        `SELECT c.id AS concept_id, c.semantic_key AS concept_key, c.grade_band,
                f.id AS formula_id, f.semantic_key AS formula_key, f.notation,
                f.variable_definitions, f.derivation_steps, f.misconception_rules,
                fl.title, fl.plain_language, fl.memory_cue, fl.worked_example_intro,
                ld.id AS lesson_definition_id, ld.semantic_key AS lesson_key,
                ld.content_version, ld.mastery_threshold
           FROM mathchakchak.math_concept c
           JOIN mathchakchak.formula_definition f ON f.concept_id = c.id AND f.active = true
           JOIN mathchakchak.formula_localization fl ON fl.formula_id = f.id AND fl.locale = $2
           JOIN mathchakchak.lesson_definition ld ON ld.concept_id = c.id AND ld.active = true
          WHERE c.id = $1 AND c.active = true
          ORDER BY ld.content_version DESC LIMIT 1`,
        [conceptId, locale]
      );
      if (!lesson.rowCount) throw notFound();
      const examples = await client.query(
        `SELECT sequence_no, problem_context, solution_steps, final_answer
           FROM mathchakchak.worked_example
          WHERE formula_id = $1 AND active = true ORDER BY sequence_no`,
        [lesson.rows[0].formula_id]
      );
      const steps = await client.query(
        `SELECT id, sequence_no, stage, interaction_type, content,
                jsonb_array_length(hint_ladder) AS hint_count
           FROM mathchakchak.lesson_step
          WHERE lesson_definition_id = $1 ORDER BY sequence_no`,
        [lesson.rows[0].lesson_definition_id]
      );
      const row = lesson.rows[0];
      return {
        concept: {id:row.concept_id,semantic_key:row.concept_key,grade_band:row.grade_band},
        formula: {
          id:row.formula_id,semantic_key:row.formula_key,notation:row.notation,
          variable_definitions:row.variable_definitions,derivation_steps:row.derivation_steps,
          misconception_rules:row.misconception_rules,title:row.title,
          plain_language:row.plain_language,memory_cue:row.memory_cue,
          worked_example_intro:row.worked_example_intro
        },
        lesson: {
          id:row.lesson_definition_id,semantic_key:row.lesson_key,content_version:row.content_version,
          mastery_threshold:Number(row.mastery_threshold),
          steps:steps.rows.map((step) => ({...step,content:localizeValue(step.content, locale)}))
        },
        worked_examples:examples.rows
      };
    } finally {
      client.release();
    }
  }

  async formulaSessionResult(client, {actor, formulaSessionId}) {
    const session = await client.query(
      `SELECT * FROM mathchakchak.formula_learning_session
        WHERE id = $1 AND student_profile_id = $2`,
      [formulaSessionId, actor.studentId]
    );
    if (!session.rowCount) throw notFound();
    const row = session.rows[0];
    let currentStep = null;
    if (row.status === 'IN_PROGRESS' && row.current_step_no <= 5) {
      const step = await client.query(
        `SELECT id, sequence_no, stage, interaction_type, content,
                jsonb_array_length(hint_ladder) AS hint_count
           FROM mathchakchak.lesson_step
          WHERE lesson_definition_id = $1 AND sequence_no = $2`,
        [row.lesson_definition_id, row.current_step_no]
      );
      currentStep = step.rowCount ? {...step.rows[0],content:localizeValue(step.rows[0].content, row.locale)} : null;
    }
    const summary = await client.query(
      `SELECT count(*)::integer AS attempts,
              count(DISTINCT lesson_step_id) FILTER (WHERE outcome = 'CORRECT')::integer AS completed_steps,
              array_remove(array_agg(DISTINCT misconception_code), NULL) AS misconceptions
         FROM mathchakchak.formula_learning_response WHERE formula_learning_session_id = $1`,
      [formulaSessionId]
    );
    return {...mapFormulaSession(row),current_step:currentStep,response_summary:summary.rows[0]};
  }

  async startFormulaLesson({actor, learningSessionId, lessonDefinitionId, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const learning = await client.query(
        `SELECT ls.*, lpi.topic_id
           FROM mathchakchak.learning_session ls
           JOIN mathchakchak.learning_path_item lpi ON lpi.id = ls.learning_path_item_id
          WHERE ls.id = $1 AND ls.student_profile_id = $2 FOR UPDATE`,
        [learningSessionId, actor.studentId]
      );
      if (!learning.rowCount) throw notFound();
      if (learning.rows[0].status !== 'IN_PROGRESS') throw conflict('LEARNING_SESSION_NOT_ACTIVE');
      const scope = `formula-lessons.create.${learningSessionId}`;
      const replayReference = await this.findIdempotency(client, {actor, scope, key, hash});
      if (replayReference) return {...await this.formulaSessionResult(client, {actor, formulaSessionId:replayReference}),replayed:true};
      const definition = await client.query(
        `SELECT ld.id
           FROM mathchakchak.lesson_definition ld
           JOIN mathchakchak.math_concept c ON c.id = ld.concept_id
          WHERE c.topic_id = $1 AND c.active = true AND ld.active = true
            AND ($2::uuid IS NULL OR ld.id = $2)
          ORDER BY ld.content_version DESC LIMIT 1`,
        [learning.rows[0].topic_id, lessonDefinitionId ?? null]
      );
      if (!definition.rowCount) throw notFound();
      const existing = await client.query(
        `SELECT status FROM mathchakchak.formula_learning_session
          WHERE learning_session_id = $1 AND lesson_definition_id = $2`,
        [learningSessionId, definition.rows[0].id]
      );
      if (existing.rowCount) {
        throw conflict(existing.rows[0].status === 'COMPLETED' ? 'FORMULA_LESSON_ALREADY_COMPLETED' : 'ACTIVE_FORMULA_LESSON_EXISTS');
      }
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO mathchakchak.formula_learning_session
          (id, learning_session_id, lesson_definition_id, student_profile_id, locale, status)
         VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS')`,
        [id, learningSessionId, definition.rows[0].id, actor.studentId, learning.rows[0].locale]
      );
      await this.saveIdempotency(client, {actor, scope, key, hash, reference:id, status:201});
      return {...await this.formulaSessionResult(client, {actor, formulaSessionId:id}),replayed:false};
    });
  }

  async getFormulaLessonSession({actor, formulaSessionId}) {
    const client = await this.pool.connect();
    try {
      await this.assertStudentOwner(client, actor);
      return this.formulaSessionResult(client, {actor, formulaSessionId});
    } finally {
      client.release();
    }
  }

  async addFormulaLessonResponse({actor, formulaSessionId, responseValue, hintLevel, durationMs, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const session = await client.query(
        `SELECT * FROM mathchakchak.formula_learning_session
          WHERE id = $1 AND student_profile_id = $2 FOR UPDATE`,
        [formulaSessionId, actor.studentId]
      );
      if (!session.rowCount) throw notFound();
      if (session.rows[0].status !== 'IN_PROGRESS' || session.rows[0].current_step_no > 5) throw conflict('FORMULA_LESSON_NOT_ACTIVE');
      const scope = `formula-lessons.response.${formulaSessionId}`;
      const replayReference = await this.findIdempotency(client, {actor, scope, key, hash});
      if (replayReference) {
        const replay = await client.query(
          'SELECT id, lesson_step_id, attempt_no, outcome, misconception_code, hint_level, duration_ms, created_at FROM mathchakchak.formula_learning_response WHERE id = $1',
          [replayReference]
        );
        return {...replay.rows[0],replayed:true};
      }
      const stepResult = await client.query(
        `SELECT * FROM mathchakchak.lesson_step
          WHERE lesson_definition_id = $1 AND sequence_no = $2`,
        [session.rows[0].lesson_definition_id, session.rows[0].current_step_no]
      );
      if (!stepResult.rowCount) throw conflict('FORMULA_LESSON_STEP_MISSING');
      const step = stepResult.rows[0];
      const evaluation = evaluateFormulaResponse(step, responseValue, {hintLevel:hintLevel ?? 0});
      const attempts = await client.query(
        `SELECT count(*)::integer + 1 AS next FROM mathchakchak.formula_learning_response
          WHERE formula_learning_session_id = $1 AND lesson_step_id = $2`,
        [formulaSessionId, step.id]
      );
      const id = crypto.randomUUID();
      const inserted = await client.query(
        `INSERT INTO mathchakchak.formula_learning_response
          (id, formula_learning_session_id, lesson_step_id, attempt_no, response_value,
           outcome, misconception_code, hint_level, duration_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, lesson_step_id, attempt_no, outcome, misconception_code, hint_level, duration_ms, created_at`,
        [id,formulaSessionId,step.id,attempts.rows[0].next,responseValue,evaluation.outcome,
         evaluation.misconception_code,hintLevel ?? 0,durationMs ?? null]
      );
      if (evaluation.outcome === 'CORRECT') {
        await client.query(
          'UPDATE mathchakchak.formula_learning_session SET current_step_no = current_step_no + 1, updated_at = now() WHERE id = $1',
          [formulaSessionId]
        );
      }
      const responseRows = await client.query(
        `SELECT lesson_step_id, outcome, hint_level FROM mathchakchak.formula_learning_response
          WHERE formula_learning_session_id = $1`,
        [formulaSessionId]
      );
      const completion = canCompleteFormulaLesson({responses:responseRows.rows});
      await client.query('UPDATE mathchakchak.formula_learning_session SET mastery_score = $2 WHERE id = $1', [formulaSessionId, completion.mastery]);
      if (evaluation.outcome === 'CORRECT' && step.sequence_no === 5 && !completion.allowed) {
        const remediation = await client.query(
          `SELECT ls.sequence_no
             FROM mathchakchak.lesson_step ls
             LEFT JOIN mathchakchak.formula_learning_response flr
               ON flr.lesson_step_id = ls.id
              AND flr.formula_learning_session_id = $2
              AND flr.outcome = 'CORRECT'
            WHERE ls.lesson_definition_id = $1
            GROUP BY ls.id, ls.sequence_no
            ORDER BY COALESCE(min(flr.hint_level), 4) DESC, ls.sequence_no
            LIMIT 1`,
          [session.rows[0].lesson_definition_id, formulaSessionId]
        );
        await client.query(
          'UPDATE mathchakchak.formula_learning_session SET current_step_no = $2, updated_at = now() WHERE id = $1',
          [formulaSessionId, remediation.rows[0].sequence_no]
        );
      }
      await this.saveIdempotency(client, {actor, scope, key, hash, reference:id, status:201});
      const hintIndex = Math.min(hintLevel ?? 0, Math.max(0, step.hint_ladder.length - 1));
      return {
        ...inserted.rows[0],
        mastery_score:completion.mastery,
        hint:evaluation.outcome === 'INCORRECT' ? localizeValue(step.hint_ladder[hintIndex], session.rows[0].locale) : null,
        replayed:false
      };
    });
  }

  async completeFormulaLesson({actor, formulaSessionId, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const session = await client.query(
        `SELECT fls.*, ld.mastery_threshold
           FROM mathchakchak.formula_learning_session fls
           JOIN mathchakchak.lesson_definition ld ON ld.id = fls.lesson_definition_id
          WHERE fls.id = $1 AND fls.student_profile_id = $2 FOR UPDATE`,
        [formulaSessionId, actor.studentId]
      );
      if (!session.rowCount) throw notFound();
      const scope = `formula-lessons.complete.${formulaSessionId}`;
      const replayReference = await this.findIdempotency(client, {actor, scope, key, hash});
      if (replayReference) return {...await this.formulaSessionResult(client, {actor, formulaSessionId}),replayed:true};
      if (session.rows[0].status !== 'IN_PROGRESS') throw conflict('FORMULA_LESSON_NOT_ACTIVE');
      const responses = await client.query(
        'SELECT lesson_step_id, outcome, hint_level FROM mathchakchak.formula_learning_response WHERE formula_learning_session_id = $1',
        [formulaSessionId]
      );
      const result = canCompleteFormulaLesson({
        responses:responses.rows,
        masteryThreshold:Number(session.rows[0].mastery_threshold)
      });
      if (!result.allowed) throw conflict('FORMULA_LESSON_MASTERY_REQUIRED');
      await client.query(
        `UPDATE mathchakchak.formula_learning_session
            SET status = 'COMPLETED', current_step_no = 6, mastery_score = $2,
                completed_at = now(), updated_at = now()
          WHERE id = $1`,
        [formulaSessionId,result.mastery]
      );
      await this.saveIdempotency(client, {actor, scope, key, hash, reference:formulaSessionId, status:200});
      return {...await this.formulaSessionResult(client, {actor, formulaSessionId}),replayed:false};
    });
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
      const attempts = await client.query(
        `SELECT
           (SELECT count(*) FROM mathchakchak.learning_attempt WHERE learning_session_id = $1)::integer AS answer_count,
           (SELECT count(*) FROM mathchakchak.formula_learning_session WHERE learning_session_id = $1 AND status = 'COMPLETED')::integer AS formula_count`,
        [sessionId]
      );
      if (attempts.rows[0].answer_count === 0 && attempts.rows[0].formula_count === 0) throw conflict('LEARNING_SESSION_NOT_COMPLETABLE');
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
