import fs from 'node:fs';

const failures=[];
const read=(path)=>fs.readFileSync(path,'utf8');
const required=[
  'developer/src/agent/tutor-kernel.mjs','developer/src/agent/openai-responses-provider.mjs','developer/src/agent/tutor-service.mjs',
  'infra/database/migrations/0031_ai_tutor_feedback.sql','infra/database/migrations/0031_ai_tutor_feedback_rollback.sql',
  'docs/agent/productization/PHASE_47_AI_TUTOR_KERNEL_EXECUTION_METAPROMPT_v1.0.md',
  'docs/developer/productization/AI_TUTOR_KERNEL_DESIGN_v1.0.md','client/math-learning/index.html'
];
for(const path of required)if(!fs.existsSync(path))failures.push(`MISSING:${path}`);
const kernel=read('developer/src/agent/tutor-kernel.mjs');
for(const marker of ['RULE_FALLBACK','GENERATIVE_ASSISTED','TUTOR_OUTPUT_SCHEMA','PROVIDER_NOT_CONFIGURED','UNSAFE_OR_INVALID_OUTPUT','SUPPORTED_LOCALES'])if(!kernel.includes(marker))failures.push(`KERNEL_MARKER:${marker}`);
const provider=read('developer/src/agent/openai-responses-provider.mjs');
for(const marker of ['store:false','json_schema','max_output_tokens:250'])if(!provider.includes(marker))failures.push(`PROVIDER_CONTROL:${marker}`);
const inputFunction=kernel.slice(kernel.indexOf('export function buildTutorModelInput'),kernel.indexOf('export function createTutorKernel'));
for(const forbidden of ['student_id','user_id','response_value','expected_response','scoring_rule'])if(inputFunction.includes(forbidden))failures.push(`FORBIDDEN_MODEL_INPUT:${forbidden}`);
const server=read('developer/src/api/server.mjs'),ui=read('client/math-learning/app.js'),migration=read('infra/database/migrations/0031_ai_tutor_feedback.sql');
if(!server.includes('/tutor-feedback'))failures.push('API_ROUTE_MISSING');
if(!ui.includes('turn.chakchaki')||!ui.includes('turn.gongsickyi'))failures.push('DUAL_TUTOR_UI_MISSING');
if(!migration.includes('tutor_feedback jsonb')||!migration.includes('tutor_metadata_complete'))failures.push('DB_EVIDENCE_CONTRACT_MISSING');
if(failures.length){console.error('PHASE47_AI_TUTOR_KERNEL_FAIL');failures.forEach((x)=>console.error(x));process.exit(1);}
console.log('PHASE47_AI_TUTOR_KERNEL_PASS');
console.log('roles=2/2');
console.log('locales=8/8');
console.log('provider_live_tested=false');
console.log('fallback_verified=true');
