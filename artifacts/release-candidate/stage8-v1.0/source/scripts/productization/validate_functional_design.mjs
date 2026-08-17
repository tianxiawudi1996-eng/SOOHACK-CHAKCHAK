import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const files = {
  contract: 'developer/contracts/feature-contract.json',
  design: 'docs/developer/productization/FUNCTIONAL_DESIGN_v1.0.md',
  api: 'docs/developer/productization/API_CONTRACT_v1.0.md',
  events: 'docs/developer/productization/EVENT_CONTRACT_v1.0.md',
  checklist: 'docs/developer/productization/FEATURE_CHECKLIST_v1.0.md',
  trace: 'docs/productization/REQUIREMENT_TRACEABILITY_v1.0.md'
};
const failures = [];
for (const path of Object.values(files)) { try { await access(resolve(root, path)); } catch { failures.push(`MISSING:${path}`); } }
if (failures.length) { console.error('FUNCTIONAL_DESIGN_BLOCKED'); failures.forEach(console.error); process.exit(1); }

const contract = JSON.parse(await readFile(resolve(root, files.contract), 'utf8'));
const design = await readFile(resolve(root, files.design), 'utf8');
const api = await readFile(resolve(root, files.api), 'utf8');
const events = await readFile(resolve(root, files.events), 'utf8');
const checklist = await readFile(resolve(root, files.checklist), 'utf8');
const trace = await readFile(resolve(root, files.trace), 'utf8');
const features = contract.features || [];
const featureIds = features.map((item) => item.id);
const requirementIds = features.map((item) => item.requirement_id);
if (contract.status !== 'DESIGNED' || features.length !== 15) failures.push('FEATURE_COUNT_OR_STATUS_INVALID');
if (new Set(featureIds).size !== 15 || new Set(requirementIds).size !== 15) failures.push('FEATURE_OR_REQUIREMENT_DUPLICATE');
for (let number = 1; number <= 15; number += 1) {
  const requirement = `REQ-P0-${String(number).padStart(3, '0')}`;
  if (!requirementIds.includes(requirement)) failures.push(`REQUIREMENT_NOT_MAPPED:${requirement}`);
}
for (const feature of features) {
  if (!feature.unit_test || !['client','developer','agent'].includes(feature.owner)) failures.push(`FEATURE_CONTRACT_INCOMPLETE:${feature.id}`);
  if (!design.includes(`### ${feature.id}`) || !checklist.includes(feature.id) || !trace.includes(feature.id)) failures.push(`FEATURE_DOCUMENTATION_MISSING:${feature.id}`);
  for (const dependency of feature.dependencies || []) if (!featureIds.includes(dependency)) failures.push(`UNKNOWN_DEPENDENCY:${feature.id}:${dependency}`);
}
for (const path of ['/diagnostics','/learning-sessions','/reviews/due','/parent-report']) if (!api.includes(path)) failures.push(`API_SURFACE_MISSING:${path}`);
const behaviorEvents = ['page.enter.home','learning.start','concept.open','input.started','idle.4s','hint.request','answer.correct','answer.wrong.first','answer.wrong.repeated','search.loading.5s','search.empty','diagnosis.complete','learning.complete','network.error','idle.3m'];
for (const event of behaviorEvents) if (!events.includes(event)) failures.push(`BEHAVIOR_EVENT_MISSING:${event}`);
for (const marker of ['Idempotency-Key','Content-Language','VALIDATION_ERROR']) if (!api.includes(marker)) failures.push(`API_RULE_MISSING:${marker}`);

if (failures.length) { console.error('FUNCTIONAL_DESIGN_FAIL'); failures.forEach((failure) => console.error(failure)); process.exit(1); }
console.log('FUNCTIONAL_DESIGN_PASS');
console.log('features=15/15');
console.log('requirement_mappings=15/15');
console.log('behavior_events=15/15');
console.log('api_contract=PASS');
