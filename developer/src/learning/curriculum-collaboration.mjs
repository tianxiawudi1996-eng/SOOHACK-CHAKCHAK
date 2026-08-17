const ROUTE_SETTINGS=Object.freeze({
  REMEDIATE:{starting_hint_level:2,visual_weight:'HIGH',challenge_level:1,reflection_prompts:2},
  CORE:{starting_hint_level:1,visual_weight:'MEDIUM',challenge_level:3,reflection_prompts:1},
  EXTEND:{starting_hint_level:0,visual_weight:'LOW',challenge_level:5,reflection_prompts:1}
});

const BASE_PHASES=Object.freeze([
  {phase_no:1,phase_code:'PRECHECK',lead_character:'CHAKCHAKI',support_character:null,objective:'선수 개념과 학생의 표현을 확인한다.',handoff_condition:'learner_readiness_recorded'},
  {phase_no:2,phase_code:'CONCEPT_BRIDGE',lead_character:'CHAKCHAKI',support_character:'GONGSICKYI',objective:'그림·상황·언어로 공식 이전의 수학적 관계를 연결한다.',handoff_condition:'concept_relation_explained'},
  {phase_no:3,phase_code:'FORMULA_BUILD',lead_character:'GONGSICKYI',support_character:'CHAKCHAKI',objective:'기호를 정의하고 관계에서 공식을 유도한다.',handoff_condition:'symbols_and_derivation_confirmed'},
  {phase_no:4,phase_code:'GUIDED_APPLICATION',lead_character:'BOTH',support_character:null,objective:'착착이의 힌트와 공식이의 계산 검증을 결합해 적용한다.',handoff_condition:'guided_problem_correct'},
  {phase_no:5,phase_code:'VERIFY_REFLECT',lead_character:'GONGSICKYI',support_character:'CHAKCHAKI',objective:'대입·단위·범위를 검산하고 학생 말로 원리를 회상한다.',handoff_condition:'verification_and_reflection_complete'}
]);

export function buildCurriculumCollaborationPlan(formula,{route='CORE',policyVersion='pet-collab-v1'}={}) {
  if (!formula?.id || !formula.notation || !formula.knowledge_type) throw new Error('FORMULA_CATALOG_ENTRY_REQUIRED');
  const settings=ROUTE_SETTINGS[route];
  if (!settings) throw new Error('INVALID_ADAPTIVE_ROUTE');
  return {
    policy_version:policyVersion,formula_id:formula.id,grade_code:formula.grade_code,
    route,settings,roles:{
      CHAKCHAKI:['diagnose_prerequisite','visualize_concept','detect_misconception','scaffold_hint','prompt_reflection'],
      GONGSICKYI:['define_symbols','derive_formula','check_substitution','verify_calculation','schedule_recall'],
      shared:['guided_application','handoff_context','mastery_evidence']
    },
    phases:BASE_PHASES.map((phase)=>({...phase,
      mode:formula.knowledge_type==='RELATION'&&phase.phase_code==='FORMULA_BUILD'?'RELATION_GENERALIZATION':'STANDARD',
      hint_level:phase.phase_code==='CONCEPT_BRIDGE'||phase.phase_code==='GUIDED_APPLICATION'?settings.starting_hint_level:0
    }))
  };
}

export const CURRICULUM_COLLABORATION_PHASES=BASE_PHASES;
