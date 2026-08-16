import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const fail=(m)=>{throw new Error(`PHASE29_FULFILMENT_PACKAGE_FAIL: ${m}`);};
for(const file of [
  'developer/src/privacy/fulfilment-package.mjs','infra/database/migrations/0015_fulfilment_package_manifest.sql',
  'infra/database/migrations/0015_fulfilment_package_manifest_rollback.sql','infra/database/fulfilment-package-contract.json',
  'tests/unit/privacy/fulfilment-package.test.mjs','tests/integration/api-fulfilment-package.test.mjs',
  'docs/developer/productization/PRIVACY_FULFILMENT_PACKAGE_v1.0.md',
  'docs/productization/prompts/PHASE_29_FULFILMENT_PACKAGE_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_29_FULFILMENT_PACKAGE_QA.json',
  'docs/productization/reports/PHASE_29_FULFILMENT_PACKAGE_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
const migration=read('infra/database/migrations/0015_fulfilment_package_manifest.sql');
for(const marker of ['privacy_fulfilment_package_manifest','privacy_fulfilment_recovery_checkpoint','BEFORE UPDATE OR DELETE','FULFILMENT_PACKAGE_APPEND_ONLY','UNIQUE (predecessor_manifest_id)','DRY_RUN_ONLY'])if(!migration.includes(marker))fail(`migration ${marker}`);
for(const requestType of ['ACCESS','EXPORT','CORRECTION','DELETION','PROCESSING_RESTRICTION','CONSENT_WITHDRAWAL'])if(!migration.includes(`'${requestType}'`))fail(`request type ${requestType}`);
const domain=read('developer/src/privacy/fulfilment-package.mjs');
for(const marker of ['EXPIRED_REVALIDATION_REQUIRED','SUPERSEDED','manifest_immutable:true','destructive_executor_enabled:false','NO_MUTATION_BASELINE'])if(!domain.includes(marker))fail(`domain ${marker}`);
const repository=read('developer/src/api/repository.mjs');
for(const marker of ['sealFulfilmentPackage','recordFulfilmentRecoveryCheckpoint','revalidateFulfilmentPackage','FULFILMENT_PACKAGE_IMPACT_CHANGED_REAPPROVAL_REQUIRED','hashApprovalBundle'])if(!repository.includes(marker))fail(`repository ${marker}`);
const server=read('developer/src/api/server.mjs');
for(const marker of ['package-manifests','recovery-checkpoints','sealFulfilmentPackage','revalidateFulfilmentPackage'])if(!server.includes(marker))fail(`API ${marker}`);
const contract=json('infra/database/fulfilment-package-contract.json');
if(!contract.manifest_immutable||!contract.checkpoint_immutable||contract.destructive_executor_enabled!==false||contract.recovery_mode!=='NO_MUTATION_BASELINE')fail('safety contract');
const evidence=json('docs/productization/evidence/PHASE_29_FULFILMENT_PACKAGE_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_FULFILMENT_PACKAGE'||evidence.tests.unit!=='81/81 PASS'||evidence.tests.postgresql_regression!=='20/20 PASS')fail('evidence tests');
if(evidence.safety.source_data_mutations!==0||evidence.database.immutable_triggers!=='2/2 BLOCKED')fail('evidence safety');
console.log('PHASE29_FULFILMENT_PACKAGE_STATIC_PASS');
console.log('package_tables=2/2');
console.log('unit=81/81');
console.log('postgresql_integration=20/20');
console.log('immutable_triggers=2/2');
console.log('source_data_mutations=0');
