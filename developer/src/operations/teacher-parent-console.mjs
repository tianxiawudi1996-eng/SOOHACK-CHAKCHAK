export const ASSIGNMENT_STATUSES=Object.freeze(['ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED']);
export const INTERVENTION_PRIORITIES=Object.freeze(['NORMAL','WATCH','URGENT']);

const transitions=Object.freeze({ASSIGNED:new Set(['IN_PROGRESS','COMPLETED','CANCELLED']),IN_PROGRESS:new Set(['COMPLETED','CANCELLED']),COMPLETED:new Set(),CANCELLED:new Set()});

export function validateAssignmentTransition(from,to){
  if(!ASSIGNMENT_STATUSES.includes(from)||!ASSIGNMENT_STATUSES.includes(to))throw new TypeError('INVALID_ASSIGNMENT_STATUS');
  if(!transitions[from].has(to))throw new RangeError('INVALID_ASSIGNMENT_TRANSITION');
  return {from_status:from,to_status:to};
}

export function buildOperationsOverview({viewerRole,studentId,gradeCode,readiness,plan,assignments=[],interventions=[]}={}){
  if(!['TEACHER','PARENT'].includes(viewerRole))throw new TypeError('INVALID_OPERATIONS_VIEWER');
  if(!/^E[1-6]$|^M[1-3]$|^H[1-3]$/.test(String(gradeCode)))throw new TypeError('INVALID_GRADE_CODE');
  return {
    schema_version:'1.0.0',requirement_id:'D80-05',viewer_role:viewerRole,student_id:studentId,grade_code:gradeCode,
    readiness:{score:readiness.readiness_score,evidence_status:readiness.evidence_status,recommended_track:readiness.recommended_track,blockers:readiness.blockers},
    recommended_plan:{id:plan.id,track_code:plan.track_code,sessions_per_week:Number(plan.sessions_per_week),formula_count:Number(plan.formula_count)},
    assignments:assignments.map(x=>({id:x.id,status:x.status,track_code:x.track_code,due_at:x.due_at,item_count:Number(x.item_count),created_at:x.created_at})),
    interventions:viewerRole==='TEACHER'?interventions.map(x=>({id:x.id,reason_code:x.reason_code,priority:x.priority,status:x.status,created_at:x.created_at})):[],
    capabilities:{assign:viewerRole==='TEACHER',intervene:viewerRole==='TEACHER',read_report:true},
    privacy:{raw_answers_included:false,problem_text_included:false,direct_identity_included:false,free_text_notes_included:false},
    truth_boundary:{scope:'LOCAL_SYNTHETIC',institution_connected:false,field_validated:false,production_ready:false}
  };
}
