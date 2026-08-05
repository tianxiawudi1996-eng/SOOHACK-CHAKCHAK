import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`INTEGRATION_EVIDENCE_FAIL: ${message}`);
  process.exit(1);
};
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const evidence = readJson('docs/productization/evidence/PHASE_8_INTEGRATION_QA.json');
const status = readJson('docs/productization/STATUS.json');
const contract = readJson('infra/deployment/staging-contract.json');

if (evidence.project !== 'MathChakChak' || evidence.release !== '0.1.0') fail('identity mismatch');
if (evidence.status !== 'PARTIAL_PASS' || evidence.result !== 'FRONTEND_INTEGRATION_PASS_API_RUNTIME_BLOCKED') fail('partial result is not explicit');
if (evidence.environment.container_health !== 'healthy' || !evidence.environment.image_digest.startsWith('sha256:')) fail('deployment evidence invalid');

const frontend = evidence.frontend_checks;
if (frontend.artifact_hashes !== 'PASS' || frontend.locale_rendering !== '8/8 PASS') fail('artifact or locale integration failed');
if (frontend.missing_translation_keys !== 0 || frontend.horizontal_overflow !== 0) fail('translation or layout regression recorded');
if (frontend.approved_character_images !== '2/2 PASS' || frontend.cta_live_status !== 'PASS') fail('character or CTA integration failed');
if (frontend.keyboard_first_focus_skip_link !== 'PASS' || frontend.landmarks_and_h1 !== 'PASS') fail('accessibility integration failed');
if (frontend.console_errors_or_warnings !== 0 || frontend.security_headers !== '6/6 PASS') fail('console or security regression recorded');
if (evidence.defects_fixed.length < 1 || evidence.defects_fixed.some((item) => item.retest !== 'PASS')) fail('fixed defect evidence invalid');

if (contract.scope.api_runtime !== false || contract.scope.database_runtime !== false) fail('runtime contract changed without evidence');
if (evidence.runtime_integration.status !== 'BLOCKED_RUNTIME' || evidence.runtime_integration.api_deployed !== false) fail('runtime blocker missing');
if (evidence.phase8_complete !== false || evidence.phase9_entry_allowed !== false || evidence.blockers.length !== 2) fail('phase boundary invalid');
if (status.phases['8'].status !== 'PARTIAL_VERIFIED' || status.phases['9'].status !== 'NOT_STARTED') fail('productization status boundary invalid');

console.log('INTEGRATION_FRONTEND_PASS');
console.log('locales=8/8');
console.log('viewports=2/2');
console.log('approved_character_images=2/2');
console.log('security_headers=6/6');
console.log('console_errors_or_warnings=0');
console.log('FULL_RUNTIME_INTEGRATION_BLOCKED');
