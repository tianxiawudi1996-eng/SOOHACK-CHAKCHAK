export const ACADEMY_TRACKS=Object.freeze([
  'CONCEPT_RECOVERY','SCHOOL_EXAM','ADVANCED_REASONING','CONTEST_BRIDGE'
]);

export const TRACK_GATES=Object.freeze({
  CONCEPT_RECOVERY:{answered:0,accuracy:0,recall:0,mastery:0,independence:0},
  SCHOOL_EXAM:{answered:10,accuracy:0.7,recall:0.55,mastery:0.5,independence:0.45},
  ADVANCED_REASONING:{answered:25,accuracy:0.8,recall:0.7,mastery:0.65,independence:0.6},
  CONTEST_BRIDGE:{answered:50,accuracy:0.9,recall:0.8,mastery:0.8,independence:0.75}
});

const MIX=Object.freeze({
  CONCEPT_RECOVERY:{concept:60,standard:30,advanced:10,sessions:4,problems:32},
  SCHOOL_EXAM:{concept:30,standard:50,advanced:20,sessions:5,problems:45},
  ADVANCED_REASONING:{concept:20,standard:35,advanced:45,sessions:5,problems:55},
  CONTEST_BRIDGE:{concept:10,standard:20,advanced:70,sessions:6,problems:66}
});

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const ratio=(value)=>value===null||value===undefined?0:Math.max(0,Math.min(1,finite(value)));
const percent=(value)=>Math.round(ratio(value)*100);

export function normalizeAcademyTrack(value){
  const candidate=String(value??'').trim().toUpperCase();
  return ACADEMY_TRACKS.includes(candidate)?candidate:null;
}

function recommendedTrack({answered,accuracy,recall,mastery,independence,evidenceSufficient}){
  if(!evidenceSufficient)return 'CONCEPT_RECOVERY';
  const eligible=ACADEMY_TRACKS.filter((track)=>{
    const gate=TRACK_GATES[track];
    return answered>=gate.answered&&accuracy>=gate.accuracy&&recall>=gate.recall&&mastery>=gate.mastery&&independence>=gate.independence;
  });
  return eligible.at(-1)??'CONCEPT_RECOVERY';
}

function blockersFor(track,metrics,evidenceSufficient){
  const blockers=[];
  if(!evidenceSufficient)blockers.push('INSUFFICIENT_BASELINE');
  const gate=TRACK_GATES[track];
  if(metrics.answered<gate.answered)blockers.push('ANSWER_EVIDENCE_SHORT');
  if(metrics.accuracy<gate.accuracy)blockers.push('ACCURACY_BELOW_GATE');
  if(metrics.recall<gate.recall)blockers.push('RECALL_BELOW_GATE');
  if(metrics.mastery<gate.mastery)blockers.push('APPLICATION_BELOW_GATE');
  if(metrics.independence<gate.independence)blockers.push('HINT_DEPENDENCE_HIGH');
  return [...new Set(blockers)];
}

function actionCodes(metrics,evidenceSufficient){
  const actions=[];
  if(!evidenceSufficient)actions.push('COLLECT_BASELINE');
  if(metrics.accuracy<0.75)actions.push('REBUILD_CONCEPT');
  if(metrics.recall<0.7)actions.push('SCHEDULE_RECALL');
  if(metrics.mastery<0.7)actions.push('PRACTICE_TRANSFER');
  if(metrics.independence<0.6)actions.push('FADE_HINTS');
  if(metrics.accuracy>=0.85&&metrics.mastery>=0.75)actions.push('ADD_STRETCH_SET');
  actions.push('REVIEW_SOLUTION_JOURNAL');
  return [...new Set(actions)].slice(0,3);
}

export function buildAcademyReadiness({progress={},quality={},targetTrack='ADVANCED_REASONING',generatedAt=new Date().toISOString()}={}){
  const requestedTrack=normalizeAcademyTrack(targetTrack);
  if(!requestedTrack)throw new TypeError('INVALID_ACADEMY_TRACK');
  const answered=Math.max(0,Math.trunc(finite(progress.answered)));
  const accuracy=ratio(progress.accuracy);
  const recall=ratio(quality.primary?.durable_recall_rate??progress.reviewRecall);
  const mastery=ratio(quality.primary?.application_mastery_rate);
  const completion=ratio(quality.primary?.learning_completion_rate);
  const independence=ratio(quality.drivers?.independent_response_rate);
  const coverage=Math.min(1,answered/50);
  const evidenceSufficient=Boolean(progress.dataSufficient&&quality.data_sufficient);
  const weighted=accuracy*0.25+recall*0.2+mastery*0.2+completion*0.15+independence*0.1+coverage*0.1;
  const metrics={answered,accuracy,recall,mastery,completion,independence,coverage};
  const blockers=blockersFor(requestedTrack,metrics,evidenceSufficient);
  const recommended=recommendedTrack({...metrics,evidenceSufficient});
  const mix=MIX[recommended];
  return {
    schema_version:'1.0.0',generated_at:generatedAt,
    requested_track:requestedTrack,recommended_track:recommended,
    evidence_status:evidenceSufficient?'SUFFICIENT':'INSUFFICIENT',
    eligible_for_requested_track:evidenceSufficient&&blockers.length===0,
    readiness_score:percent(weighted),
    metrics:{answered,accuracy:percent(accuracy),durable_recall:percent(recall),application_mastery:percent(mastery),completion:percent(completion),independent_response:percent(independence),evidence_coverage:percent(coverage)},
    blockers,next_actions:actionCodes(metrics,evidenceSufficient),
    weekly_plan:{track:recommended,sessions:mix.sessions,total_problems:mix.problems,problem_mix:{concept:mix.concept,standard:mix.standard,advanced:mix.advanced},required_solution_journals:2,teacher_checkpoints:1},
    role_contract:{CHAKCHAKI:['EXPOSE_REASONING','DIAGNOSE_PREREQUISITE','SCAFFOLD_WITHOUT_ANSWER'],GONGSICKYI:['VERIFY_FORMULA','VERIFY_CALCULATION','VERIFY_UNIT_AND_RANGE']},
    privacy:{aggregate_only:true,raw_answers_included:false,problem_text_included:false,direct_identity_included:false},
    commercial_claim_boundary:{score_improvement_claimed:false,daechi_acceptance_claimed:false,field_validation_required:true}
  };
}
