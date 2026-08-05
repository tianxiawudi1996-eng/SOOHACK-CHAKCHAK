import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`SCREEN_DESIGN_FAIL: ${message}`);
  process.exit(1);
};

const localeContract = JSON.parse(read('client/i18n/locale-contract.json'));
const componentContract = JSON.parse(read('client/design/component-contract.json'));
const runtimeManifest = JSON.parse(read('docs/stage8/evidence/2d-pet/v1.0/2D_PET_RUNTIME_MANIFEST_v1.0.json'));
const html = read('client/mock/index.html');
const css = `${read('client/design/tokens.css')}\n${read('client/mock/styles.css')}`;
const js = read('client/mock/app.js');
const screenDoc = read('docs/client/design/SCREEN_ARCHITECTURE_v1.0.md');
const systemDoc = read('docs/client/design/DESIGN_SYSTEM_v1.0.md');

const locales = localeContract.supported_locales;
if (locales.length !== 8) fail('supported locale count is not 8');
const bundles = locales.map((locale) => ({
  locale,
  messages: JSON.parse(read(`client/i18n/messages/${locale}.json`))
}));
const referenceKeys = Object.keys(bundles[0].messages).sort();
for (const bundle of bundles) {
  const keys = Object.keys(bundle.messages).sort();
  if (JSON.stringify(keys) !== JSON.stringify(referenceKeys)) fail(`message keys differ for ${bundle.locale}`);
  if (Object.values(bundle.messages).some((value) => typeof value !== 'string' || !value.trim())) fail(`empty message in ${bundle.locale}`);
}

const htmlKeys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);
if (htmlKeys.some((key) => !referenceKeys.includes(key))) fail('mock references an undefined message key');
if (!html.includes('id="main"') || !html.includes('class="skip-link"') || !html.includes('aria-live="polite"')) fail('accessibility landmarks or live region missing');
if (!html.includes('<select id="localeSelect"') || (html.match(/<option value=/g) ?? []).length !== 8) fail('locale selector incomplete');
if (!css.includes('@media (max-width: 640px)') || !css.includes('@media (prefers-reduced-motion: reduce)')) fail('responsive or reduced-motion rule missing');
if (!css.includes('--focus-ring') || !css.includes(':focus-visible')) fail('focus treatment missing');
if (!js.includes("const fallback = 'en'") || !js.includes('navigator.language') || !js.includes('localStorage')) fail('locale resolver policy incomplete');

if (componentContract.components.length < 10) fail('reusable component contract incomplete');
if (componentContract.asset_policy.new_character_generation !== false || componentContract.asset_policy.approved_pose_count !== 16) fail('character asset policy mismatch');
if (runtimeManifest.status !== 'APPROVED' || runtimeManifest.pose_count !== 16) fail('approved Stage 8 pose manifest unavailable');

const imageSources = [...html.matchAll(/<img src="([^"]+)"/g)].map((match) => match[1].replace(/^\.\.\/\.\.\//, ''));
if (imageSources.length !== 2) fail('mock must use exactly the two approved character placements');
const approvedPaths = new Set(runtimeManifest.poses.flatMap((pose) => [pose.png.path, pose.webp.path]));
if (imageSources.some((source) => !approvedPaths.has(source))) fail('mock references an unapproved character asset');
for (const source of imageSources) {
  const pose = runtimeManifest.poses.find((item) => item.png.path === source || item.webp.path === source);
  const expectedHash = pose.png.path === source ? pose.png.sha256 : pose.webp.sha256;
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, source))).digest('hex');
  if (actualHash !== expectedHash) fail(`approved asset hash mismatch: ${source}`);
}

for (const token of ['SCR-001', 'SCR-010', '320', 'Gate 5', 'Goal Framing', 'Specification Engineering']) {
  if (!screenDoc.includes(token)) fail(`screen architecture missing ${token}`);
}
for (const token of ['브랜드 아이덴티티', '제품 성격', '디자인 유형', '색상 팔레트', '타이포그래피', '레이블', '컴포넌트', '반복']) {
  if (!systemDoc.includes(token)) fail(`design system missing ${token}`);
}

console.log('SCREEN_DESIGN_STATIC_PASS');
console.log(`locales=${locales.length}/${locales.length}`);
console.log(`message_keys=${referenceKeys.length}/${referenceKeys.length}`);
console.log(`components=${componentContract.components.length}/10+`);
console.log('approved_character_assets=2/2');
console.log('responsive_accessibility=PASS');
