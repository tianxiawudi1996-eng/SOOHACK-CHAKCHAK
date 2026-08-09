import http from 'node:http';
import crypto from 'node:crypto';
import {createSessionToken} from './auth.mjs';
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
import {assertAllowedRequestOrigin} from './security.mjs';
import {isPrivacyRequestType} from '../privacy/data-rights.mjs';
import {isReasonCode,isReference,isSha256} from '../privacy/privacy-operations.mjs';

const UUID_PATTERN = '[0-9a-fA-F-]{36}';
const COLLABORATION_PHASE_SIGNALS={
  1:['CONFIDENT','NEEDS_REVIEW'],2:['CONNECTED','NEEDS_EXAMPLE'],3:['DERIVED','NEEDS_GUIDANCE'],
  4:['APPLIED','NEEDS_HINT'],5:['VERIFIED','REVIEW_REQUIRED']
};

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
  if (method === 'POST' && pathname === '/api/v1/local-demo/session') return {name: 'localDemoSession'};
  if (method === 'POST' && pathname === '/api/v1/local-demo/privacy-operator/session') return {name:'localDemoPrivacyOperatorSession'};
  let approverMatch=pathname.match(/^\/api\/v1\/local-demo\/privacy-approver\/(privacy|security)\/session$/);
  if(method==='POST'&&approverMatch)return {name:'localDemoPrivacyApproverSession',approvalRole:approverMatch[1]==='privacy'?'PRIVACY_APPROVER':'SECURITY_APPROVER'};
  if (method === 'GET' && pathname === '/api/v1/privacy-operations/requests') return {name:'listPrivacyOperationsQueue'};
  let operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/requests/(${UUID_PATTERN})/transition$`));
  if(method==='POST'&&operationsMatch)return {name:'transitionPrivacyOperation',privacyRequestId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/requests/(${UUID_PATTERN})/fulfilment-plans$`));
  if(method==='POST'&&operationsMatch)return {name:'createFulfilmentPlan',privacyRequestId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/requests/(${UUID_PATTERN})/legal-holds$`));
  if(method==='POST'&&operationsMatch)return {name:'setPrivacyLegalHold',privacyRequestId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/legal-holds/(${UUID_PATTERN})/release$`));
  if(method==='POST'&&operationsMatch)return {name:'releasePrivacyLegalHold',legalHoldId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/fulfilment-plans/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getFulfilmentPlan',fulfilmentPlanId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/fulfilment-plans/(${UUID_PATTERN})/impact-assessment$`));
  if(method==='POST'&&operationsMatch)return {name:'assessFulfilmentImpact',fulfilmentPlanId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/fulfilment-plans/(${UUID_PATTERN})/approvals$`));
  if(method==='POST'&&operationsMatch)return {name:'decideFulfilmentApproval',fulfilmentPlanId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/fulfilment-plans/(${UUID_PATTERN})/package-manifests$`));
  if(method==='POST'&&operationsMatch)return {name:'sealFulfilmentPackage',fulfilmentPlanId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/package-manifests/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getFulfilmentPackage',packageManifestId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/package-manifests/(${UUID_PATTERN})/recovery-checkpoints$`));
  if(method==='POST'&&operationsMatch)return {name:'recordFulfilmentRecoveryCheckpoint',packageManifestId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/package-manifests/(${UUID_PATTERN})/revalidate$`));
  if(method==='POST'&&operationsMatch)return {name:'revalidateFulfilmentPackage',packageManifestId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/package-manifests/(${UUID_PATTERN})/execution-readiness-reviews$`));
  if(method==='POST'&&operationsMatch)return {name:'createExecutionReadinessReview',packageManifestId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/execution-readiness-reviews/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExecutionReadinessReview',readinessReviewId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/execution-readiness-reviews/(${UUID_PATTERN})/handoff-packets$`));
  if(method==='POST'&&operationsMatch)return {name:'createExecutionHandoffPacket',readinessReviewId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/execution-handoff-packets/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExecutionHandoffPacket',handoffPacketId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/execution-handoff-packets/(${UUID_PATTERN})/evidence-validation-contracts$`));
  if(method==='POST'&&operationsMatch)return {name:'createExternalEvidenceValidationContract',handoffPacketId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/evidence-validation-contracts/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExternalEvidenceValidationContract',validationContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/evidence-validation-contracts/(${UUID_PATTERN})/intake-adapter-contracts$`));
  if(method==='POST'&&operationsMatch)return {name:'createExternalEvidenceIntakeAdapterContract',validationContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/intake-adapter-contracts/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExternalEvidenceIntakeAdapterContract',intakeAdapterContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/intake-adapter-contracts/(${UUID_PATTERN})/connection-acceptance-packets$`));
  if(method==='POST'&&operationsMatch)return {name:'createExternalConnectionAcceptancePacket',intakeAdapterContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/connection-acceptance-packets/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExternalConnectionAcceptancePacket',connectionAcceptancePacketId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/connection-acceptance-packets/(${UUID_PATTERN})/configuration-evidence-queue-contracts$`));
  if(method==='POST'&&operationsMatch)return {name:'createExternalConfigurationEvidenceQueueContract',connectionAcceptancePacketId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/configuration-evidence-queue-contracts/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExternalConfigurationEvidenceQueueContract',configurationEvidenceQueueContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/configuration-evidence-queue-contracts/(${UUID_PATTERN})/submission-envelope-contracts$`));
  if(method==='POST'&&operationsMatch)return {name:'createExternalEvidenceSubmissionEnvelopeContract',configurationEvidenceQueueContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/submission-envelope-contracts/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExternalEvidenceSubmissionEnvelopeContract',submissionEnvelopeContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/submission-envelope-contracts/(${UUID_PATTERN})/reference-scheme-governance-contracts$`));
  if(method==='POST'&&operationsMatch)return {name:'createExternalReferenceSchemeGovernanceContract',submissionEnvelopeContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/reference-scheme-governance-contracts/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExternalReferenceSchemeGovernanceContract',referenceSchemeGovernanceContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/reference-scheme-governance-contracts/(${UUID_PATTERN})/reference-target-validation-contracts$`));
  if(method==='POST'&&operationsMatch)return {name:'createExternalReferenceTargetValidationContract',referenceSchemeGovernanceContractId:operationsMatch[1]};
  operationsMatch=pathname.match(new RegExp(`^/api/v1/privacy-operations/reference-target-validation-contracts/(${UUID_PATTERN})$`));
  if(method==='GET'&&operationsMatch)return {name:'getExternalReferenceTargetValidationContract',referenceTargetValidationContractId:operationsMatch[1]};
  if (method === 'GET' && pathname === '/api/v1/privacy/requests') return {name:'listPrivacyRequests'};
  if (method === 'POST' && pathname === '/api/v1/privacy/requests') return {name:'createPrivacyRequest'};
  let privacyMatch=pathname.match(new RegExp(`^/api/v1/privacy/requests/(${UUID_PATTERN})/cancel$`));
  if(method==='POST'&&privacyMatch)return {name:'cancelPrivacyRequest',privacyRequestId:privacyMatch[1]};
  privacyMatch=pathname.match(new RegExp(`^/api/v1/privacy/requests/(${UUID_PATTERN})$`));
  if(method==='GET'&&privacyMatch)return {name:'getPrivacyRequest',privacyRequestId:privacyMatch[1]};
  if (method === 'GET' && pathname === '/api/v1/diagnostic-items') return {name: 'getDiagnosticItems'};
  if (method === 'POST' && pathname === '/api/v1/local-demo/handoffs') return {name: 'createLocalDemoHandoff'};
  let match = pathname.match(/^\/api\/v1\/local-demo\/handoffs\/([0-9a-f]{64})\/consume$/);
  if (method === 'POST' && match) return {name: 'consumeLocalDemoHandoff', code: match[1]};
  if (method === 'POST' && pathname === '/api/v1/diagnostics') return {name: 'createDiagnostic'};
  if (method === 'GET' && pathname === '/api/v1/curriculum/grades') return {name:'getCurriculumGrades'};
  match = pathname.match(/^\/api\/v1\/curriculum\/grades\/(E[1-6]|M[1-3]|H[1-3])\/formulas$/);
  if (method === 'GET' && match) return {name:'getGradeFormulas',gradeCode:match[1]};
  if (method === 'POST' && pathname === '/api/v1/curriculum/collaboration-plans') return {name:'createCurriculumCollaborationPlan'};
  match = pathname.match(new RegExp(`^/api/v1/curriculum/collaboration-plans/(${UUID_PATTERN})$`));
  if (method === 'GET' && match) return {name:'getCurriculumCollaborationPlan',collaborationSessionId:match[1]};
  match = pathname.match(new RegExp(`^/api/v1/curriculum/collaboration-plans/(${UUID_PATTERN})/phase-evidence$`));
  if (method === 'POST' && match) return {name:'addCurriculumCollaborationEvidence',collaborationSessionId:match[1]};
  match = pathname.match(new RegExp(`^/api/v1/curriculum/collaboration-plans/(${UUID_PATTERN})/complete$`));
  if (method === 'POST' && match) return {name:'completeCurriculumCollaborationPlan',collaborationSessionId:match[1]};
  match = pathname.match(new RegExp(`^/api/v1/curriculum/formulas/(${UUID_PATTERN})/recall-check$`));
  if (method === 'GET' && match) return {name:'getFormulaRecallCheck',formulaCatalogId:match[1]};
  match = pathname.match(new RegExp(`^/api/v1/curriculum/recall-checks/(${UUID_PATTERN})/attempts$`));
  if (method === 'POST' && match) return {name:'addFormulaRecallAttempt',recallItemId:match[1]};
  match = pathname.match(new RegExp(`^/api/v1/curriculum/formulas/(${UUID_PATTERN})/application-checks$`));
  if (method === 'GET' && match) return {name:'getFormulaApplicationChecks',formulaCatalogId:match[1]};
  match = pathname.match(new RegExp(`^/api/v1/curriculum/application-checks/(${UUID_PATTERN})/attempts$`));
  if (method === 'POST' && match) return {name:'addFormulaApplicationAttempt',applicationItemId:match[1]};

  match = pathname.match(new RegExp(`^/api/v1/diagnostics/(${UUID_PATTERN})/responses$`));
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
  match = pathname.match(new RegExp(`^/api/v1/students/(${UUID_PATTERN})/learning-quality$`));
  if (method === 'GET' && match) return {name:'getLearningQuality',studentId:match[1]};
  match = pathname.match(new RegExp(`^/api/v1/students/(${UUID_PATTERN})/adaptive-recommendation$`));
  if (method === 'GET' && match) return {name: 'getAdaptiveRecommendation', studentId: match[1]};
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
  if (match.name === 'localDemoSession') {
    if (!auth.localDemoEnabled) throw notFound();
    const conceptId = '77777777-7777-4777-8777-777777777777';
    const context = await repository.createLocalDemoContext({conceptId});
    return success({
      access_token:createSessionToken({userId:context.userId,studentId:context.studentId}, auth.sessionSecret),
      token_type:'Bearer',
      expires_in:300,
      student_id:context.studentId,
      concept_id:context.conceptId,
      learning_path_item_id:context.learningPathItemId,
      environment:'LOCAL_SYNTHETIC_ONLY'
    }, {requestId, locale:'en', status:201});
  }
  if(match.name==='localDemoPrivacyOperatorSession'){
    if(!auth.localDemoEnabled)throw notFound();
    const context=await repository.createLocalDemoPrivacyOperator();
    return success({
      access_token:createSessionToken({userId:context.userId,role:'ADMIN'},auth.sessionSecret),
      token_type:'Bearer',expires_in:300,role:'ADMIN',environment:'LOCAL_SYNTHETIC_ONLY'
    },{requestId,status:201});
  }
  if(match.name==='localDemoPrivacyApproverSession'){
    if(!auth.localDemoEnabled)throw notFound();
    const context=await repository.createLocalDemoPrivacyApprover({approvalRole:match.approvalRole});
    return success({
      access_token:createSessionToken({userId:context.userId,role:'ADMIN'},auth.sessionSecret),
      token_type:'Bearer',expires_in:300,role:'ADMIN',operation_role:context.approvalRole,environment:'LOCAL_SYNTHETIC_ONLY'
    },{requestId,status:201});
  }
  if (match.name === 'consumeLocalDemoHandoff') {
    if (!auth.localDemoEnabled) throw notFound();
    const codeHash = crypto.createHash('sha256').update(match.code).digest('hex');
    const context = await repository.consumeLocalDemoHandoff({codeHash});
    return success({
      access_token:createSessionToken({userId:context.userId,studentId:context.studentId}, auth.sessionSecret),
      token_type:'Bearer',expires_in:300,student_id:context.studentId,
      concept_id:context.conceptId,learning_path_item_id:context.learningPathItemId,
      adaptive_route:context.adaptiveRoute,environment:'LOCAL_SYNTHETIC_ONLY'
    }, {requestId, locale:'en'});
  }

  const actor = requestContext(request, auth);
  if (match.name === 'getDiagnosticItems') {
    const url = new URL(request.url, 'http://localhost');
    const locale = normalizeRequestedLocale(url.searchParams.get('locale') || 'en');
    const data = await repository.getDiagnosticItems({actor, locale});
    return success(data, {requestId, locale});
  }
  if (match.name === 'getCurriculumGrades') {
    const url=new URL(request.url,'http://localhost');
    const requestedLocale=normalizeRequestedLocale(url.searchParams.get('locale')||'ko');
    const data=await repository.getCurriculumGrades({actor,requestedLocale});
    return success(data,{requestId,locale:requestedLocale});
  }
  if (match.name === 'getGradeFormulas') {
    const url=new URL(request.url,'http://localhost');
    const requestedLocale=normalizeRequestedLocale(url.searchParams.get('locale')||'ko');
    const data=await repository.getGradeFormulas({actor,gradeCode:match.gradeCode,requestedLocale});
    return success(data,{requestId,locale:requestedLocale});
  }
  if (match.name === 'getCurriculumCollaborationPlan') {
    const data=await repository.getCurriculumCollaborationPlan({actor,sessionId:requireUuid(match.collaborationSessionId,'collaboration_session_id')});
    return success(data,{requestId,locale:data.plan.content_locale});
  }
  if (match.name === 'getFormulaRecallCheck') {
    const url=new URL(request.url,'http://localhost');
    const requestedLocale=normalizeRequestedLocale(url.searchParams.get('locale')||'ko');
    const data=await repository.getFormulaRecallCheck({actor,formulaCatalogId:requireUuid(match.formulaCatalogId,'formula_catalog_id'),requestedLocale});
    return success(data,{requestId,locale:requestedLocale});
  }
  if (match.name === 'getFormulaApplicationChecks') {
    const url=new URL(request.url,'http://localhost');
    const requestedLocale=normalizeRequestedLocale(url.searchParams.get('locale')||'ko');
    const collaborationSessionId=requireUuid(url.searchParams.get('collaboration_session_id'),'collaboration_session_id');
    const data=await repository.getFormulaApplicationChecks({actor,formulaCatalogId:requireUuid(match.formulaCatalogId,'formula_catalog_id'),collaborationSessionId,requestedLocale});
    return success(data,{requestId,locale:requestedLocale});
  }
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
  if(match.name==='getLearningQuality'){
    const data=await repository.getLearningQuality({actor,studentId:requireUuid(match.studentId,'student_id')});
    return success(data,{requestId});
  }
  if(match.name==='listPrivacyRequests'){
    const data=await repository.listPrivacyRequests({actor});
    return success(data,{requestId});
  }
  if(match.name==='listPrivacyOperationsQueue'){
    const data=await repository.listPrivacyOperationsQueue({actor});
    return success(data,{requestId});
  }
  if(match.name==='getPrivacyRequest'){
    const data=await repository.getPrivacyRequest({actor,requestId:requireUuid(match.privacyRequestId,'privacy_request_id')});
    return success(data,{requestId,locale:data.locale});
  }
  if(match.name==='getFulfilmentPlan'){
    const data=await repository.getFulfilmentPlan({actor,planId:requireUuid(match.fulfilmentPlanId,'fulfilment_plan_id')});
    return success(data,{requestId});
  }
  if(match.name==='getFulfilmentPackage'){
    const data=await repository.getFulfilmentPackage({actor,manifestId:requireUuid(match.packageManifestId,'package_manifest_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExecutionReadinessReview'){
    const data=await repository.getExecutionReadinessReview({actor,reviewId:requireUuid(match.readinessReviewId,'readiness_review_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExecutionHandoffPacket'){
    const data=await repository.getExecutionHandoffPacket({actor,packetId:requireUuid(match.handoffPacketId,'handoff_packet_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExternalEvidenceValidationContract'){
    const data=await repository.getExternalEvidenceValidationContract({actor,contractId:requireUuid(match.validationContractId,'validation_contract_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExternalEvidenceIntakeAdapterContract'){
    const data=await repository.getExternalEvidenceIntakeAdapterContract({actor,contractId:requireUuid(match.intakeAdapterContractId,'intake_adapter_contract_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExternalConnectionAcceptancePacket'){
    const data=await repository.getExternalConnectionAcceptancePacket({actor,packetId:requireUuid(match.connectionAcceptancePacketId,'connection_acceptance_packet_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExternalConfigurationEvidenceQueueContract'){
    const data=await repository.getExternalConfigurationEvidenceQueueContract({actor,contractId:requireUuid(match.configurationEvidenceQueueContractId,'configuration_evidence_queue_contract_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExternalEvidenceSubmissionEnvelopeContract'){
    const data=await repository.getExternalEvidenceSubmissionEnvelopeContract({actor,contractId:requireUuid(match.submissionEnvelopeContractId,'submission_envelope_contract_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExternalReferenceSchemeGovernanceContract'){
    const data=await repository.getExternalReferenceSchemeGovernanceContract({actor,contractId:requireUuid(match.referenceSchemeGovernanceContractId,'reference_scheme_governance_contract_id')});
    return success(data,{requestId});
  }
  if(match.name==='getExternalReferenceTargetValidationContract'){
    const data=await repository.getExternalReferenceTargetValidationContract({actor,contractId:requireUuid(match.referenceTargetValidationContractId,'reference_target_validation_contract_id')});
    return success(data,{requestId});
  }
  if (match.name === 'getAdaptiveRecommendation') {
    const data = await repository.getAdaptiveRecommendation({actor, studentId:requireUuid(match.studentId, 'student_id')});
    return success(data, {requestId});
  }

  const key = requireIdempotencyKey(request);
  const body = await readJson(request);
  const hash = requestHash({path: request.url, body});

  if(match.name==='createPrivacyRequest'){
    if(!isPrivacyRequestType(body.request_type))throw badRequest('INVALID_PRIVACY_REQUEST_TYPE','error.invalid_privacy_request_type');
    const locale=normalizeRequestedLocale(body.locale??'ko');
    const data=await repository.createPrivacyRequest({actor,requestType:body.request_type,locale,key,hash});
    return success(data,{requestId,locale,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='cancelPrivacyRequest'){
    const data=await repository.cancelPrivacyRequest({actor,requestId:requireUuid(match.privacyRequestId,'privacy_request_id'),key,hash});
    return success(data,{requestId,locale:data.locale,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='transitionPrivacyOperation'){
    if(['APPROVED','REJECTED'].includes(body.to_status)&&!isReasonCode(body.reason_code))throw badRequest('DECISION_REASON_REQUIRED','error.decision_reason_required');
    if((body.evidence_reference===undefined)!==(body.evidence_sha256===undefined))throw badRequest('EVIDENCE_PAIR_REQUIRED','error.evidence_pair_required');
    if(body.evidence_reference!==undefined&&!isReference(body.evidence_reference))throw badRequest('INVALID_EVIDENCE_REFERENCE','error.invalid_evidence_reference');
    if(body.evidence_sha256!==undefined&&!isSha256(body.evidence_sha256))throw badRequest('INVALID_EVIDENCE_HASH','error.invalid_evidence_hash');
    const data=await repository.transitionPrivacyOperation({
      actor,requestId:requireUuid(match.privacyRequestId,'privacy_request_id'),toStatus:body.to_status,
      reasonCode:body.reason_code??null,evidenceReference:body.evidence_reference??null,
      evidenceSha256:body.evidence_sha256??null,key,hash
    });
    return success(data,{requestId,locale:data.locale,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createFulfilmentPlan'){
    const data=await repository.createFulfilmentPlan({actor,requestId:requireUuid(match.privacyRequestId,'privacy_request_id'),key,hash});
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='assessFulfilmentImpact'){
    const data=await repository.assessFulfilmentImpact({actor,planId:requireUuid(match.fulfilmentPlanId,'fulfilment_plan_id'),key,hash});
    return success(data,{requestId,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='setPrivacyLegalHold'){
    if(!isReasonCode(body.reason_code))throw badRequest('LEGAL_HOLD_REASON_REQUIRED','error.legal_hold_reason_required');
    const data=await repository.setPrivacyLegalHold({actor,requestId:requireUuid(match.privacyRequestId,'privacy_request_id'),reasonCode:body.reason_code,key,hash});
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='releasePrivacyLegalHold'){
    if(!isReasonCode(body.reason_code))throw badRequest('LEGAL_HOLD_RELEASE_REASON_REQUIRED','error.legal_hold_release_reason_required');
    const data=await repository.releasePrivacyLegalHold({actor,holdId:requireUuid(match.legalHoldId,'legal_hold_id'),reasonCode:body.reason_code,key,hash});
    return success(data,{requestId,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='decideFulfilmentApproval'){
    if(!['APPROVE','REJECT'].includes(body.decision))throw badRequest('INVALID_APPROVAL_DECISION','error.invalid_approval_decision');
    if(!isReasonCode(body.reason_code))throw badRequest('APPROVAL_REASON_REQUIRED','error.approval_reason_required');
    const data=await repository.decideFulfilmentApproval({
      actor,planId:requireUuid(match.fulfilmentPlanId,'fulfilment_plan_id'),decision:body.decision,reasonCode:body.reason_code,key,hash
    });
    return success(data,{requestId,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='sealFulfilmentPackage'){
    const data=await repository.sealFulfilmentPackage({
      actor,planId:requireUuid(match.fulfilmentPlanId,'fulfilment_plan_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='recordFulfilmentRecoveryCheckpoint'){
    const data=await repository.recordFulfilmentRecoveryCheckpoint({
      actor,manifestId:requireUuid(match.packageManifestId,'package_manifest_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='revalidateFulfilmentPackage'){
    const data=await repository.revalidateFulfilmentPackage({
      actor,manifestId:requireUuid(match.packageManifestId,'package_manifest_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExecutionReadinessReview'){
    const data=await repository.createExecutionReadinessReview({
      actor,manifestId:requireUuid(match.packageManifestId,'package_manifest_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExecutionHandoffPacket'){
    const data=await repository.createExecutionHandoffPacket({
      actor,reviewId:requireUuid(match.readinessReviewId,'readiness_review_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExternalEvidenceValidationContract'){
    const data=await repository.createExternalEvidenceValidationContract({
      actor,packetId:requireUuid(match.handoffPacketId,'handoff_packet_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExternalEvidenceIntakeAdapterContract'){
    const data=await repository.createExternalEvidenceIntakeAdapterContract({
      actor,validationContractId:requireUuid(match.validationContractId,'validation_contract_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExternalConnectionAcceptancePacket'){
    const data=await repository.createExternalConnectionAcceptancePacket({
      actor,adapterContractId:requireUuid(match.intakeAdapterContractId,'intake_adapter_contract_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExternalConfigurationEvidenceQueueContract'){
    const data=await repository.createExternalConfigurationEvidenceQueueContract({
      actor,acceptancePacketId:requireUuid(match.connectionAcceptancePacketId,'connection_acceptance_packet_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExternalEvidenceSubmissionEnvelopeContract'){
    const data=await repository.createExternalEvidenceSubmissionEnvelopeContract({
      actor,queueContractId:requireUuid(match.configurationEvidenceQueueContractId,'configuration_evidence_queue_contract_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExternalReferenceSchemeGovernanceContract'){
    const data=await repository.createExternalReferenceSchemeGovernanceContract({
      actor,envelopeContractId:requireUuid(match.submissionEnvelopeContractId,'submission_envelope_contract_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if(match.name==='createExternalReferenceTargetValidationContract'){
    const data=await repository.createExternalReferenceTargetValidationContract({
      actor,governanceContractId:requireUuid(match.referenceSchemeGovernanceContractId,'reference_scheme_governance_contract_id'),key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }

  if (match.name === 'createDiagnostic') {
    const locale = normalizeRequestedLocale(body.locale);
    const data = await repository.createDiagnostic({actor, locale, key, hash});
    return success(data, {requestId, locale, status: data.replayed ? 200 : 201, extraMeta: {replayed: data.replayed}});
  }
  if (match.name === 'createCurriculumCollaborationPlan') {
    const routeName=body.adaptive_route??'CORE';
    if(!['REMEDIATE','CORE','EXTEND'].includes(routeName)) throw badRequest('INVALID_ADAPTIVE_ROUTE','error.invalid_adaptive_route');
    const requestedLocale=normalizeRequestedLocale(body.locale??'ko');
    const data=await repository.createCurriculumCollaborationPlan({
      actor,formulaCatalogId:requireUuid(body.formula_catalog_id,'formula_catalog_id'),route:routeName,requestedLocale,key,hash
    });
    return success(data,{requestId,locale:requestedLocale,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if (match.name === 'addCurriculumCollaborationEvidence') {
    const phaseNo=body.phase_no;
    if(!Number.isInteger(phaseNo)||!COLLABORATION_PHASE_SIGNALS[phaseNo]?.includes(body.signal)) throw badRequest('INVALID_COLLABORATION_EVIDENCE','error.invalid_collaboration_evidence');
    if(body.hint_level!==undefined&&(!Number.isInteger(body.hint_level)||body.hint_level<0||body.hint_level>3)) throw badRequest('INVALID_HINT_LEVEL','error.invalid_hint_level');
    if(body.duration_ms!==undefined&&(!Number.isInteger(body.duration_ms)||body.duration_ms<0||body.duration_ms>3600000)) throw badRequest('INVALID_DURATION','error.invalid_duration');
    const data=await repository.addCurriculumCollaborationEvidence({
      actor,sessionId:requireUuid(match.collaborationSessionId,'collaboration_session_id'),phaseNo,signal:body.signal,
      hintLevel:body.hint_level??0,durationMs:body.duration_ms??null,key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if (match.name === 'completeCurriculumCollaborationPlan') {
    const data=await repository.completeCurriculumCollaborationPlan({actor,sessionId:requireUuid(match.collaborationSessionId,'collaboration_session_id'),key,hash});
    return success(data,{requestId,extraMeta:{replayed:data.replayed}});
  }
  if (match.name === 'addFormulaRecallAttempt') {
    if(typeof body.selected_value!=='string'||body.selected_value.length<1||body.selected_value.length>191) throw badRequest('INVALID_RECALL_SELECTION','error.invalid_recall_selection');
    if(body.duration_ms!==undefined&&(!Number.isInteger(body.duration_ms)||body.duration_ms<0||body.duration_ms>3600000)) throw badRequest('INVALID_DURATION','error.invalid_duration');
    const data=await repository.addFormulaRecallAttempt({
      actor,recallItemId:requireUuid(match.recallItemId,'recall_item_id'),
      collaborationSessionId:requireUuid(body.collaboration_session_id,'collaboration_session_id'),
      selectedValue:body.selected_value,durationMs:body.duration_ms??null,key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
  }
  if (match.name === 'addFormulaApplicationAttempt') {
    if(!body.response_value||typeof body.response_value!=='object'||typeof body.response_value.value!=='string'||body.response_value.value.length<1||body.response_value.value.length>191)throw badRequest('INVALID_APPLICATION_RESPONSE','error.invalid_application_response');
    if(body.response_value.unit!==undefined&&(typeof body.response_value.unit!=='string'||body.response_value.unit.length>40))throw badRequest('INVALID_APPLICATION_UNIT','error.invalid_application_unit');
    if(body.duration_ms!==undefined&&(!Number.isInteger(body.duration_ms)||body.duration_ms<0||body.duration_ms>3600000))throw badRequest('INVALID_DURATION','error.invalid_duration');
    const data=await repository.addFormulaApplicationAttempt({
      actor,applicationItemId:requireUuid(match.applicationItemId,'application_item_id'),
      collaborationSessionId:requireUuid(body.collaboration_session_id,'collaboration_session_id'),
      responseValue:{value:body.response_value.value,unit:body.response_value.unit??''},durationMs:body.duration_ms??null,key,hash
    });
    return success(data,{requestId,status:data.replayed?200:201,extraMeta:{replayed:data.replayed}});
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
  if (match.name === 'createLocalDemoHandoff') {
    if (!auth.localDemoEnabled) throw notFound();
    const pathItemId = requireUuid(body.learning_path_item_id, 'learning_path_item_id');
    const code = crypto.createHmac('sha256', auth.sessionSecret)
      .update(`${actor.userId}:${actor.studentId}:${pathItemId}:${key}`)
      .digest('hex');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const data = await repository.createLocalDemoHandoff({actor, pathItemId, codeHash, key, hash});
    return success({code,expires_at:data.expires_at,single_use:true,environment:'LOCAL_SYNTHETIC_ONLY'}, {
      requestId,status:data.replayed ? 200 : 201,extraMeta:{replayed:data.replayed}
    });
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
      assertAllowedRequestOrigin(request, auth.allowedOrigins);
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
