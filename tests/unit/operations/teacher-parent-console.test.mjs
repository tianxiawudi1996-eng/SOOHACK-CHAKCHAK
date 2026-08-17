import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOperationsOverview,validateAssignmentTransition} from '../../../developer/src/operations/teacher-parent-console.mjs';

const base={studentId:'s1',gradeCode:'E6',readiness:{readiness_score:40,evidence_status:'PARTIAL',recommended_track:'CONCEPT_RECOVERY',blockers:['RECALL']},plan:{id:'p1',track_code:'CONCEPT_RECOVERY',sessions_per_week:4,formula_count:6},assignments:[{id:'a1',status:'ASSIGNED',track_code:'CONCEPT_RECOVERY',due_at:'2026-08-20',item_count:6,created_at:'2026-08-12'}],interventions:[{id:'i1',reason_code:'RECALL_GAP',priority:'WATCH',status:'OPEN',created_at:'2026-08-12'}]};

test('teacher overview exposes write capabilities without raw learning content',()=>{const value=buildOperationsOverview({...base,viewerRole:'TEACHER'});assert.equal(value.capabilities.assign,true);assert.equal(value.interventions.length,1);assert.equal(JSON.stringify(value).includes('accepted_values'),false);assert.equal(value.privacy.raw_answers_included,false);});
test('parent overview is read only and hides internal interventions',()=>{const value=buildOperationsOverview({...base,viewerRole:'PARENT'});assert.deepEqual(value.capabilities,{assign:false,intervene:false,read_report:true});assert.deepEqual(value.interventions,[]);});
test('assignment workflow allows forward transitions and rejects reopening',()=>{assert.deepEqual(validateAssignmentTransition('ASSIGNED','IN_PROGRESS'),{from_status:'ASSIGNED',to_status:'IN_PROGRESS'});assert.throws(()=>validateAssignmentTransition('COMPLETED','IN_PROGRESS'),/INVALID_ASSIGNMENT_TRANSITION/);});
