import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','..');
const files=[
  'developer/contracts/commercial-operations-readiness-v1.0.json',
  'developer/src/operations/commercial-operations-readiness.mjs',
  'infra/database/migrations/0040_commercial_operations_readiness.sql',
  'infra/database/migrations/0040_commercial_operations_readiness_rollback.sql',
  'infra/database/seeds/0016_commercial_operations_readiness.sql',
  'infra/database/tests/0040_commercial_operations_readiness_smoke.sql',
  'docs/developer/productization/COMMERCIAL_OPERATIONS_READINESS_DESIGN_v1.0.md',
  'docs/productization/prompts/PHASE_75_COMMERCIAL_OPERATIONS_READINESS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_75_COMMERCIAL_OPERATIONS_QA.json',
  'docs/productization/reports/PHASE_75_COMMERCIAL_OPERATIONS_READINESS_REPORT.md',
  'tests/unit/operations/commercial-operations-readiness.test.mjs',
  'tests/integration/api-commercial-operations-readiness.test.mjs'
];
const missing=files.filter(file=>!existsSync(resolve(root,file)));
if(missing.length)throw new Error(`missing:${missing.join(',')}`);

const contract=JSON.parse(readFileSync(resolve(root,files[0]),'utf8'));
if(contract.requirement_id!=='D80-10'||contract.required_controls.length!==10||new Set(contract.required_controls).size!==10)throw new Error('contract invalid');
if(contract.protocol.automatic_deployment||contract.protocol.automatic_release||contract.evidence.append_only!==true)throw new Error('release boundary invalid');
if(contract.truth_boundary.actual_verified_controls!==0||contract.truth_boundary.actual_recovery_drills!==0||contract.truth_boundary.production_release_authorized||contract.truth_boundary.market_score_80_confirmed)throw new Error('truth boundary invalid');

const up=readFileSync(resolve(root,files[2]),'utf8');
const down=readFileSync(resolve(root,files[3]),'utf8');
const tables=['commercial_ops_protocol','commercial_ops_control','commercial_ops_evidence','commercial_ops_recovery_drill','commercial_ops_incident','commercial_ops_product_review'];
for(const table of tables){
  if(!up.includes(`CREATE TABLE mathchakchak.${table}`)||!down.includes(`DROP TABLE IF EXISTS mathchakchak.${table}`))throw new Error(`migration symmetry:${table}`);
}
for(const marker of ['environment_count = 4','commercial operations evidence history is append-only','REVOKE ALL'])if(!up.includes(marker))throw new Error(`db control:${marker}`);
for(const forbidden of ['payment_token','backup_payload','personal_contact','legal_document'])if(up.includes(forbidden))throw new Error(`forbidden field:${forbidden}`);

const seed=readFileSync(resolve(root,files[4]),'utf8');
const designHash=createHash('sha256').update(readFileSync(resolve(root,files[6]))).digest('hex');
if(!seed.includes(designHash)||!seed.includes("'DRAFT_EXTERNAL_REVIEW'"))throw new Error('seed binding');
for(const table of ['commercial_ops_evidence','commercial_ops_recovery_drill','commercial_ops_incident','commercial_ops_product_review'])if(seed.includes(`INSERT INTO mathchakchak.${table}`))throw new Error(`synthetic evidence:${table}`);

const repo=readFileSync(resolve(root,'developer/src/api/repository.mjs'),'utf8');
const server=readFileSync(resolve(root,'developer/src/api/server.mjs'),'utf8');
if(!repo.includes('getCommercialOperationsReadiness')||!server.includes('/api/v1/admin/commercial-operations/readiness'))throw new Error('api missing');

const evidence=JSON.parse(readFileSync(resolve(root,files[8]),'utf8'));
if(evidence.status!=='LOCAL_COMMERCIAL_OPERATIONS_PLATFORM_PASS_EXTERNAL_RELEASE_BLOCKED'||evidence.coverage.actual_verified_controls!==0||evidence.truth_boundary.production_release_authorized)throw new Error('evidence truth invalid');

console.log('COMMERCIAL_OPERATIONS_PHASE75_STATIC_PASS');
console.log('controls=10/10 registered actual_verified=0');
console.log('recovery_drills=0 product_reviews=0');
console.log('release=BLOCKED_EXTERNAL');
