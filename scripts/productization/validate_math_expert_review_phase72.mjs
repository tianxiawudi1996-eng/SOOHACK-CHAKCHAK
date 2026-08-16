import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const required=[
  'developer/contracts/math-expert-dual-review-v1.0.json','developer/src/content/math-expert-review-readiness.mjs',
  'infra/database/migrations/0037_math_expert_dual_review.sql','infra/database/migrations/0037_math_expert_dual_review_rollback.sql',
  'infra/database/seeds/0013_math_expert_dual_review.sql','infra/database/tests/0037_math_expert_dual_review_smoke.sql',
  'docs/developer/productization/INDEPENDENT_MATH_EXPERT_DUAL_REVIEW_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_72_INDEPENDENT_MATH_EXPERT_DUAL_REVIEW_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_72_MATH_EXPERT_DUAL_REVIEW_QA.json',
  'docs/productization/reports/PHASE_72_MATH_EXPERT_DUAL_REVIEW_REPORT.md',
  'tests/unit/content/math-expert-review-readiness.test.mjs','tests/integration/api-math-expert-review-readiness.test.mjs'
];
const missing=required.filter(file=>!existsSync(resolve(root,file)));
if(missing.length)throw new Error(`missing: ${missing.join(', ')}`);

const contract=JSON.parse(readFileSync(resolve(root,required[0]),'utf8'));
if(contract.requirement_id!=='D80-07'||contract.minimum_distinct_reviewers!==2||contract.criteria.length!==4||contract.decisions.length!==3)throw new Error('dual review contract invalid');
if(!contract.controls.verified_credentials_required||!contract.controls.blind_independent_assignment||!contract.controls.same_target_hash_required||!contract.controls.independent_adjudicator_required_for_disagreement||contract.controls.automatic_expert_approval!==false)throw new Error('dual review controls invalid');
if(contract.privacy.reviewer_name_stored!==false||contract.privacy.contact_details_stored!==false||contract.privacy.credential_document_stored!==false)throw new Error('reviewer privacy boundary invalid');
if(contract.truth_boundary.verified_experts!==0||contract.truth_boundary.dual_approved_targets!==0||contract.truth_boundary.professional_review_complete!==false||contract.truth_boundary.market_score_80_confirmed!==false)throw new Error('review truth boundary invalid');

const up=readFileSync(resolve(root,required[2]),'utf8');
const down=readFileSync(resolve(root,required[3]),'utf8');
const tables=['math_expert_review_protocol','math_expert_review_criterion','math_expert_reviewer','math_expert_review_target','math_expert_review_assignment','math_expert_review_decision','math_expert_disagreement_resolution','math_expert_review_audit_event'];
for(const table of tables){
  if(!up.includes(`CREATE TABLE mathchakchak.${table}`))throw new Error(`up missing ${table}`);
  if(!down.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))throw new Error(`rollback missing ${table}`);
}
for(const token of ['minimum_distinct_reviewers = 2','blind_peer_decision_visible = false','reviewer_valid_until < NEW.reviewed_at::date','non_approvals > 0','MATH_EXPERT_DECISION_GATE_BLOCKED','MATH_EXPERT_ADJUDICATION_GATE_BLOCKED','MATH_EXPERT_DUAL_APPROVAL_GATE_BLOCKED','math expert review history is append-only','REVOKE ALL'])if(!up.includes(token))throw new Error(`database control missing: ${token}`);
for(const forbidden of ['reviewer_name','email_address','phone_number','credential_document'])if(up.includes(forbidden))throw new Error(`personal reviewer field forbidden: ${forbidden}`);

const seed=readFileSync(resolve(root,required[4]),'utf8');
for(const forbidden of ['INSERT INTO mathchakchak.math_expert_reviewer','INSERT INTO mathchakchak.math_expert_review_target','INSERT INTO mathchakchak.math_expert_review_assignment','INSERT INTO mathchakchak.math_expert_review_decision'])if(seed.includes(forbidden))throw new Error(`synthetic expert evidence forbidden: ${forbidden}`);
if(!seed.includes("'DRAFT_EXTERNAL_REVIEW'")||!seed.includes("'FORMULA_ACCURACY'")||!seed.includes("'DIFFICULTY_ALIGNMENT'"))throw new Error('seed protocol boundary invalid');
const design=readFileSync(resolve(root,required[6]));
const designHash=createHash('sha256').update(design).digest('hex');
if(!seed.includes(designHash))throw new Error('design hash is not bound to protocol seed');

const repository=readFileSync(resolve(root,'developer/src/api/repository.mjs'),'utf8');
const server=readFileSync(resolve(root,'developer/src/api/server.mjs'),'utf8');
if(!repository.includes('getMathExpertReviewReadiness')||!repository.includes('assertPrivacyOperator'))throw new Error('admin repository boundary missing');
if(!server.includes('/api/v1/admin/math-expert-review/readiness'))throw new Error('expert readiness endpoint missing');

console.log('MATH_EXPERT_DUAL_REVIEW_PHASE72_STATIC_PASS');
console.log('criteria=4/4');
console.log('minimum_distinct_reviewers=2');
console.log('append_only_history=PASS');
console.log('actual_verified_experts=0');
console.log('expert_review=BLOCKED_EXTERNAL');
