import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCurriculumCollaborationPlan,CURRICULUM_COLLABORATION_PHASES} from '../../../developer/src/learning/curriculum-collaboration.mjs';

const formula={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',grade_code:'M2',knowledge_type:'FORMULA',notation:'y=ax+b'};

test('curriculum collaboration gives both characters distinct responsibilities across five phases',()=>{
  const plan=buildCurriculumCollaborationPlan(formula,{route:'CORE'});
  assert.equal(plan.phases.length,5);
  assert.equal(CURRICULUM_COLLABORATION_PHASES.length,5);
  assert.deepEqual(plan.phases.map((phase)=>phase.phase_code),['PRECHECK','CONCEPT_BRIDGE','FORMULA_BUILD','GUIDED_APPLICATION','VERIFY_REFLECT']);
  assert.ok(plan.roles.CHAKCHAKI.includes('visualize_concept'));
  assert.ok(plan.roles.GONGSICKYI.includes('derive_formula'));
  assert.equal(plan.settings.starting_hint_level,1);
});

test('routes tune scaffolding and low-grade relations are generalized without forced memorization',()=>{
  assert.equal(buildCurriculumCollaborationPlan(formula,{route:'REMEDIATE'}).settings.starting_hint_level,2);
  assert.equal(buildCurriculumCollaborationPlan(formula,{route:'EXTEND'}).settings.challenge_level,5);
  const relation=buildCurriculumCollaborationPlan({...formula,grade_code:'E1',knowledge_type:'RELATION'});
  assert.equal(relation.phases.find((phase)=>phase.phase_code==='FORMULA_BUILD').mode,'RELATION_GENERALIZATION');
  assert.throws(()=>buildCurriculumCollaborationPlan(formula,{route:'UNKNOWN'}),/INVALID_ADAPTIVE_ROUTE/);
});
