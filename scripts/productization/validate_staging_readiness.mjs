import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`STAGING_READINESS_FAIL: ${message}`); process.exit(1); };
const contract = JSON.parse(fs.readFileSync(path.join(root, 'infra/deployment/staging-contract.json'), 'utf8'));
const manifestPath = path.join(root, 'artifacts/staging/v0.1.0/manifest.json');
if (!fs.existsSync(manifestPath)) fail('staging artifact manifest missing; run npm.cmd run build:staging');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const evidencePath = path.join(root, 'docs/productization/evidence/PHASE_7_STAGING_READINESS_QA.json');

if (contract.project !== 'MathChakChak' || contract.environment !== 'staging') fail('staging contract identity invalid');
if (contract.security.literal_secrets_allowed !== false || contract.security.production_data_allowed !== false || contract.feature_flags.production_traffic !== false) fail('staging safety policy invalid');
if (contract.required_configuration.length !== 5 || contract.required_configuration.some((key) => !key.endsWith('URL') && !key.endsWith('REFERENCE'))) fail('configuration references incomplete');
if (manifest.supported_locales.length !== 8 || manifest.approved_character_assets !== 2) fail('locale or character artifact count invalid');
if (manifest.external_deployment.performed !== false || manifest.external_deployment.url !== null || manifest.external_deployment.deployment_id !== null) fail('external deployment was inferred');
if (manifest.feature_flags.gate5_ai_pet_behavior !== true || manifest.feature_flags.production_traffic !== false) fail('feature flag boundary invalid');

for (const file of manifest.files) {
  const absolute = path.join(root, 'artifacts/staging/v0.1.0', file.path);
  if (!fs.existsSync(absolute)) fail(`artifact missing: ${file.path}`);
  const bytes = fs.readFileSync(absolute);
  if (bytes.length !== file.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256) fail(`artifact hash mismatch: ${file.path}`);
}
const html = fs.readFileSync(path.join(root, 'artifacts/staging/v0.1.0/site/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'artifacts/staging/v0.1.0/site/assets/app.js'), 'utf8');
if (/\.\.\//.test(html) || !html.includes('assets/characters/chakchaki-guide.webp') || !html.includes('assets/characters/gongsickyi-praise.webp')) fail('staging asset paths invalid');
if (!app.includes('./locales/')) fail('staging locale path invalid');
for (const locale of manifest.supported_locales) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/staging/v0.1.0/site/locales', `${locale}.json`), 'utf8'));
  if (!messages['meta.title'] || !messages['hero.primary']) fail(`locale smoke failed: ${locale}`);
}
const serialized = JSON.stringify({contract,manifest});
if (/(password|secret)\s*[:=]\s*(?!false|null|"secret-manager:\/\/)/i.test(serialized)) fail('literal secret-like value found');
if (fs.existsSync(evidencePath)) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const manifestHash = crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex');
  if (evidence.status !== 'READY_BLOCKED_EXTERNAL' || evidence.artifact.manifest_sha256 !== manifestHash || evidence.external_deployment.performed !== false) fail('staging readiness evidence invalid');
}

console.log('STAGING_READINESS_PASS');
console.log(`artifact_files=${manifest.file_count}/${manifest.file_count}`);
console.log('locales=8/8');
console.log('hashes=PASS');
console.log('external_deployment=BLOCKED_NO_TARGET_CONFIGURATION');
