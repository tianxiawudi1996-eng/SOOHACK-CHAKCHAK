import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const contractPath = resolve(root, 'infra/architecture/infra-contract.json');
const designPath = resolve(root, 'docs/developer/productization/INFRASTRUCTURE_DESIGN_v1.0.md');
const baselinePath = resolve(root, 'docs/developer/productization/SECURITY_OPERATIONS_BASELINE_v1.0.md');
for (const path of [contractPath, designPath, baselinePath]) { try { await access(path); } catch { console.error(`INFRASTRUCTURE_BLOCKED:${path}`); process.exit(1); } }
const contract = JSON.parse(await readFile(contractPath, 'utf8'));
const design = await readFile(designPath, 'utf8');
const baseline = await readFile(baselinePath, 'utf8');
const failures = [];
if (JSON.stringify(contract.environments) !== JSON.stringify(['local','test','staging','production'])) failures.push('ENVIRONMENT_MATRIX_INVALID');
if (contract.runtime?.database !== 'PostgreSQL') failures.push('DATABASE_RUNTIME_UNDEFINED');
if (contract.network?.tls_required !== true || !contract.network?.private?.includes('database')) failures.push('NETWORK_BOUNDARY_INVALID');
if (contract.locale_routing?.supported_count !== 8 || contract.locale_routing?.ip_geolocation_required !== false || contract.locale_routing?.fallback_locale !== 'en') failures.push('LOCALE_ROUTING_INVALID');
for (const key of ['secrets_in_repository','least_privilege','encryption_in_transit','encryption_at_rest']) {
  const expected = key === 'secrets_in_repository' ? false : true;
  if (contract.security?.[key] !== expected) failures.push(`SECURITY_CONTROL_INVALID:${key}`);
}
if (contract.reliability?.rpo_hours !== 24 || contract.reliability?.rto_hours !== 4) failures.push('RECOVERY_OBJECTIVE_INVALID');
if (contract.feature_flags?.gate5_ai_pet_behavior_default !== false) failures.push('GATE5_FLAG_PREMATURELY_ENABLED');
for (const marker of ['local','test','staging','production','RPO 24시간','RTO 4시간','PII','rollback','locale']) if (!design.includes(marker) && !baseline.includes(marker)) failures.push(`INFRASTRUCTURE_DOC_MISSING:${marker}`);
if (failures.length) { console.error('INFRASTRUCTURE_DESIGN_FAIL'); failures.forEach((failure) => console.error(failure)); process.exit(1); }
console.log('INFRASTRUCTURE_DESIGN_PASS');
console.log('environments=4/4');
console.log('locale_edge_routing=PASS');
console.log('security_controls=PASS');
console.log('recovery_objectives=PASS');
