import crypto from 'node:crypto';
import pg from 'pg';
import {selectAdaptiveRoute} from '../learning/adaptive-routing.mjs';
import {buildCurriculumCollaborationPlan} from '../learning/curriculum-collaboration.mjs';
import {evaluateCollaborationEvidence,nextCollaborationPhase,summarizeCollaborationEvidence} from '../learning/collaboration-runtime.mjs';
import {canCompleteFormulaLesson, evaluateFormulaResponse} from '../learning/formula-learning.mjs';
import {applicationReviewDays,evaluateFormulaApplication} from '../learning/formula-application.mjs';
import {buildProgressReport} from '../report/progress-report.mjs';
import {buildLearningQualitySnapshot} from '../analytics/learning-quality.mjs';
import {canRequesterCancel,mapPrivacyRequest,privacyRequestBoundary} from '../privacy/data-rights.mjs';
import {mapPrivacyOperationsItem,privacyOperationsBoundary,validateOperatorTransition} from '../privacy/privacy-operations.mjs';
import {fulfilmentControlBoundary,mapFulfilmentPlan} from '../privacy/fulfilment-controls.mjs';
import {
  DEFAULT_PACKAGE_VALIDITY_SECONDS,buildPackageManifestPayload,
  fulfilmentPackageBoundary,hashApprovalBundle,hashCanonical,hashImpactSnapshot,mapFulfilmentPackage
} from '../privacy/fulfilment-package.mjs';
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
    adaptive_route: row.adaptive_route,
    starting_hint_level: row.starting_hint_level,
    target_difficulty: row.target_difficulty,
    started_at: row.started_at,
    completed_at: row.completed_at,
    updated_at: row.updated_at
  };
}

export class MathChakChakRepository {
  constructor({connectionString,fulfilmentPackageValiditySeconds=DEFAULT_PACKAGE_VALIDITY_SECONDS}) {
    if (!connectionString) throw new Error('DATABASE_URL_REQUIRED');
    const parsedValidity=Number.parseInt(String(fulfilmentPackageValiditySeconds),10);
    if(!Number.isInteger(parsedValidity)||parsedValidity<1||parsedValidity>DEFAULT_PACKAGE_VALIDITY_SECONDS){
      throw new Error('INVALID_FULFILMENT_PACKAGE_VALIDITY_SECONDS');
    }
    this.fulfilmentPackageValiditySeconds=parsedValidity;
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

  async createLocalDemoContext({conceptId}) {
    return this.withTransaction(async (client) => {
      const studentId = '22222222-2222-4222-8222-222222222222';
      const userId = '11111111-1111-4111-8111-111111111111';
      const concept = await client.query(
        `SELECT c.id, c.topic_id
           FROM mathchakchak.math_concept c
           JOIN mathchakchak.student_profile sp ON sp.id = $2
           JOIN mathchakchak.app_user u ON u.id = sp.user_id AND u.id = $3
          WHERE c.id = $1 AND c.active = true AND u.auth_subject = 'staging-student-001'`,
        [conceptId, studentId, userId]
      );
      if (!concept.rowCount) throw notFound();
      const learningPathId = crypto.randomUUID();
      const pathItemId = crypto.randomUUID();
      await client.query(
        `INSERT INTO mathchakchak.learning_path
          (id, student_profile_id, status, algorithm_version)
         VALUES ($1, $2, 'ACTIVE', 'local-demo-v1')`,
        [learningPathId, studentId]
      );
      await client.query(
        `INSERT INTO mathchakchak.learning_path_item
          (id, learning_path_id, topic_id, sequence_no, status)
         VALUES ($1, $2, $3, 1, 'READY')`,
        [pathItemId, learningPathId, concept.rows[0].topic_id]
      );
      return {userId,studentId,conceptId,learningPathItemId:pathItemId};
    });
  }

  async createLocalDemoPrivacyOperator(){
    const userId='33333333-3333-4333-8333-333333333333';
    await this.pool.query(
      `INSERT INTO mathchakchak.app_user (id,auth_subject,role,status)
       VALUES ($1,'local-privacy-operator-001','ADMIN','ACTIVE')
       ON CONFLICT (id) DO UPDATE SET role='ADMIN',status='ACTIVE',deleted_at=NULL,updated_at=now()`,
      [userId]
    );
    await this.pool.query(
      `INSERT INTO mathchakchak.privacy_operator_authorization (user_id,operation_role,active)
       VALUES ($1,'OPERATOR',true)
       ON CONFLICT (user_id) DO UPDATE SET operation_role='OPERATOR',active=true,updated_at=now()`,
      [userId]
    );
    return {userId};
  }

  async createLocalDemoPrivacyApprover({approvalRole}){
    const byRole={PRIVACY_APPROVER:'44444444-4444-4444-8444-444444444444',SECURITY_APPROVER:'55555555-5555-4555-8555-555555555555'};
    const userId=byRole[approvalRole];
    if(!userId)throw forbidden();
    await this.pool.query(
      `INSERT INTO mathchakchak.app_user (id,auth_subject,role,status)
       VALUES ($1,$2,'ADMIN','ACTIVE')
       ON CONFLICT (id) DO UPDATE SET role='ADMIN',status='ACTIVE',deleted_at=NULL,updated_at=now()`,
      [userId,`local-${approvalRole.toLowerCase()}-001`]
    );
    await this.pool.query(
      `INSERT INTO mathchakchak.privacy_operator_authorization (user_id,operation_role,active)
       VALUES ($1,$2,true)
       ON CONFLICT (user_id) DO UPDATE SET operation_role=EXCLUDED.operation_role,active=true,updated_at=now()`,
      [userId,approvalRole]
    );
    return {userId,approvalRole};
  }

  async getDiagnosticItems({actor, locale}) {
    const client = await this.pool.connect();
    try {
      await this.assertStudentOwner(client, actor);
      const result = await client.query(
        `SELECT dil.problem_item_id AS id, dil.sequence_no, dil.prompt, dil.choices,
                pi.difficulty, t.semantic_key AS topic_key
           FROM mathchakchak.diagnostic_item_localization dil
           JOIN mathchakchak.problem_item pi ON pi.id = dil.problem_item_id AND pi.active = true
           JOIN mathchakchak.topic t ON t.id = pi.topic_id AND t.active = true
          WHERE dil.locale = $1
          ORDER BY dil.sequence_no`,
        [locale]
      );
      return {items:result.rows};
    } finally {
      client.release();
    }
  }

  async getCurriculumGrades({actor,requestedLocale}) {
    const client=await this.pool.connect();
    try {
      await this.assertStudentOwner(client,actor);
      const result=await client.query(
        `SELECT cg.grade_code,cg.school_level,cg.grade_number,
                coalesce(requested.label,korean.label,cg.label_ko) AS label,
                coalesce(requested.official_band,korean.official_band,cg.official_band) AS official_band,
                cg.implementation_year,cg.placement_basis,
                coalesce(requested.course_path,korean.course_path,cg.course_path) AS course_path,
                (SELECT count(*)::integer FROM mathchakchak.grade_formula_catalog gfc
                  WHERE gfc.grade_code=cg.grade_code AND gfc.active=true) AS formula_count,
                CASE WHEN requested.grade_code IS NOT NULL THEN $1 ELSE 'ko' END AS content_locale
           FROM mathchakchak.curriculum_grade cg
           LEFT JOIN mathchakchak.curriculum_grade_translation requested
             ON requested.grade_code=cg.grade_code AND requested.locale=$1
           LEFT JOIN mathchakchak.curriculum_grade_translation korean
             ON korean.grade_code=cg.grade_code AND korean.locale='ko'
          ORDER BY cg.sequence_no`,
        [requestedLocale]
      );
      const contentLocale=result.rows.every((grade)=>grade.content_locale===requestedLocale)?requestedLocale:'ko';
      const grades=result.rows.map(({content_locale,...grade})=>grade);
      return {grades,requested_locale:requestedLocale,content_locale:contentLocale,translation_status:contentLocale===requestedLocale?(requestedLocale==='ko'?'SOURCE_ALIGNED':'TRANSLATION_REVIEW_REQUIRED'):'CANONICAL_KO_FALLBACK'};
    } finally { client.release(); }
  }

  async getGradeFormulas({actor,gradeCode,requestedLocale}) {
    const client=await this.pool.connect();
    try {
      await this.assertStudentOwner(client,actor);
      const grade=await client.query(
        `SELECT cg.grade_code,cg.school_level,cg.grade_number,
                coalesce(requested.label,korean.label,cg.label_ko) AS label,
                coalesce(requested.official_band,korean.official_band,cg.official_band) AS official_band,
                cg.implementation_year,cg.placement_basis,
                coalesce(requested.course_path,korean.course_path,cg.course_path) AS course_path
           FROM mathchakchak.curriculum_grade cg
           LEFT JOIN mathchakchak.curriculum_grade_translation requested
             ON requested.grade_code=cg.grade_code AND requested.locale=$2
           LEFT JOIN mathchakchak.curriculum_grade_translation korean
             ON korean.grade_code=cg.grade_code AND korean.locale='ko'
          WHERE cg.grade_code=$1`,
        [gradeCode,requestedLocale]
      );
      if(!grade.rowCount) throw notFound();
      const formulas=await client.query(
        `SELECT gfc.id,gfc.grade_code,gfc.sequence_no,gfc.strand,gfc.knowledge_type,
                gfc.semantic_key,coalesce(requested.title,korean.title,gfc.title_ko) AS title,
                coalesce(requested.display_notation,korean.display_notation,gfc.notation) AS notation,
                coalesce(requested.explanation,korean.explanation,gfc.explanation_ko) AS explanation,
                gfc.source_standard_codes,gfc.course_name,gfc.content_version,
                cr.notice_code,cr.annex,cr.official_url,
                coalesce(requested_reference.citation,korean_reference.citation,cr.notice_code||' '||cr.annex) AS source_citation,
                coalesce(requested.revision_no,korean.revision_no) AS revision_no,
                coalesce(requested.verification_status,korean.verification_status,'SOURCE_ALIGNED') AS verification_status,
                CASE WHEN requested.formula_catalog_id IS NOT NULL THEN $2 ELSE 'ko' END AS content_locale
           FROM mathchakchak.grade_formula_catalog gfc
           JOIN mathchakchak.curriculum_reference cr ON cr.id=gfc.curriculum_reference_id
           LEFT JOIN mathchakchak.curriculum_reference_translation requested_reference
             ON requested_reference.curriculum_reference_id=cr.id AND requested_reference.locale=$2
           LEFT JOIN mathchakchak.curriculum_reference_translation korean_reference
             ON korean_reference.curriculum_reference_id=cr.id AND korean_reference.locale='ko'
           LEFT JOIN LATERAL (
             SELECT formula_catalog_id,revision_no,title,display_notation,explanation,verification_status
               FROM mathchakchak.formula_explanation_revision
              WHERE formula_catalog_id=gfc.id AND locale=$2
              ORDER BY revision_no DESC LIMIT 1
           ) requested ON true
           LEFT JOIN LATERAL (
             SELECT formula_catalog_id,revision_no,title,display_notation,explanation,verification_status
               FROM mathchakchak.formula_explanation_revision
              WHERE formula_catalog_id=gfc.id AND locale='ko'
              ORDER BY revision_no DESC LIMIT 1
           ) korean ON true
          WHERE gfc.grade_code=$1 AND gfc.active=true
          ORDER BY gfc.sequence_no`,
        [gradeCode,requestedLocale]
      );
      const contentLocale=formulas.rows.every((formula)=>formula.content_locale===requestedLocale)?requestedLocale:'ko';
      const publicFormulas=formulas.rows.map(({content_locale,...formula})=>formula);
      return {
        grade:grade.rows[0],formulas:publicFormulas,requested_locale:requestedLocale,
        content_locale:contentLocale,translation_status:contentLocale===requestedLocale?(requestedLocale==='ko'?'SOURCE_ALIGNED':'TRANSLATION_REVIEW_REQUIRED'):'CANONICAL_KO_FALLBACK'
      };
    } finally { client.release(); }
  }

  async collaborationPlanResult(client,{actor,sessionId}) {
    const result=await client.query(
      `SELECT fcs.*,gfc.grade_code,gfc.knowledge_type,
              coalesce(requested.display_notation,korean.display_notation,gfc.notation) AS notation,
              coalesce(requested.title,korean.title,gfc.title_ko) AS title,
              CASE WHEN requested.formula_catalog_id IS NOT NULL THEN fcs.content_locale ELSE 'ko' END AS resolved_content_locale,
              CASE WHEN requested.formula_catalog_id IS NOT NULL
                   THEN requested.verification_status
                   WHEN fcs.content_locale='ko' THEN coalesce(korean.verification_status,'SOURCE_ALIGNED')
                   ELSE 'CANONICAL_KO_FALLBACK' END AS translation_status
         FROM mathchakchak.formula_collaboration_session fcs
         JOIN mathchakchak.grade_formula_catalog gfc ON gfc.id=fcs.formula_catalog_id
         LEFT JOIN LATERAL (
           SELECT formula_catalog_id,title,display_notation,verification_status FROM mathchakchak.formula_explanation_revision
            WHERE formula_catalog_id=gfc.id AND locale=fcs.content_locale ORDER BY revision_no DESC LIMIT 1
         ) requested ON true
         LEFT JOIN LATERAL (
           SELECT formula_catalog_id,title,display_notation,verification_status FROM mathchakchak.formula_explanation_revision
            WHERE formula_catalog_id=gfc.id AND locale='ko' ORDER BY revision_no DESC LIMIT 1
         ) korean ON true
        WHERE fcs.id=$1 AND fcs.student_profile_id=$2`,
      [sessionId,actor.studentId]
    );
    if(!result.rowCount) throw notFound();
    const row=result.rows[0];
    const evidence=await client.query(
      `SELECT id,phase_no,signal,outcome,hint_level,duration_ms,lead_character,recorded_at
         FROM mathchakchak.collaboration_phase_evidence
        WHERE collaboration_session_id=$1 ORDER BY phase_no`,
      [sessionId]
    );
    const roles=await client.query(
      `SELECT coalesce(requested.chakchaki_role,korean.chakchaki_role) AS chakchaki,
              coalesce(requested.gongsickyi_role,korean.gongsickyi_role) AS gongsickyi,
              CASE WHEN requested.policy_version IS NOT NULL THEN $2 ELSE 'ko' END AS content_locale
         FROM mathchakchak.character_collaboration_policy_definition definition
         LEFT JOIN mathchakchak.character_collaboration_role_translation requested
           ON requested.policy_version=definition.policy_version AND requested.locale=$2
         LEFT JOIN mathchakchak.character_collaboration_role_translation korean
           ON korean.policy_version=definition.policy_version AND korean.locale='ko'
        WHERE definition.policy_version=$1`,
      [row.policy_version,row.content_locale]
    );
    const localizedPhases=await client.query(
      `SELECT policy.phase_no,
              coalesce(requested.phase_title,korean.phase_title,policy.phase_code) AS phase_title,
              coalesce(requested.objective,korean.objective,policy.objective_ko) AS objective,
              CASE WHEN requested.policy_version IS NOT NULL THEN $2 ELSE 'ko' END AS content_locale
         FROM mathchakchak.character_collaboration_policy policy
         LEFT JOIN mathchakchak.character_collaboration_phase_translation requested
           ON requested.policy_version=policy.policy_version AND requested.phase_no=policy.phase_no AND requested.locale=$2
         LEFT JOIN mathchakchak.character_collaboration_phase_translation korean
           ON korean.policy_version=policy.policy_version AND korean.phase_no=policy.phase_no AND korean.locale='ko'
        WHERE policy.policy_version=$1 ORDER BY policy.phase_no`,
      [row.policy_version,row.content_locale]
    );
    const basePlan=buildCurriculumCollaborationPlan({id:row.formula_catalog_id,grade_code:row.grade_code,knowledge_type:row.knowledge_type,notation:row.notation},{route:row.adaptive_route,policyVersion:row.policy_version});
    const phaseByNumber=new Map(localizedPhases.rows.map((phase)=>[phase.phase_no,phase]));
    const roleDescriptions=roles.rows[0]??{chakchaki:'',gongsickyi:'',content_locale:'ko'};
    const plan={...basePlan,content_locale:roleDescriptions.content_locale,role_descriptions:{CHAKCHAKI:roleDescriptions.chakchaki,GONGSICKYI:roleDescriptions.gongsickyi},phases:basePlan.phases.map((phase)=>{const localized=phaseByNumber.get(phase.phase_no);return {...phase,title:localized?.phase_title??phase.phase_code,objective:localized?.objective??phase.objective};})};
    return {
      session:{
        id:row.id,status:row.status,current_phase_no:row.current_phase_no,evidence_score:row.evidence_score,
        created_at:row.created_at,started_at:row.started_at,completed_at:row.completed_at
      },
      formula:{id:row.formula_catalog_id,grade_code:row.grade_code,knowledge_type:row.knowledge_type,notation:row.notation,title:row.title,content_locale:row.resolved_content_locale,translation_status:row.translation_status},
      plan,
      evidence:evidence.rows
    };
  }

  async getCurriculumCollaborationPlan({actor,sessionId}) {
    const client=await this.pool.connect();
    try{
      await this.assertStudentOwner(client,actor);
      return await this.collaborationPlanResult(client,{actor,sessionId});
    } finally { client.release(); }
  }

  async createCurriculumCollaborationPlan({actor,formulaCatalogId,route,requestedLocale,key,hash}) {
    return this.withTransaction(async(client)=>{
      await this.assertStudentOwner(client,actor);
      const scope='curriculum.collaboration-plans.create';
      const replayReference=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replayReference) return {...await this.collaborationPlanResult(client,{actor,sessionId:replayReference}),replayed:true};
      const formula=await client.query('SELECT id FROM mathchakchak.grade_formula_catalog WHERE id=$1 AND active=true',[formulaCatalogId]);
      if(!formula.rowCount) throw notFound();
      const id=crypto.randomUUID();
      await client.query(
        `INSERT INTO mathchakchak.formula_collaboration_session
          (id,student_profile_id,formula_catalog_id,adaptive_route,policy_version,status,content_locale)
         VALUES ($1,$2,$3,$4,'pet-collab-v1','PLANNED',$5)`,
        [id,actor.studentId,formulaCatalogId,route,requestedLocale]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:id,status:201});
      return {...await this.collaborationPlanResult(client,{actor,sessionId:id}),replayed:false};
    });
  }

  async addCurriculumCollaborationEvidence({actor,sessionId,phaseNo,signal,hintLevel,durationMs,key,hash}) {
    return this.withTransaction(async(client)=>{
      await this.assertStudentOwner(client,actor);
      const session=await client.query(
        `SELECT id,status,current_phase_no FROM mathchakchak.formula_collaboration_session
          WHERE id=$1 AND student_profile_id=$2 FOR UPDATE`,
        [sessionId,actor.studentId]
      );
      if(!session.rowCount) throw notFound();
      const row=session.rows[0];
      const scope=`collab.evidence.${sessionId}.${phaseNo}`;
      const replayReference=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replayReference) return {...await this.collaborationPlanResult(client,{actor,sessionId}),replayed:true};
      if(!['PLANNED','IN_PROGRESS'].includes(row.status)) throw conflict('COLLABORATION_SESSION_NOT_ACTIVE');
      if(row.current_phase_no!==phaseNo) throw conflict('COLLABORATION_PHASE_OUT_OF_ORDER');
      const evaluated=evaluateCollaborationEvidence({phaseNo,signal,hintLevel,durationMs});
      const evidenceId=crypto.randomUUID();
      await client.query(
        `INSERT INTO mathchakchak.collaboration_phase_evidence
          (id,collaboration_session_id,phase_no,signal,outcome,hint_level,duration_ms,lead_character)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [evidenceId,sessionId,evaluated.phase_no,evaluated.signal,evaluated.outcome,evaluated.hint_level,evaluated.duration_ms,evaluated.lead_character]
      );
      await client.query(
        `UPDATE mathchakchak.formula_collaboration_session
            SET status='IN_PROGRESS',started_at=COALESCE(started_at,now()),current_phase_no=$2,updated_at=now()
          WHERE id=$1`,
        [sessionId,nextCollaborationPhase(phaseNo)]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:sessionId,status:201});
      return {...await this.collaborationPlanResult(client,{actor,sessionId}),replayed:false};
    });
  }

  async completeCurriculumCollaborationPlan({actor,sessionId,key,hash}) {
    return this.withTransaction(async(client)=>{
      await this.assertStudentOwner(client,actor);
      const session=await client.query(
        `SELECT * FROM mathchakchak.formula_collaboration_session
          WHERE id=$1 AND student_profile_id=$2 FOR UPDATE`,
        [sessionId,actor.studentId]
      );
      if(!session.rowCount) throw notFound();
      const scope=`collab.complete.${sessionId}`;
      const replayReference=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replayReference) return {...await this.collaborationPlanResult(client,{actor,sessionId}),replayed:true};
      if(session.rows[0].status!=='IN_PROGRESS') throw conflict('COLLABORATION_SESSION_NOT_COMPLETABLE');
      const evidence=await client.query(
        `SELECT phase_no,outcome,hint_level FROM mathchakchak.collaboration_phase_evidence
          WHERE collaboration_session_id=$1 ORDER BY phase_no`,
        [sessionId]
      );
      let summary;
      try{summary=summarizeCollaborationEvidence(evidence.rows);}catch{throw conflict('FIVE_PHASE_EVIDENCE_REQUIRED');}
      await client.query(
        `UPDATE mathchakchak.formula_collaboration_session
            SET status='COMPLETED',evidence_score=$2,completed_at=now(),updated_at=now()
          WHERE id=$1`,
        [sessionId,summary.evidence_score]
      );
      await client.query(
        `INSERT INTO mathchakchak.student_formula_collaboration_progress
          (student_profile_id,formula_catalog_id,completed_sessions,latest_evidence_score,next_review_at,last_collaboration_session_id)
         VALUES ($1,$2,1,$3,now()+make_interval(days=>$4),$5)
         ON CONFLICT (student_profile_id,formula_catalog_id) DO UPDATE
           SET completed_sessions=mathchakchak.student_formula_collaboration_progress.completed_sessions+1,
               latest_evidence_score=EXCLUDED.latest_evidence_score,next_review_at=EXCLUDED.next_review_at,
               last_collaboration_session_id=EXCLUDED.last_collaboration_session_id,updated_at=now()`,
        [actor.studentId,session.rows[0].formula_catalog_id,summary.evidence_score,summary.next_review_days,sessionId]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:sessionId,status:200});
      return {...await this.collaborationPlanResult(client,{actor,sessionId}),next_review_days:summary.next_review_days,replayed:false};
    });
  }

  async getFormulaRecallCheck({actor,formulaCatalogId,requestedLocale}) {
    const client=await this.pool.connect();
    try{
      await this.assertStudentOwner(client,actor);
      const result=await client.query(
        `SELECT fri.id,fri.formula_catalog_id,coalesce(requested.recall_prompt,korean.recall_prompt,fri.prompt_ko) AS prompt,
                fri.choices,fri.assessment_kind,gfc.grade_code,
                coalesce(requested.title,korean.title,gfc.title_ko) AS formula_title,
                CASE WHEN requested.formula_catalog_id IS NOT NULL THEN $2 ELSE 'ko' END AS content_locale,
                coalesce(requested.verification_status,korean.verification_status,'SOURCE_ALIGNED') AS verification_status,
                EXISTS (SELECT 1 FROM mathchakchak.formula_application_item fai WHERE fai.formula_catalog_id=fri.formula_catalog_id AND fai.active=true) AS application_available
           FROM mathchakchak.formula_recall_item fri
           JOIN mathchakchak.grade_formula_catalog gfc ON gfc.id=fri.formula_catalog_id
           LEFT JOIN LATERAL (
             SELECT formula_catalog_id,title,display_notation,recall_prompt,verification_status
               FROM mathchakchak.formula_explanation_revision
              WHERE formula_catalog_id=gfc.id AND locale=$2 ORDER BY revision_no DESC LIMIT 1
           ) requested ON true
           LEFT JOIN LATERAL (
             SELECT formula_catalog_id,title,display_notation,recall_prompt,verification_status
               FROM mathchakchak.formula_explanation_revision
              WHERE formula_catalog_id=gfc.id AND locale='ko' ORDER BY revision_no DESC LIMIT 1
           ) korean ON true
          WHERE fri.formula_catalog_id=$1 AND fri.active=true
          ORDER BY fri.content_version DESC LIMIT 1`,
        [formulaCatalogId,requestedLocale]
      );
      if(!result.rowCount) throw notFound();
      const row=result.rows[0];
      const choiceKeys=row.choices.map((choice)=>choice.value);
      const localizedChoices=await client.query(
        `SELECT gfc.semantic_key,
                coalesce(requested.display_notation,korean.display_notation,gfc.notation) AS label
           FROM mathchakchak.grade_formula_catalog gfc
           LEFT JOIN LATERAL (
             SELECT display_notation FROM mathchakchak.formula_explanation_revision
              WHERE formula_catalog_id=gfc.id AND locale=$2 ORDER BY revision_no DESC LIMIT 1
           ) requested ON true
           LEFT JOIN LATERAL (
             SELECT display_notation FROM mathchakchak.formula_explanation_revision
              WHERE formula_catalog_id=gfc.id AND locale='ko' ORDER BY revision_no DESC LIMIT 1
           ) korean ON true
          WHERE gfc.semantic_key=ANY($1::text[])`,
        [choiceKeys,requestedLocale]
      );
      const labelByKey=new Map(localizedChoices.rows.map((choice)=>[choice.semantic_key,choice.label]));
      const choices=row.choices.map((choice)=>({...choice,label:labelByKey.get(choice.value)??choice.label}));
      const {verification_status,...publicRow}=row;
      return {
        ...publicRow,choices,requested_locale:requestedLocale,
        translation_status:row.content_locale===requestedLocale?verification_status:'CANONICAL_KO_FALLBACK'
      };
    } finally { client.release(); }
  }

  async addFormulaRecallAttempt({actor,recallItemId,collaborationSessionId,selectedValue,durationMs,key,hash}) {
    return this.withTransaction(async(client)=>{
      await this.assertStudentOwner(client,actor);
      const scope=`recall.attempt.${recallItemId}`;
      const replayReference=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replayReference){
        const replay=await client.query(
          `SELECT fra.id,fra.outcome,fra.duration_ms,fra.attempted_at,fri.formula_catalog_id
             FROM mathchakchak.formula_recall_attempt fra
             JOIN mathchakchak.formula_recall_item fri ON fri.id=fra.recall_item_id
            WHERE fra.id=$1 AND fra.student_profile_id=$2`,
          [replayReference,actor.studentId]
        );
        if(!replay.rowCount) throw notFound();
        const progress=await client.query(
          `SELECT total_attempts,correct_attempts,recall_score,next_review_at
             FROM mathchakchak.student_formula_recall_progress
            WHERE student_profile_id=$1 AND formula_catalog_id=$2`,
          [actor.studentId,replay.rows[0].formula_catalog_id]
        );
        const {formula_catalog_id,...attempt}=replay.rows[0];
        return {...attempt,progress:progress.rows[0],next_review_days:attempt.outcome==='CORRECT'?7:1,replayed:true};
      }
      const item=await client.query(
        `SELECT fri.id,fri.formula_catalog_id,fri.answer_schema
           FROM mathchakchak.formula_recall_item fri
          WHERE fri.id=$1 AND fri.active=true`,
        [recallItemId]
      );
      if(!item.rowCount) throw notFound();
      const session=await client.query(
        `SELECT id FROM mathchakchak.formula_collaboration_session
          WHERE id=$1 AND student_profile_id=$2 AND formula_catalog_id=$3 AND status='COMPLETED'`,
        [collaborationSessionId,actor.studentId,item.rows[0].formula_catalog_id]
      );
      if(!session.rowCount) throw conflict('COMPLETED_MATCHING_COLLABORATION_REQUIRED');
      const responseValue={value:selectedValue};
      const outcome=scoreResponse(item.rows[0].answer_schema,responseValue);
      const attemptId=crypto.randomUUID();
      const inserted=await client.query(
        `INSERT INTO mathchakchak.formula_recall_attempt
          (id,student_profile_id,recall_item_id,collaboration_session_id,response_value,outcome,duration_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id,outcome,duration_ms,attempted_at`,
        [attemptId,actor.studentId,recallItemId,collaborationSessionId,responseValue,outcome,durationMs]
      );
      const correctDelta=outcome==='CORRECT'?1:0;
      const nextReviewDays=outcome==='CORRECT'?7:1;
      const progress=await client.query(
        `INSERT INTO mathchakchak.student_formula_recall_progress
         (student_profile_id,formula_catalog_id,total_attempts,correct_attempts,recall_score,latest_outcome,next_review_at)
         VALUES ($1,$2,1,$3,$4,$5,now()+make_interval(days=>$6))
         ON CONFLICT (student_profile_id,formula_catalog_id) DO UPDATE
           SET total_attempts=mathchakchak.student_formula_recall_progress.total_attempts+1,
               correct_attempts=mathchakchak.student_formula_recall_progress.correct_attempts+$3,
               recall_score=(mathchakchak.student_formula_recall_progress.correct_attempts+$3)::numeric/(mathchakchak.student_formula_recall_progress.total_attempts+1),
               latest_outcome=$5,next_review_at=now()+make_interval(days=>$6),updated_at=now()
         RETURNING total_attempts,correct_attempts,recall_score,next_review_at`,
        [actor.studentId,item.rows[0].formula_catalog_id,correctDelta,correctDelta,outcome,nextReviewDays]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:attemptId,status:201});
      return {...inserted.rows[0],progress:progress.rows[0],next_review_days:nextReviewDays,replayed:false};
    });
  }

  async getFormulaApplicationChecks({actor,formulaCatalogId,collaborationSessionId,requestedLocale}) {
    const client=await this.pool.connect();
    try{
      await this.assertStudentOwner(client,actor);
      const gate=await client.query(
        `SELECT 1
           FROM mathchakchak.formula_collaboration_session fcs
          WHERE fcs.id=$1 AND fcs.student_profile_id=$2 AND fcs.formula_catalog_id=$3 AND fcs.status='COMPLETED'
            AND EXISTS (
              SELECT 1 FROM mathchakchak.formula_recall_attempt fra
              JOIN mathchakchak.formula_recall_item fri ON fri.id=fra.recall_item_id
              WHERE fra.collaboration_session_id=fcs.id AND fra.student_profile_id=$2 AND fri.formula_catalog_id=$3
            )`,
        [collaborationSessionId,actor.studentId,formulaCatalogId]
      );
      if(!gate.rowCount) throw conflict('COMPLETED_RECALL_REQUIRED');
      const items=await client.query(
        `SELECT fai.id,fai.formula_catalog_id,fai.sequence_no,fai.assessment_kind,
                coalesce(requested.prompt,korean.prompt,fai.prompt_ko) AS prompt,
                coalesce(requested.value_label,korean.value_label,'Answer') AS value_label,
                coalesce(requested.unit_label,korean.unit_label,'Unit') AS unit_label,
                fai.response_type,fai.difficulty,fai.unit_required,
                CASE WHEN requested.application_item_id IS NOT NULL THEN $2 ELSE 'ko' END AS content_locale
           FROM mathchakchak.formula_application_item fai
           LEFT JOIN mathchakchak.formula_application_item_translation requested
             ON requested.application_item_id=fai.id AND requested.locale=$2
           LEFT JOIN mathchakchak.formula_application_item_translation korean
             ON korean.application_item_id=fai.id AND korean.locale='ko'
          WHERE fai.formula_catalog_id=$1 AND fai.active=true
          ORDER BY fai.sequence_no`,
        [formulaCatalogId,requestedLocale]
      );
      if(!items.rowCount) throw notFound();
      const progress=await client.query(
        `SELECT attempted_items,correct_items,application_mastery_score,mastered,next_review_at
           FROM mathchakchak.student_formula_application_progress
          WHERE student_profile_id=$1 AND formula_catalog_id=$2`,
        [actor.studentId,formulaCatalogId]
      );
      const contentLocale=items.rows.every((item)=>item.content_locale===requestedLocale)?requestedLocale:'ko';
      const publicItems=items.rows.map(({content_locale,...item})=>item);
      return {formula_catalog_id:formulaCatalogId,items:publicItems,progress:progress.rows[0]??null,requested_locale:requestedLocale,content_locale:contentLocale,translation_status:contentLocale===requestedLocale?'SOURCE_ALIGNED':'CANONICAL_KO_FALLBACK'};
    } finally { client.release(); }
  }

  async addFormulaApplicationAttempt({actor,applicationItemId,collaborationSessionId,responseValue,durationMs,key,hash}) {
    return this.withTransaction(async(client)=>{
      await this.assertStudentOwner(client,actor);
      const scope=`application.attempt.${applicationItemId}`;
      const replayReference=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replayReference){
        const replay=await client.query(
          `SELECT faa.id,faa.outcome,faa.misconception_code,faa.duration_ms,faa.attempted_at,fai.formula_catalog_id
             FROM mathchakchak.formula_application_attempt faa
             JOIN mathchakchak.formula_application_item fai ON fai.id=faa.application_item_id
            WHERE faa.id=$1 AND faa.student_profile_id=$2`,
          [replayReference,actor.studentId]
        );
        if(!replay.rowCount)throw notFound();
        const progress=await client.query(
          `SELECT attempted_items,correct_items,application_mastery_score,mastered,next_review_at
             FROM mathchakchak.student_formula_application_progress
            WHERE student_profile_id=$1 AND formula_catalog_id=$2`,
          [actor.studentId,replay.rows[0].formula_catalog_id]
        );
        const p=progress.rows[0];
        const {formula_catalog_id,...attempt}=replay.rows[0];
        return {...attempt,progress:p,next_review_days:applicationReviewDays({attemptedItems:p.attempted_items,score:Number(p.application_mastery_score),mastered:p.mastered}),replayed:true};
      }
      const item=await client.query(
        `SELECT id,formula_catalog_id,answer_schema,misconception_rules,difficulty
           FROM mathchakchak.formula_application_item WHERE id=$1 AND active=true`,
        [applicationItemId]
      );
      if(!item.rowCount)throw notFound();
      const gate=await client.query(
        `SELECT 1 FROM mathchakchak.formula_collaboration_session fcs
          WHERE fcs.id=$1 AND fcs.student_profile_id=$2 AND fcs.formula_catalog_id=$3 AND fcs.status='COMPLETED'
            AND EXISTS (
              SELECT 1 FROM mathchakchak.formula_recall_attempt fra
              JOIN mathchakchak.formula_recall_item fri ON fri.id=fra.recall_item_id
              WHERE fra.collaboration_session_id=fcs.id AND fra.student_profile_id=$2 AND fri.formula_catalog_id=$3
            )`,
        [collaborationSessionId,actor.studentId,item.rows[0].formula_catalog_id]
      );
      if(!gate.rowCount)throw conflict('COMPLETED_RECALL_REQUIRED');
      const evaluation=evaluateFormulaApplication({answerSchema:item.rows[0].answer_schema,misconceptionRules:item.rows[0].misconception_rules},responseValue);
      const attemptId=crypto.randomUUID();
      const inserted=await client.query(
        `INSERT INTO mathchakchak.formula_application_attempt
          (id,student_profile_id,application_item_id,collaboration_session_id,response_value,outcome,misconception_code,duration_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id,outcome,misconception_code,duration_ms,attempted_at`,
        [attemptId,actor.studentId,applicationItemId,collaborationSessionId,responseValue,evaluation.outcome,evaluation.misconception_code,durationMs]
      );
      const aggregate=await client.query(
        `WITH latest AS (
           SELECT DISTINCT ON (faa.application_item_id) faa.application_item_id,faa.outcome,fai.difficulty
             FROM mathchakchak.formula_application_attempt faa
             JOIN mathchakchak.formula_application_item fai ON fai.id=faa.application_item_id
            WHERE faa.student_profile_id=$1 AND fai.formula_catalog_id=$2 AND fai.active=true
            ORDER BY faa.application_item_id,faa.attempted_at DESC,faa.id DESC
         )
         SELECT count(*)::int AS attempted_items,
                count(*) FILTER (WHERE outcome='CORRECT')::int AS correct_items,
                coalesce(sum(difficulty) FILTER (WHERE outcome='CORRECT'),0)::numeric/nullif(sum(difficulty),0) AS score
           FROM latest`,
        [actor.studentId,item.rows[0].formula_catalog_id]
      );
      const summary=aggregate.rows[0];
      const score=Number(summary.score??0);
      const mastered=summary.attempted_items===3&&score>=0.8;
      const nextReviewDays=applicationReviewDays({attemptedItems:summary.attempted_items,score,mastered});
      const progress=await client.query(
        `INSERT INTO mathchakchak.student_formula_application_progress
          (student_profile_id,formula_catalog_id,attempted_items,correct_items,application_mastery_score,mastered,next_review_at)
         VALUES ($1,$2,$3,$4,$5,$6,now()+make_interval(days=>$7))
         ON CONFLICT (student_profile_id,formula_catalog_id) DO UPDATE
           SET attempted_items=EXCLUDED.attempted_items,correct_items=EXCLUDED.correct_items,
               application_mastery_score=EXCLUDED.application_mastery_score,mastered=EXCLUDED.mastered,
               next_review_at=EXCLUDED.next_review_at,updated_at=now()
         RETURNING attempted_items,correct_items,application_mastery_score,mastered,next_review_at`,
        [actor.studentId,item.rows[0].formula_catalog_id,summary.attempted_items,summary.correct_items,score,mastered,nextReviewDays]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:attemptId,status:201});
      return {...inserted.rows[0],progress:progress.rows[0],next_review_days:nextReviewDays,replayed:false};
    });
  }

  async createLocalDemoHandoff({actor, pathItemId, codeHash, key, hash}) {
    return this.withTransaction(async (client) => {
      await this.assertStudentOwner(client, actor);
      const scope = 'local-demo.handoffs.create';
      const replayReference = await this.findIdempotency(client, {actor, scope, key, hash});
      if (replayReference) {
        const replay = await client.query(
          'SELECT id, expires_at FROM mathchakchak.local_demo_learning_handoff WHERE id = $1',
          [replayReference]
        );
        if (!replay.rowCount) throw notFound();
        return {...replay.rows[0],replayed:true};
      }
      const path = await client.query(
        `SELECT lpi.id
           FROM mathchakchak.learning_path_item lpi
           JOIN mathchakchak.learning_path lp ON lp.id = lpi.learning_path_id
          WHERE lpi.id = $1 AND lp.student_profile_id = $2 AND lpi.status = 'READY'`,
        [pathItemId,actor.studentId]
      );
      if (!path.rowCount) throw notFound();
      const id = crypto.randomUUID();
      const result = await client.query(
        `INSERT INTO mathchakchak.local_demo_learning_handoff
          (id, code_hash, student_profile_id, learning_path_item_id, expires_at)
         VALUES ($1,$2,$3,$4,now() + interval '180 seconds')
         RETURNING id, expires_at`,
        [id,codeHash,actor.studentId,pathItemId]
      );
      await this.saveIdempotency(client, {actor,scope,key,hash,reference:id,status:201});
      return {...result.rows[0],replayed:false};
    });
  }

  async consumeLocalDemoHandoff({codeHash}) {
    return this.withTransaction(async (client) => {
      const result = await client.query(
        `SELECT h.id, h.learning_path_item_id, h.student_profile_id,
                u.id AS user_id, c.id AS concept_id, lpi.adaptive_route
           FROM mathchakchak.local_demo_learning_handoff h
           JOIN mathchakchak.student_profile sp ON sp.id = h.student_profile_id
           JOIN mathchakchak.app_user u ON u.id = sp.user_id
           JOIN mathchakchak.learning_path_item lpi ON lpi.id = h.learning_path_item_id
           JOIN mathchakchak.math_concept c ON c.topic_id = lpi.topic_id AND c.active = true
          WHERE h.code_hash = $1 AND h.consumed_at IS NULL AND h.expires_at > now()
            AND u.auth_subject = 'staging-student-001' AND u.status = 'ACTIVE'
          ORDER BY c.content_version DESC LIMIT 1
          FOR UPDATE OF h`,
        [codeHash]
      );
      if (!result.rowCount) throw notFound();
      await client.query('UPDATE mathchakchak.local_demo_learning_handoff SET consumed_at = now() WHERE id = $1', [result.rows[0].id]);
      const row = result.rows[0];
      return {
        userId:row.user_id,studentId:row.student_profile_id,conceptId:row.concept_id,
        learningPathItemId:row.learning_path_item_id,adaptiveRoute:row.adaptive_route
      };
    });
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

  async assertPrivacyOperator(client,actor){
    if(actor.role!=='ADMIN')throw forbidden();
    const result=await client.query(
      `SELECT 1 FROM mathchakchak.app_user
        WHERE id=$1 AND role='ADMIN' AND status='ACTIVE'`,
      [actor.userId]
    );
    if(result.rowCount!==1)throw forbidden();
  }

  async assertPrivacyOperationRole(client,actor,allowedRoles){
    await this.assertPrivacyOperator(client,actor);
    const result=await client.query(
      `SELECT operation_role FROM mathchakchak.privacy_operator_authorization
        WHERE user_id=$1 AND active=true AND operation_role=ANY($2::varchar[])`,
      [actor.userId,allowedRoles]
    );
    if(result.rowCount!==1)throw forbidden();
    return result.rows[0].operation_role;
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
      const recommendation = selectAdaptiveRoute({
        answered: summary.rows[0].answered,
        correct: summary.rows[0].correct
      });
      await client.query("UPDATE mathchakchak.diagnostic_session SET status = 'COMPLETED', completed_at = now() WHERE id = $1", [diagnosticId]);
      const pathId = crypto.randomUUID();
      const pathItemId = crypto.randomUUID();
      await client.query(
        `INSERT INTO mathchakchak.learning_path
          (id, student_profile_id, source_diagnostic_id, status, algorithm_version)
         VALUES ($1, $2, $3, 'ACTIVE', 'adaptive-v1')`,
        [pathId, actor.studentId, diagnosticId]
      );
      await client.query(
        `INSERT INTO mathchakchak.learning_path_item
          (id, learning_path_id, topic_id, sequence_no, status, adaptive_route,
           starting_hint_level, target_difficulty, review_after_days)
         VALUES ($1, $2, $3, 1, 'READY', $4, $5, $6, $7)`,
        [pathItemId,pathId,summary.rows[0].topic_id,recommendation.route,
         recommendation.starting_hint_level,recommendation.target_difficulty,
         recommendation.review_after_days]
      );
      await client.query(
        `INSERT INTO mathchakchak.adaptive_learning_decision
          (id, diagnostic_session_id, student_profile_id, topic_id, learning_path_item_id,
           route, accuracy, confidence, starting_hint_level, target_difficulty,
           review_after_days, rationale_code, algorithm_version, evidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'adaptive-v1',$13)`,
        [crypto.randomUUID(),diagnosticId,actor.studentId,summary.rows[0].topic_id,pathItemId,
         recommendation.route,recommendation.accuracy,recommendation.confidence,
         recommendation.starting_hint_level,recommendation.target_difficulty,
         recommendation.review_after_days,recommendation.rationale_code,
         {answered:summary.rows[0].answered,correct:summary.rows[0].correct}]
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
    const decision = await client.query(
      `SELECT route, accuracy, confidence, starting_hint_level, target_difficulty,
              review_after_days, rationale_code, algorithm_version
         FROM mathchakchak.adaptive_learning_decision
        WHERE diagnostic_session_id = $1 AND learning_path_item_id = $2`,
      [diagnosticId, pathItemId]
    );
    return {
      diagnostic_id: diagnosticId,
      status: 'COMPLETED',
      answered,
      correct,
      accuracy: answered ? correct / answered : null,
      learning_path_item_id: pathItemId,
      recommendation: decision.rowCount ? {
        ...decision.rows[0],
        accuracy:Number(decision.rows[0].accuracy),
        confidence:Number(decision.rows[0].confidence)
      } : null
    };
  }

  async getAdaptiveRecommendation({actor, studentId}) {
    const client = await this.pool.connect();
    try {
      await this.assertStudentOwner(client, actor);
      if (actor.studentId !== studentId) throw forbidden();
      const result = await client.query(
        `SELECT ald.diagnostic_session_id, ald.learning_path_item_id, ald.topic_id,
                ald.route, ald.accuracy, ald.confidence, ald.starting_hint_level,
                ald.target_difficulty, ald.review_after_days, ald.rationale_code,
                ald.algorithm_version, ald.created_at,
                stm.mastery_score, stm.evidence_count, stm.updated_at AS mastery_updated_at,
                ri.interval_days AS scheduled_review_days, ri.due_at AS scheduled_review_at
           FROM mathchakchak.adaptive_learning_decision ald
           LEFT JOIN mathchakchak.student_topic_mastery stm
             ON stm.student_profile_id = ald.student_profile_id AND stm.topic_id = ald.topic_id
           LEFT JOIN mathchakchak.review_item ri
             ON ri.student_profile_id = ald.student_profile_id AND ri.topic_id = ald.topic_id
            AND ri.status IN ('SCHEDULED','DUE')
          WHERE ald.student_profile_id = $1
          ORDER BY ald.created_at DESC LIMIT 1`,
        [studentId]
      );
      if (!result.rowCount) throw notFound();
      const row = result.rows[0];
      return {
        ...row,
        accuracy:Number(row.accuracy),
        confidence:Number(row.confidence),
        mastery_score:row.mastery_score === null ? null : Number(row.mastery_score)
      };
    } finally {
      client.release();
    }
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
        `SELECT ls.*, lpi.topic_id, lpi.adaptive_route, lpi.starting_hint_level,
                lpi.target_difficulty, lpi.review_after_days
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
          (id, learning_session_id, lesson_definition_id, student_profile_id, locale, status,
           adaptive_route, starting_hint_level, target_difficulty)
         VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', $6, $7, $8)`,
        [id,learningSessionId,definition.rows[0].id,actor.studentId,learning.rows[0].locale,
         learning.rows[0].adaptive_route,learning.rows[0].starting_hint_level,
         learning.rows[0].target_difficulty]
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
      const requestedHintLevel = hintLevel ?? 0;
      const effectiveHintLevel = Math.max(requestedHintLevel, session.rows[0].starting_hint_level ?? 0);
      const evaluation = evaluateFormulaResponse(step, responseValue, {hintLevel:effectiveHintLevel});
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
         evaluation.misconception_code,evaluation.outcome === 'INCORRECT' ? effectiveHintLevel : requestedHintLevel,durationMs ?? null]
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
      const hintIndex = Math.min(effectiveHintLevel, Math.max(0, step.hint_ladder.length - 1));
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
        `SELECT fls.*, ld.mastery_threshold, c.topic_id, lpi.review_after_days
           FROM mathchakchak.formula_learning_session fls
           JOIN mathchakchak.lesson_definition ld ON ld.id = fls.lesson_definition_id
           JOIN mathchakchak.math_concept c ON c.id = ld.concept_id
           JOIN mathchakchak.learning_session ls ON ls.id = fls.learning_session_id
           JOIN mathchakchak.learning_path_item lpi ON lpi.id = ls.learning_path_item_id
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
      await client.query(
        `INSERT INTO mathchakchak.student_topic_mastery
          (student_profile_id, topic_id, mastery_score, evidence_count, last_formula_session_id)
         VALUES ($1,$2,$3,1,$4)
         ON CONFLICT (student_profile_id, topic_id) DO UPDATE
           SET mastery_score = EXCLUDED.mastery_score,
               evidence_count = mathchakchak.student_topic_mastery.evidence_count + 1,
               last_formula_session_id = EXCLUDED.last_formula_session_id,
               updated_at = now()`,
        [actor.studentId,session.rows[0].topic_id,result.mastery,formulaSessionId]
      );
      await client.query(
        `INSERT INTO mathchakchak.review_item
          (id, student_profile_id, topic_id, due_at, interval_days, status)
         VALUES ($1,$2,$3,now() + make_interval(days => $4),$4,'SCHEDULED')
         ON CONFLICT (student_profile_id, topic_id, status) DO UPDATE
           SET due_at = EXCLUDED.due_at,
               interval_days = EXCLUDED.interval_days,
               updated_at = now()`,
        [crypto.randomUUID(),actor.studentId,session.rows[0].topic_id,session.rows[0].review_after_days]
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

  async getLearningQuality({actor, studentId}) {
    const client=await this.pool.connect();
    try{
      await this.assertStudentOwner(client,actor);
      if(studentId!==actor.studentId)throw forbidden();
      const result=await client.query(
        `SELECT
           (SELECT count(*)::integer FROM mathchakchak.formula_learning_session WHERE student_profile_id=$1) AS formula_sessions_started,
           (SELECT count(*)::integer FROM mathchakchak.formula_learning_session WHERE student_profile_id=$1 AND status='COMPLETED') AS formula_sessions_completed,
           (SELECT count(*)::integer FROM mathchakchak.student_formula_application_progress WHERE student_profile_id=$1 AND attempted_items>0) AS formulas_assessed,
           (SELECT count(*)::integer FROM mathchakchak.student_formula_application_progress WHERE student_profile_id=$1 AND mastered=true) AS formulas_mastered,
           (SELECT count(*)::integer FROM mathchakchak.formula_recall_attempt WHERE student_profile_id=$1) AS recall_attempts,
           (SELECT count(*)::integer FROM mathchakchak.formula_recall_attempt WHERE student_profile_id=$1 AND outcome='CORRECT') AS recall_correct,
           (SELECT count(*)::integer FROM mathchakchak.formula_learning_response flr JOIN mathchakchak.formula_learning_session fls ON fls.id=flr.formula_learning_session_id WHERE fls.student_profile_id=$1) AS formula_responses,
           (SELECT count(*)::integer FROM mathchakchak.formula_learning_response flr JOIN mathchakchak.formula_learning_session fls ON fls.id=flr.formula_learning_session_id WHERE fls.student_profile_id=$1 AND flr.hint_level>0) AS hinted_responses,
           (SELECT count(*)::integer FROM mathchakchak.collaboration_phase_evidence cpe JOIN mathchakchak.formula_collaboration_session fcs ON fcs.id=cpe.collaboration_session_id WHERE fcs.student_profile_id=$1) AS collaboration_phases,
           (SELECT count(*)::integer FROM mathchakchak.collaboration_phase_evidence cpe JOIN mathchakchak.formula_collaboration_session fcs ON fcs.id=cpe.collaboration_session_id WHERE fcs.student_profile_id=$1 AND cpe.outcome='PASS') AS collaboration_passes`,
        [studentId]
      );
      return buildLearningQualitySnapshot(result.rows[0]);
    }finally{client.release();}
  }

  async createPrivacyRequest({actor,requestType,locale,key,hash}) {
    return this.withTransaction(async(client)=>{
      await this.assertStudentOwner(client,actor);
      const scope='privacy-requests.create';
      const replayReference=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replayReference){
        const replay=await client.query(
          `SELECT * FROM mathchakchak.privacy_request
            WHERE id=$1 AND requester_user_id=$2 AND student_profile_id=$3`,
          [replayReference,actor.userId,actor.studentId]
        );
        if(!replay.rowCount)throw notFound();
        return {...mapPrivacyRequest(replay.rows[0]),boundary:privacyRequestBoundary(),replayed:true};
      }
      const id=crypto.randomUUID();
      const created=await client.query(
        `INSERT INTO mathchakchak.privacy_request
          (id,requester_user_id,subject_user_id,student_profile_id,request_type,status,locale,
           source_channel,identity_assurance,policy_version)
         VALUES ($1,$2,$2,$3,$4,'RECEIVED',$5,'STUDENT_SELF_SERVICE','SESSION_AUTHENTICATED','privacy-rights-v1')
         RETURNING *`,
        [id,actor.userId,actor.studentId,requestType,locale]
      );
      await client.query(
        `INSERT INTO mathchakchak.privacy_request_event
          (id,privacy_request_id,actor_user_id,event_type,from_status,to_status,reason_code)
         VALUES ($1,$2,$3,'RECEIVED',NULL,'RECEIVED','STUDENT_SELF_SERVICE')`,
        [crypto.randomUUID(),id,actor.userId]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:id,status:201});
      return {...mapPrivacyRequest(created.rows[0]),boundary:privacyRequestBoundary(),replayed:false};
    });
  }

  async listPrivacyRequests({actor}) {
    const client=await this.pool.connect();
    try{
      await this.assertStudentOwner(client,actor);
      const result=await client.query(
        `SELECT * FROM mathchakchak.privacy_request
          WHERE requester_user_id=$1 AND student_profile_id=$2
          ORDER BY submitted_at DESC,id DESC LIMIT 50`,
        [actor.userId,actor.studentId]
      );
      return {requests:result.rows.map(mapPrivacyRequest),boundary:privacyRequestBoundary()};
    }finally{client.release();}
  }

  async getPrivacyRequest({actor,requestId}) {
    const client=await this.pool.connect();
    try{
      await this.assertStudentOwner(client,actor);
      const result=await client.query(
        `SELECT * FROM mathchakchak.privacy_request
          WHERE id=$1 AND requester_user_id=$2 AND student_profile_id=$3`,
        [requestId,actor.userId,actor.studentId]
      );
      if(!result.rowCount)throw notFound();
      const events=await client.query(
        `SELECT event_type,from_status,to_status,reason_code,occurred_at
           FROM mathchakchak.privacy_request_event
          WHERE privacy_request_id=$1 ORDER BY occurred_at,id`,
        [requestId]
      );
      return {...mapPrivacyRequest(result.rows[0]),events:events.rows,boundary:privacyRequestBoundary()};
    }finally{client.release();}
  }

  async cancelPrivacyRequest({actor,requestId,key,hash}) {
    return this.withTransaction(async(client)=>{
      await this.assertStudentOwner(client,actor);
      const scope=`privacy-requests.cancel.${requestId}`;
      const replayReference=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replayReference){
        const replay=await client.query(
          `SELECT * FROM mathchakchak.privacy_request
            WHERE id=$1 AND requester_user_id=$2 AND student_profile_id=$3`,
          [replayReference,actor.userId,actor.studentId]
        );
        if(!replay.rowCount)throw notFound();
        return {...mapPrivacyRequest(replay.rows[0]),boundary:privacyRequestBoundary(),replayed:true};
      }
      const current=await client.query(
        `SELECT * FROM mathchakchak.privacy_request
          WHERE id=$1 AND requester_user_id=$2 AND student_profile_id=$3 FOR UPDATE`,
        [requestId,actor.userId,actor.studentId]
      );
      if(!current.rowCount)throw notFound();
      if(!canRequesterCancel(current.rows[0].status))throw conflict('PRIVACY_REQUEST_NOT_CANCELLABLE');
      const updated=await client.query(
        `UPDATE mathchakchak.privacy_request
            SET status='CANCELLED',cancelled_at=now(),updated_at=now()
          WHERE id=$1 RETURNING *`,
        [requestId]
      );
      await client.query(
        `INSERT INTO mathchakchak.privacy_request_event
          (id,privacy_request_id,actor_user_id,event_type,from_status,to_status,reason_code)
         VALUES ($1,$2,$3,'REQUESTER_CANCELLED',$4,'CANCELLED','REQUESTER_CANCELLED')`,
        [crypto.randomUUID(),requestId,actor.userId,current.rows[0].status]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:requestId,status:200});
      return {...mapPrivacyRequest(updated.rows[0]),boundary:privacyRequestBoundary(),replayed:false};
    });
  }

  async listPrivacyOperationsQueue({actor}){
    const client=await this.pool.connect();
    try{
      await this.assertPrivacyOperator(client,actor);
      const result=await client.query(
        `SELECT pr.*,
                (a.operator_user_id=$1 AND a.status='ASSIGNED') AS assigned_to_current_operator
           FROM mathchakchak.privacy_request pr
           LEFT JOIN mathchakchak.privacy_request_assignment a ON a.privacy_request_id=pr.id
          WHERE pr.status IN ('RECEIVED','IDENTITY_VERIFIED','IN_REVIEW','APPROVED')
          ORDER BY pr.submitted_at,pr.id LIMIT 100`,
        [actor.userId]
      );
      return {requests:result.rows.map(mapPrivacyOperationsItem),boundary:privacyOperationsBoundary()};
    }finally{client.release();}
  }

  async transitionPrivacyOperation({actor,requestId,toStatus,reasonCode,evidenceReference,evidenceSha256,key,hash}){
    return this.withTransaction(async(client)=>{
      await this.assertPrivacyOperator(client,actor);
      const scope=`privacy.transition.${requestId}`;
      const replayReference=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replayReference){
        const replay=await client.query('SELECT *,true AS assigned_to_current_operator FROM mathchakchak.privacy_request WHERE id=$1',[replayReference]);
        if(!replay.rowCount)throw notFound();
        return {...mapPrivacyOperationsItem(replay.rows[0]),boundary:privacyOperationsBoundary(),replayed:true};
      }
      const current=await client.query('SELECT * FROM mathchakchak.privacy_request WHERE id=$1 FOR UPDATE',[requestId]);
      if(!current.rowCount)throw notFound();
      const check=validateOperatorTransition({
        fromStatus:current.rows[0].status,toStatus,reasonCode,evidenceReference,evidenceSha256
      });
      if(!check.allowed)throw conflict(check.reason);

      const assignment=await client.query(
        'SELECT operator_user_id,status FROM mathchakchak.privacy_request_assignment WHERE privacy_request_id=$1 FOR UPDATE',
        [requestId]
      );
      if(assignment.rowCount&&assignment.rows[0].status==='ASSIGNED'&&assignment.rows[0].operator_user_id!==actor.userId){
        throw conflict('PRIVACY_REQUEST_ASSIGNED_TO_ANOTHER_OPERATOR');
      }
      await client.query(
        `INSERT INTO mathchakchak.privacy_request_assignment
          (privacy_request_id,operator_user_id,status)
         VALUES ($1,$2,'ASSIGNED')
         ON CONFLICT (privacy_request_id) DO UPDATE
          SET operator_user_id=EXCLUDED.operator_user_id,status='ASSIGNED',released_at=NULL,updated_at=now()`,
        [requestId,actor.userId]
      );

      if(evidenceReference&&evidenceSha256){
        const evidenceType=toStatus==='IDENTITY_VERIFIED'?'IDENTITY_VERIFICATION':'DECISION_SUPPORT';
        await client.query(
          `INSERT INTO mathchakchak.privacy_request_evidence
            (id,privacy_request_id,operator_user_id,evidence_type,evidence_reference,evidence_sha256)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [crypto.randomUUID(),requestId,actor.userId,evidenceType,evidenceReference,evidenceSha256]
        );
      }
      if(['APPROVED','REJECTED'].includes(toStatus)){
        await client.query(
          `INSERT INTO mathchakchak.privacy_request_decision
            (privacy_request_id,operator_user_id,decision,reason_code)
           VALUES ($1,$2,$3,$4)`,
          [requestId,actor.userId,toStatus,reasonCode]
        );
      }
      const updated=await client.query(
        `UPDATE mathchakchak.privacy_request
            SET status=$2::varchar(24),decision_reason_code=CASE WHEN $2::varchar(24) IN ('APPROVED','REJECTED') THEN $3::varchar(64) ELSE decision_reason_code END,
                updated_at=now()
          WHERE id=$1 RETURNING *,true AS assigned_to_current_operator`,
        [requestId,toStatus,reasonCode]
      );
      await client.query(
        `INSERT INTO mathchakchak.privacy_request_event
          (id,privacy_request_id,actor_user_id,event_type,from_status,to_status,reason_code)
         VALUES ($1,$2,$3,'STATUS_CHANGED',$4,$5,$6)`,
        [crypto.randomUUID(),requestId,actor.userId,current.rows[0].status,toStatus,reasonCode]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:requestId,status:200});
      return {...mapPrivacyOperationsItem(updated.rows[0]),boundary:privacyOperationsBoundary(),replayed:false};
    });
  }

  async loadFulfilmentPlan(client,planId){
    const plan=await client.query(
      `SELECT p.*,a.profile_rows,a.diagnostic_sessions,a.learning_sessions,a.review_items,a.formula_sessions,
              a.preserved_privacy_records,a.active_legal_hold,a.assessment_sha256
         FROM mathchakchak.privacy_fulfilment_plan p
         LEFT JOIN mathchakchak.privacy_impact_assessment a ON a.fulfilment_plan_id=p.id
        WHERE p.id=$1`,[planId]
    );
    if(!plan.rowCount)throw notFound();
    const approvals=await client.query(
      `SELECT approval_role,decision,reason_code,decided_at
         FROM mathchakchak.privacy_fulfilment_approval WHERE fulfilment_plan_id=$1 ORDER BY approval_role`,[planId]
    );
    return mapFulfilmentPlan(plan.rows[0],{approvals:approvals.rows});
  }

  async getFulfilmentPlan({actor,planId}){
    const client=await this.pool.connect();
    try{
      await this.assertPrivacyOperationRole(client,actor,['OPERATOR','PRIVACY_APPROVER','SECURITY_APPROVER']);
      return {...await this.loadFulfilmentPlan(client,planId),boundary:fulfilmentControlBoundary()};
    }finally{client.release();}
  }

  async createFulfilmentPlan({actor,requestId,key,hash}){
    return this.withTransaction(async(client)=>{
      await this.assertPrivacyOperationRole(client,actor,['OPERATOR']);
      const scope=`privacy.plan.create.${requestId}`;
      const replay=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replay)return {...await this.loadFulfilmentPlan(client,replay),boundary:fulfilmentControlBoundary(),replayed:true};
      const request=await client.query(
        `SELECT pr.request_type,pra.operator_user_id,pra.status AS assignment_status
           FROM mathchakchak.privacy_request pr
           JOIN mathchakchak.privacy_request_assignment pra ON pra.privacy_request_id=pr.id
          WHERE pr.id=$1 AND pr.status='APPROVED' FOR UPDATE OF pr,pra`,[requestId]
      );
      if(!request.rowCount)throw conflict('PRIVACY_REQUEST_NOT_APPROVED');
      if(request.rows[0].operator_user_id!==actor.userId||request.rows[0].assignment_status!=='ASSIGNED')throw forbidden();
      const existingPlan=await client.query('SELECT 1 FROM mathchakchak.privacy_fulfilment_plan WHERE privacy_request_id=$1',[requestId]);
      if(existingPlan.rowCount)throw conflict('FULFILMENT_PLAN_ALREADY_EXISTS');
      const id=crypto.randomUUID();
      await client.query(
        `INSERT INTO mathchakchak.privacy_fulfilment_plan
          (id,privacy_request_id,created_by_user_id,request_type,status,execution_mode,policy_version)
         VALUES ($1,$2,$3,$4,'DRAFT','DRY_RUN_ONLY','fulfilment-controls-v1')`,
        [id,requestId,actor.userId,request.rows[0].request_type]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:id,status:201});
      return {...await this.loadFulfilmentPlan(client,id),boundary:fulfilmentControlBoundary(),replayed:false};
    });
  }

  async assessFulfilmentImpact({actor,planId,key,hash}){
    return this.withTransaction(async(client)=>{
      await this.assertPrivacyOperationRole(client,actor,['OPERATOR']);
      const scope=`privacy.plan.assess.${planId}`;
      const replay=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replay)return {...await this.loadFulfilmentPlan(client,replay),boundary:fulfilmentControlBoundary(),replayed:true};
      const plan=await client.query(
        `SELECT p.*,pr.student_profile_id FROM mathchakchak.privacy_fulfilment_plan p
         JOIN mathchakchak.privacy_request pr ON pr.id=p.privacy_request_id
         WHERE p.id=$1 FOR UPDATE OF p`,[planId]
      );
      if(!plan.rowCount)throw notFound();
      if(plan.rows[0].created_by_user_id!==actor.userId)throw forbidden();
      if(plan.rows[0].status!=='DRAFT')throw conflict('IMPACT_ASSESSMENT_ALREADY_RECORDED');
      const studentId=plan.rows[0].student_profile_id;
      const counts=await client.query(
        `SELECT
          (SELECT count(*)::integer FROM mathchakchak.student_profile WHERE id=$1) AS profile_rows,
          (SELECT count(*)::integer FROM mathchakchak.diagnostic_session WHERE student_profile_id=$1) AS diagnostic_sessions,
          (SELECT count(*)::integer FROM mathchakchak.learning_session WHERE student_profile_id=$1) AS learning_sessions,
          (SELECT count(*)::integer FROM mathchakchak.review_item WHERE student_profile_id=$1) AS review_items,
          (SELECT count(*)::integer FROM mathchakchak.formula_learning_session WHERE student_profile_id=$1) AS formula_sessions,
          (SELECT count(*)::integer FROM mathchakchak.privacy_request WHERE student_profile_id=$1) AS preserved_privacy_records,
          EXISTS(SELECT 1 FROM mathchakchak.privacy_legal_hold WHERE privacy_request_id=$2 AND status='ACTIVE') AS active_legal_hold`,
        [studentId,plan.rows[0].privacy_request_id]
      );
      const impact=counts.rows[0];
      const assessmentSha256=hashImpactSnapshot(impact);
      await client.query(
        `INSERT INTO mathchakchak.privacy_impact_assessment
          (fulfilment_plan_id,assessed_by_user_id,profile_rows,diagnostic_sessions,learning_sessions,review_items,
           formula_sessions,preserved_privacy_records,active_legal_hold,assessment_sha256)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [planId,actor.userId,impact.profile_rows,impact.diagnostic_sessions,impact.learning_sessions,impact.review_items,
         impact.formula_sessions,impact.preserved_privacy_records,impact.active_legal_hold,assessmentSha256]
      );
      await client.query("UPDATE mathchakchak.privacy_fulfilment_plan SET status='IMPACT_ASSESSED',updated_at=now() WHERE id=$1",[planId]);
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:planId,status:200});
      return {...await this.loadFulfilmentPlan(client,planId),boundary:fulfilmentControlBoundary(),replayed:false};
    });
  }

  async setPrivacyLegalHold({actor,requestId,reasonCode,key,hash}){
    return this.withTransaction(async(client)=>{
      await this.assertPrivacyOperationRole(client,actor,['PRIVACY_APPROVER']);
      const scope=`privacy.hold.set.${requestId}`;
      const replay=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replay)return {id:replay,status:'ACTIVE',boundary:fulfilmentControlBoundary(),replayed:true};
      const exists=await client.query("SELECT 1 FROM mathchakchak.privacy_request WHERE id=$1 AND status='APPROVED' FOR UPDATE",[requestId]);
      if(!exists.rowCount)throw conflict('PRIVACY_REQUEST_NOT_APPROVED');
      const active=await client.query("SELECT 1 FROM mathchakchak.privacy_legal_hold WHERE privacy_request_id=$1 AND status='ACTIVE'",[requestId]);
      if(active.rowCount)throw conflict('ACTIVE_LEGAL_HOLD_ALREADY_EXISTS');
      const id=crypto.randomUUID();
      await client.query(
        `INSERT INTO mathchakchak.privacy_legal_hold (id,privacy_request_id,reason_code,set_by_user_id)
         VALUES ($1,$2,$3,$4)`,[id,requestId,reasonCode,actor.userId]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:id,status:201});
      return {id,status:'ACTIVE',reason_code:reasonCode,boundary:fulfilmentControlBoundary(),replayed:false};
    });
  }

  async releasePrivacyLegalHold({actor,holdId,reasonCode,key,hash}){
    return this.withTransaction(async(client)=>{
      await this.assertPrivacyOperationRole(client,actor,['PRIVACY_APPROVER']);
      const scope=`privacy.hold.release.${holdId}`;
      const replay=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replay)return {id:replay,status:'RELEASED',boundary:fulfilmentControlBoundary(),replayed:true};
      const updated=await client.query(
        `UPDATE mathchakchak.privacy_legal_hold
            SET status='RELEASED',released_by_user_id=$2,release_reason_code=$3,released_at=now()
          WHERE id=$1 AND status='ACTIVE' RETURNING id`,[holdId,actor.userId,reasonCode]
      );
      if(!updated.rowCount)throw notFound();
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:holdId,status:200});
      return {id:holdId,status:'RELEASED',reason_code:reasonCode,boundary:fulfilmentControlBoundary(),replayed:false};
    });
  }

  async decideFulfilmentApproval({actor,planId,decision,reasonCode,key,hash}){
    return this.withTransaction(async(client)=>{
      const approvalRole=await this.assertPrivacyOperationRole(client,actor,['PRIVACY_APPROVER','SECURITY_APPROVER']);
      const scope=`privacy.plan.approve.${planId}`;
      const replay=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replay)return {...await this.loadFulfilmentPlan(client,replay),boundary:fulfilmentControlBoundary(),replayed:true};
      const plan=await client.query('SELECT * FROM mathchakchak.privacy_fulfilment_plan WHERE id=$1 FOR UPDATE',[planId]);
      if(!plan.rowCount)throw notFound();
      if(plan.rows[0].status!=='IMPACT_ASSESSED')throw conflict('PLAN_NOT_READY_FOR_APPROVAL');
      const hold=await client.query(
        `SELECT 1 FROM mathchakchak.privacy_legal_hold h
         JOIN mathchakchak.privacy_fulfilment_plan p ON p.privacy_request_id=h.privacy_request_id
         WHERE p.id=$1 AND h.status='ACTIVE'`,[planId]
      );
      if(hold.rowCount)throw conflict('ACTIVE_LEGAL_HOLD');
      const existingApproval=await client.query(
        `SELECT 1 FROM mathchakchak.privacy_fulfilment_approval
          WHERE fulfilment_plan_id=$1 AND (approval_role=$2 OR approver_user_id=$3)`,
        [planId,approvalRole,actor.userId]
      );
      if(existingApproval.rowCount)throw conflict('DUAL_APPROVAL_DISTINCT_APPROVER_REQUIRED');
      await client.query(
        `INSERT INTO mathchakchak.privacy_fulfilment_approval
          (id,fulfilment_plan_id,approver_user_id,approval_role,decision,reason_code)
         VALUES ($1,$2,$3,$4,$5,$6)`,[crypto.randomUUID(),planId,actor.userId,approvalRole,decision,reasonCode]
      );
      if(decision==='REJECT'){
        await client.query("UPDATE mathchakchak.privacy_fulfilment_plan SET status='INVALIDATED',updated_at=now() WHERE id=$1",[planId]);
      }else{
        const approved=await client.query(
          "SELECT count(*)::integer AS count FROM mathchakchak.privacy_fulfilment_approval WHERE fulfilment_plan_id=$1 AND decision='APPROVE'",[planId]
        );
        if(approved.rows[0].count===2)await client.query("UPDATE mathchakchak.privacy_fulfilment_plan SET status='DUAL_APPROVED',updated_at=now() WHERE id=$1",[planId]);
      }
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:planId,status:200});
      return {...await this.loadFulfilmentPlan(client,planId),boundary:fulfilmentControlBoundary(),replayed:false};
    });
  }

  async loadFulfilmentPackage(client,manifestId){
    const manifest=await client.query(
      `SELECT m.*,successor.id AS successor_manifest_id,
              EXISTS(SELECT 1 FROM mathchakchak.privacy_legal_hold h
                       WHERE h.privacy_request_id=m.privacy_request_id AND h.status='ACTIVE') AS active_legal_hold
         FROM mathchakchak.privacy_fulfilment_package_manifest m
         LEFT JOIN mathchakchak.privacy_fulfilment_package_manifest successor
           ON successor.predecessor_manifest_id=m.id
        WHERE m.id=$1`,[manifestId]
    );
    if(!manifest.rowCount)throw notFound();
    const checkpoint=await client.query(
      `SELECT id,recovery_mode,checkpoint_sha256,recorded_at
         FROM mathchakchak.privacy_fulfilment_recovery_checkpoint WHERE package_manifest_id=$1`,[manifestId]
    );
    return mapFulfilmentPackage(manifest.rows[0],{checkpoint:checkpoint.rows[0]??null});
  }

  async getFulfilmentPackage({actor,manifestId}){
    const client=await this.pool.connect();
    try{
      await this.assertPrivacyOperationRole(client,actor,['OPERATOR','PRIVACY_APPROVER','SECURITY_APPROVER']);
      return {...await this.loadFulfilmentPackage(client,manifestId),boundary:fulfilmentPackageBoundary()};
    }finally{client.release();}
  }

  async sealFulfilmentPackage({actor,planId,key,hash}){
    return this.withTransaction(async(client)=>{
      await this.assertPrivacyOperationRole(client,actor,['OPERATOR']);
      const scope=`privacy.package.seal.${planId}`;
      const replay=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replay)return {...await this.loadFulfilmentPackage(client,replay),boundary:fulfilmentPackageBoundary(),replayed:true};
      const plan=await client.query(
        `SELECT p.*,a.assessment_sha256
           FROM mathchakchak.privacy_fulfilment_plan p
           JOIN mathchakchak.privacy_impact_assessment a ON a.fulfilment_plan_id=p.id
          WHERE p.id=$1 FOR UPDATE OF p`,[planId]
      );
      if(!plan.rowCount)throw notFound();
      const row=plan.rows[0];
      if(row.created_by_user_id!==actor.userId)throw forbidden();
      if(row.status!=='DUAL_APPROVED')throw conflict('FULFILMENT_PLAN_NOT_DUAL_APPROVED');
      const hold=await client.query(
        "SELECT 1 FROM mathchakchak.privacy_legal_hold WHERE privacy_request_id=$1 AND status='ACTIVE'",[row.privacy_request_id]
      );
      if(hold.rowCount)throw conflict('ACTIVE_LEGAL_HOLD');
      const existing=await client.query(
        'SELECT 1 FROM mathchakchak.privacy_fulfilment_package_manifest WHERE fulfilment_plan_id=$1',[planId]
      );
      if(existing.rowCount)throw conflict('FULFILMENT_PACKAGE_ALREADY_SEALED');
      const approvals=await client.query(
        `SELECT approval_role,decision,reason_code,decided_at
           FROM mathchakchak.privacy_fulfilment_approval
          WHERE fulfilment_plan_id=$1 AND decision='APPROVE' ORDER BY approval_role`,[planId]
      );
      if(approvals.rowCount!==2)throw conflict('FULFILMENT_PACKAGE_APPROVAL_BUNDLE_INCOMPLETE');
      const id=crypto.randomUUID();
      const sealedAt=new Date();
      const expiresAt=new Date(sealedAt.getTime()+this.fulfilmentPackageValiditySeconds*1000);
      const approvalBundleSha256=hashApprovalBundle(approvals.rows);
      const payload=buildPackageManifestPayload({
        id,planId,requestId:row.privacy_request_id,requestType:row.request_type,policyVersion:row.policy_version,
        executionMode:row.execution_mode,assessmentSha256:row.assessment_sha256,approvalBundleSha256,
        revision:1,sealedAt,expiresAt
      });
      const manifestSha256=hashCanonical(payload);
      await client.query(
        `INSERT INTO mathchakchak.privacy_fulfilment_package_manifest
          (id,fulfilment_plan_id,privacy_request_id,request_type,revision,policy_version,execution_mode,
           assessment_sha256,approval_bundle_sha256,manifest_payload,manifest_sha256,sealed_by_user_id,sealed_at,expires_at)
         VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`,
        [id,planId,row.privacy_request_id,row.request_type,row.policy_version,row.execution_mode,row.assessment_sha256,
         approvalBundleSha256,JSON.stringify(payload),manifestSha256,actor.userId,sealedAt,expiresAt]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:id,status:201});
      return {...await this.loadFulfilmentPackage(client,id),boundary:fulfilmentPackageBoundary(),replayed:false};
    });
  }

  async recordFulfilmentRecoveryCheckpoint({actor,manifestId,key,hash}){
    return this.withTransaction(async(client)=>{
      await this.assertPrivacyOperationRole(client,actor,['OPERATOR']);
      const scope=`privacy.package.checkpoint.${manifestId}`;
      const replay=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replay)return {...await this.loadFulfilmentPackage(client,replay),boundary:fulfilmentPackageBoundary(),replayed:true};
      const manifest=await client.query(
        `SELECT m.*,p.created_by_user_id,
                EXISTS(SELECT 1 FROM mathchakchak.privacy_legal_hold h
                         WHERE h.privacy_request_id=m.privacy_request_id AND h.status='ACTIVE') AS active_legal_hold
           FROM mathchakchak.privacy_fulfilment_package_manifest m
           JOIN mathchakchak.privacy_fulfilment_plan p ON p.id=m.fulfilment_plan_id
          WHERE m.id=$1 FOR UPDATE OF m`,[manifestId]
      );
      if(!manifest.rowCount)throw notFound();
      const row=manifest.rows[0];
      if(row.created_by_user_id!==actor.userId)throw forbidden();
      if(row.active_legal_hold)throw conflict('ACTIVE_LEGAL_HOLD');
      if(new Date(row.expires_at).getTime()<=Date.now())throw conflict('FULFILMENT_PACKAGE_EXPIRED');
      const existing=await client.query(
        'SELECT 1 FROM mathchakchak.privacy_fulfilment_recovery_checkpoint WHERE package_manifest_id=$1',[manifestId]
      );
      if(existing.rowCount)throw conflict('RECOVERY_CHECKPOINT_ALREADY_RECORDED');
      const id=crypto.randomUUID();
      const checkpointPayload={
        schema_version:'1.0.0',checkpoint_id:id,package_manifest_id:manifestId,
        recovery_mode:'NO_MUTATION_BASELINE',manifest_sha256:row.manifest_sha256,
        assessment_sha256:row.assessment_sha256,source_mutations:0,destructive_executor_enabled:false
      };
      const checkpointSha256=hashCanonical(checkpointPayload);
      await client.query(
        `INSERT INTO mathchakchak.privacy_fulfilment_recovery_checkpoint
          (id,package_manifest_id,recorded_by_user_id,recovery_mode,manifest_sha256,assessment_sha256,
           checkpoint_payload,checkpoint_sha256)
         VALUES ($1,$2,$3,'NO_MUTATION_BASELINE',$4,$5,$6::jsonb,$7)`,
        [id,manifestId,actor.userId,row.manifest_sha256,row.assessment_sha256,JSON.stringify(checkpointPayload),checkpointSha256]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:manifestId,status:201});
      return {...await this.loadFulfilmentPackage(client,manifestId),boundary:fulfilmentPackageBoundary(),replayed:false};
    });
  }

  async revalidateFulfilmentPackage({actor,manifestId,key,hash}){
    return this.withTransaction(async(client)=>{
      await this.assertPrivacyOperationRole(client,actor,['OPERATOR']);
      const scope=`privacy.package.revalidate.${manifestId}`;
      const replay=await this.findIdempotency(client,{actor,scope,key,hash});
      if(replay)return {...await this.loadFulfilmentPackage(client,replay),boundary:fulfilmentPackageBoundary(),replayed:true};
      const manifest=await client.query(
        `SELECT m.*,p.created_by_user_id,p.status AS plan_status,pr.student_profile_id,
                EXISTS(SELECT 1 FROM mathchakchak.privacy_legal_hold h
                         WHERE h.privacy_request_id=m.privacy_request_id AND h.status='ACTIVE') AS active_legal_hold
           FROM mathchakchak.privacy_fulfilment_package_manifest m
           JOIN mathchakchak.privacy_fulfilment_plan p ON p.id=m.fulfilment_plan_id
           JOIN mathchakchak.privacy_request pr ON pr.id=m.privacy_request_id
          WHERE m.id=$1 FOR UPDATE OF m,p`,[manifestId]
      );
      if(!manifest.rowCount)throw notFound();
      const row=manifest.rows[0];
      if(row.created_by_user_id!==actor.userId)throw forbidden();
      if(row.plan_status!=='DUAL_APPROVED')throw conflict('FULFILMENT_PLAN_NOT_DUAL_APPROVED');
      if(row.active_legal_hold)throw conflict('ACTIVE_LEGAL_HOLD');
      if(new Date(row.expires_at).getTime()>Date.now())throw conflict('FULFILMENT_PACKAGE_NOT_EXPIRED');
      const successor=await client.query(
        'SELECT 1 FROM mathchakchak.privacy_fulfilment_package_manifest WHERE predecessor_manifest_id=$1',[manifestId]
      );
      if(successor.rowCount)throw conflict('FULFILMENT_PACKAGE_ALREADY_REVALIDATED');
      const checkpoint=await client.query(
        'SELECT 1 FROM mathchakchak.privacy_fulfilment_recovery_checkpoint WHERE package_manifest_id=$1',[manifestId]
      );
      if(!checkpoint.rowCount)throw conflict('RECOVERY_CHECKPOINT_REQUIRED');
      const counts=await client.query(
        `SELECT
          (SELECT count(*)::integer FROM mathchakchak.student_profile WHERE id=$1) AS profile_rows,
          (SELECT count(*)::integer FROM mathchakchak.diagnostic_session WHERE student_profile_id=$1) AS diagnostic_sessions,
          (SELECT count(*)::integer FROM mathchakchak.learning_session WHERE student_profile_id=$1) AS learning_sessions,
          (SELECT count(*)::integer FROM mathchakchak.review_item WHERE student_profile_id=$1) AS review_items,
          (SELECT count(*)::integer FROM mathchakchak.formula_learning_session WHERE student_profile_id=$1) AS formula_sessions,
          (SELECT count(*)::integer FROM mathchakchak.privacy_request WHERE student_profile_id=$1) AS preserved_privacy_records,
          false AS active_legal_hold`,[row.student_profile_id]
      );
      if(hashImpactSnapshot(counts.rows[0])!==row.assessment_sha256){
        throw conflict('FULFILMENT_PACKAGE_IMPACT_CHANGED_REAPPROVAL_REQUIRED');
      }
      const approvals=await client.query(
        `SELECT approval_role,decision,reason_code,decided_at
           FROM mathchakchak.privacy_fulfilment_approval
          WHERE fulfilment_plan_id=$1 AND decision='APPROVE' ORDER BY approval_role`,[row.fulfilment_plan_id]
      );
      if(approvals.rowCount!==2||hashApprovalBundle(approvals.rows)!==row.approval_bundle_sha256){
        throw conflict('FULFILMENT_PACKAGE_APPROVAL_CHANGED_REAPPROVAL_REQUIRED');
      }
      const id=crypto.randomUUID();
      const sealedAt=new Date();
      const expiresAt=new Date(sealedAt.getTime()+this.fulfilmentPackageValiditySeconds*1000);
      const revision=Number(row.revision)+1;
      const payload=buildPackageManifestPayload({
        id,planId:row.fulfilment_plan_id,requestId:row.privacy_request_id,requestType:row.request_type,
        policyVersion:row.policy_version,executionMode:row.execution_mode,assessmentSha256:row.assessment_sha256,
        approvalBundleSha256:row.approval_bundle_sha256,revision,predecessorManifestId:manifestId,sealedAt,expiresAt
      });
      const manifestSha256=hashCanonical(payload);
      await client.query(
        `INSERT INTO mathchakchak.privacy_fulfilment_package_manifest
          (id,fulfilment_plan_id,privacy_request_id,request_type,revision,predecessor_manifest_id,policy_version,
           execution_mode,assessment_sha256,approval_bundle_sha256,manifest_payload,manifest_sha256,
           sealed_by_user_id,sealed_at,expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15)`,
        [id,row.fulfilment_plan_id,row.privacy_request_id,row.request_type,revision,manifestId,row.policy_version,
         row.execution_mode,row.assessment_sha256,row.approval_bundle_sha256,JSON.stringify(payload),manifestSha256,
         actor.userId,sealedAt,expiresAt]
      );
      await this.saveIdempotency(client,{actor,scope,key,hash,reference:id,status:201});
      return {...await this.loadFulfilmentPackage(client,id),boundary:fulfilmentPackageBoundary(),replayed:false};
    });
  }
}
