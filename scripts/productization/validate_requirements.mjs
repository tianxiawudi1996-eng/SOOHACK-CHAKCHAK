import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const paths = {
  product: resolve(root, 'docs/client/requirements/PRODUCT_REQUIREMENTS_v1.0.md'),
  locale: resolve(root, 'docs/client/requirements/LOCALIZATION_REQUIREMENTS_v1.0.md'),
  brand: resolve(root, 'docs/client/design/BRAND_PRODUCT_CONTRACT_v1.0.md'),
  trace: resolve(root, 'docs/productization/REQUIREMENT_TRACEABILITY_v1.0.md'),
  contract: resolve(root, 'client/i18n/locale-contract.json')
};
const failures = [];
for (const [name, path] of Object.entries(paths)) {
  try { await access(path); } catch { failures.push(`MISSING:${name}`); }
}
if (failures.length) {
  console.error('PRODUCTIZATION_REQUIREMENTS_BLOCKED');
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}

const [product, localeDoc, brand, trace, contractText] = await Promise.all([
  readFile(paths.product, 'utf8'), readFile(paths.locale, 'utf8'), readFile(paths.brand, 'utf8'), readFile(paths.trace, 'utf8'), readFile(paths.contract, 'utf8')
]);
const contract = JSON.parse(contractText);
const locales = ['ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru'];
if (JSON.stringify(contract.supported_locales) !== JSON.stringify(locales)) failures.push('LOCALE_ORDER_OR_SET_INVALID');
if (contract.source_locale !== 'ko' || contract.default_locale !== 'en' || contract.fallback_locale !== 'en') failures.push('LOCALE_SOURCE_OR_FALLBACK_INVALID');
if (JSON.stringify(contract.resolution_order) !== JSON.stringify(['url','authenticated_user','locale_cookie','accept_language','default_locale'])) failures.push('LOCALE_RESOLUTION_ORDER_INVALID');
if (contract.ip_geolocation_required !== false || contract.missing_key_policy !== 'FALLBACK_AND_DIAGNOSTIC_EVENT') failures.push('LOCALE_PRIVACY_OR_FAILURE_POLICY_INVALID');
for (const localeCode of locales) if (!localeDoc.includes(`\`${localeCode}\``)) failures.push(`LOCALE_DOC_MISSING:${localeCode}`);

for (let number = 1; number <= 16; number += 1) {
  const id = `REQ-P0-${String(number).padStart(3, '0')}`;
  if (!product.includes(id)) failures.push(`P0_REQUIREMENT_MISSING:${id}`);
  if (!trace.includes(id)) failures.push(`TRACEABILITY_MISSING:${id}`);
}
for (let number = 1; number <= 8; number += 1) {
  const id = `NFR-${String(number).padStart(3, '0')}`;
  if (!product.includes(id)) failures.push(`NFR_MISSING:${id}`);
}
for (const marker of ['서비스 정의','제품 성격','디자인 유형','색상 팔레트','타이포그래피','레이블','컴포넌트','반복']) {
  if (!brand.includes(`## ${marker}`)) failures.push(`BRAND_SECTION_MISSING:${marker}`);
}
for (const source of ['수학착착_브랜드명_슬로건_확정본.md','랜딩페이지_2단계_사용자와제품_1페이지요약.md','수학착착_7단계_컴포넌트_캐릭터시스템.md']) {
  if (!product.includes(source)) failures.push(`SOURCE_REFERENCE_MISSING:${source}`);
}
if (product.includes('Study Guard') || localeDoc.includes('Study Guard') || brand.includes('Study Guard')) failures.push('WRONG_PRODUCT_NAME_FOUND');

if (failures.length) {
  console.error('PRODUCTIZATION_REQUIREMENTS_FAIL');
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}
console.log('PRODUCTIZATION_REQUIREMENTS_PASS');
console.log('p0_requirements=16/16');
console.log('nonfunctional_requirements=8/8');
console.log('locales=8/8');
console.log('brand_sections=8/8');
console.log('traceability=16/16');
