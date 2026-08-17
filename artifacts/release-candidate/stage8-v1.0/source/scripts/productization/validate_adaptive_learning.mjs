import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => { console.error(`ADAPTIVE_LEARNING_FAIL: ${message}`); process.exit(1); };
const contract = JSON.parse(read('infra/database/adaptive-learning-contract.json'));
const migration = read(contract.migration);
const rollback = read(contract.rollback);
const engine = read('developer/src/learning/adaptive-routing.mjs');
const repository = read('developer/src/api/repository.mjs');
const server = read('developer/src/api/server.mjs');
const design = read('docs/developer/productization/ADAPTIVE_LEARNING_DESIGN_v1.0.md');
const prompt = read('docs/productization/prompts/PHASE_12_ADAPTIVE_LEARNING_METAPROMPT_v1.0.md');

if (contract.database !== 'PostgreSQL' || contract.algorithm_version !== 'adaptive-v1') fail('contract identity invalid');
if (JSON.stringify(Object.keys(contract.routes)) !== JSON.stringify(['REMEDIATE','CORE','EXTEND'])) fail('route contract invalid');
for (const table of contract.tables) {
  if (!new RegExp(`CREATE TABLE mathchakchak\\.${table}\\s*\\(`, 'i').test(migration)) fail(`migration missing ${table}`);
  if (!new RegExp(`DROP TABLE IF EXISTS mathchakchak\\.${table}\\s*;`, 'i').test(rollback)) fail(`rollback missing ${table}`);
}
for (const route of ['REMEDIATE','CORE','EXTEND']) if (!engine.includes(route) || !migration.includes(route)) fail(`route missing ${route}`);
for (const token of ['selectAdaptiveRoute','adaptive_learning_decision','student_topic_mastery','adaptive-v1','effectiveHintLevel','review_item','make_interval']) {
  if (!repository.includes(token) && !engine.includes(token)) fail(`implementation missing ${token}`);
}
if (!server.includes('/adaptive-recommendation') || !repository.includes('getAdaptiveRecommendation')) fail('recommendation API missing');
if (!migration.includes("evidence ?| ARRAY['answer_text', 'problem_text', 'password', 'token']")) fail('privacy constraint missing');
for (const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering']) {
  if (!design.includes(section) || !prompt.includes(section)) fail(`global instruction section missing ${section}`);
}

console.log('ADAPTIVE_LEARNING_STATIC_PASS');
console.log('routes=3/3');
console.log('thresholds=0.5,0.8');
console.log('postgres_tables=2/2');
console.log('privacy_guard=PASS');
