import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const contract = JSON.parse(read('infra/database/schema-contract.json'));
const up = read('infra/database/migrations/0001_initial.sql');
const down = read('infra/database/migrations/0001_rollback.sql');
const design = read('docs/developer/productization/DATABASE_DESIGN_v1.0.md');
const retention = read('docs/developer/productization/DATA_RETENTION_AND_ACCESS_v1.0.md');

const fail = (message) => {
  console.error(`DATABASE_DESIGN_FAIL: ${message}`);
  process.exit(1);
};

const expectedLocales = ['ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru'];
const expectedTables = [
  'app_user', 'user_preference', 'student_profile', 'parent_student_link',
  'consent_record', 'topic', 'problem_item', 'diagnostic_session',
  'diagnostic_response', 'learning_path', 'learning_path_item', 'learning_session',
  'learning_attempt', 'review_item', 'review_attempt', 'progress_snapshot',
  'idempotency_record', 'audit_event'
];

if (contract.database !== 'PostgreSQL' || contract.namespace !== 'mathchakchak') fail('database identity mismatch');
if (JSON.stringify(contract.supported_locales) !== JSON.stringify(expectedLocales)) fail('locale contract mismatch');
const names = contract.tables.map((table) => table.name);
if (new Set(names).size !== expectedTables.length || expectedTables.some((name) => !names.includes(name))) fail('table contract mismatch');
if (!contract.tables.every((table) => table.domain && table.owner && table.retention && table.rls)) fail('table governance fields missing');
if (!contract.migration.transactional || !contract.migration.up || !contract.migration.down) fail('migration policy incomplete');

for (const table of expectedTables) {
  if (!new RegExp(`CREATE TABLE mathchakchak\\.${table}\\s*\\(`, 'i').test(up)) fail(`up migration missing ${table}`);
  if (!new RegExp(`DROP TABLE IF EXISTS mathchakchak\\.${table}\\s*;`, 'i').test(down)) fail(`rollback missing ${table}`);
}

if ((up.match(/\bBEGIN\s*;/gi) ?? []).length !== 1 || (up.match(/\bCOMMIT\s*;/gi) ?? []).length !== 1) fail('up migration is not one transaction');
if ((down.match(/\bBEGIN\s*;/gi) ?? []).length !== 1 || (down.match(/\bCOMMIT\s*;/gi) ?? []).length !== 1) fail('rollback is not one transaction');
if (!up.includes("locale IN ('ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru')")) fail('database locale constraint missing');
if (!up.includes("metadata ?| ARRAY['answer_text', 'problem_text', 'password', 'token']")) fail('audit metadata denylist missing');

const forbiddenColumns = [/password\s+(varchar|text)/i, /session_token\s+(varchar|text)/i, /recovery_code\s+(varchar|text)/i, /contact_reference\s+(varchar|text)/i];
if (forbiddenColumns.some((pattern) => pattern.test(up))) fail('forbidden sensitive column found');

const requiredSql = [
  'REFERENCES mathchakchak.app_user', 'REFERENCES mathchakchak.student_profile',
  'REFERENCES mathchakchak.problem_item', 'CHECK (status', 'UNIQUE (learning_session_id, sequence_no)',
  'review_item_due_idx', 'idempotency_record_expiry_idx', 'audit_event_created_idx'
];
if (requiredSql.some((token) => !up.includes(token))) fail('required relationship, constraint, or index missing');

const requiredDesign = ['Goal Framing', 'Specification Engineering', 'Context Engineering', '권한과 개인정보', '무결성·동시성', '마이그레이션·복구', '`psql`'];
if (requiredDesign.some((token) => !design.includes(token))) fail('database design section missing');
if (!retention.includes('24개월') || !retention.includes('중복방지 키') || !retention.includes('답안 원문')) fail('retention or privacy rule missing');

console.log('DATABASE_DESIGN_STATIC_PASS');
console.log(`tables=${expectedTables.length}/${expectedTables.length}`);
console.log(`locales=${expectedLocales.length}/${expectedLocales.length}`);
console.log('migration_symmetry=PASS');
console.log('privacy_guards=PASS');
console.log('postgres_runtime=NOT_RUN_NO_PSQL');
