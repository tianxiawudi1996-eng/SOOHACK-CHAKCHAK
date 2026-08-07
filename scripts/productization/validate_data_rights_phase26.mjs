import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const json=(relative)=>JSON.parse(read(relative));
const fail=(message)=>{throw new Error(`PHASE26_DATA_RIGHTS_FAIL: ${message}`);};

for(const file of [
  'developer/src/privacy/data-rights.mjs',
  'infra/database/migrations/0012_data_rights.sql',
  'infra/database/migrations/0012_data_rights_rollback.sql',
  'infra/database/data-rights-contract.json',
  'tests/unit/privacy/data-rights.test.mjs',
  'tests/integration/api-data-rights.test.mjs',
  'docs/developer/productization/DATA_RIGHTS_WORKFLOW_v1.0.md',
  'docs/productization/prompts/PHASE_26_DATA_RIGHTS_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_26_DATA_RIGHTS_QA.json',
  'docs/productization/reports/PHASE_26_DATA_RIGHTS_REPORT.md'
])if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);

const migration=read('infra/database/migrations/0012_data_rights.sql');
for(const marker of ['privacy_request','privacy_request_event','requester_user_id','subject_user_id','student_profile_id','ON DELETE RESTRICT','SESSION_AUTHENTICATED'])if(!migration.includes(marker))fail(`migration ${marker}`);

const domain=read('developer/src/privacy/data-rights.mjs');
for(const marker of ['ACCESS','EXPORT','CORRECTION','DELETION','PROCESSING_RESTRICTION','CONSENT_WITHDRAWAL','direct_deletion_performed: false','REQUIRES_COUNSEL_AND_POLICY_OWNER_REVIEW'])if(!domain.includes(marker))fail(`domain ${marker}`);

const server=read('developer/src/api/server.mjs');
for(const marker of ['/api/v1/privacy/requests','createPrivacyRequest','listPrivacyRequests','getPrivacyRequest','cancelPrivacyRequest'])if(!server.includes(marker))fail(`API ${marker}`);

const repository=read('developer/src/api/repository.mjs');
for(const marker of ['assertStudentOwner','privacy-requests.create','privacy_request_event','canRequesterCancel','requester_user_id=$2'])if(!repository.includes(marker))fail(`repository ${marker}`);

const contract=json('infra/database/data-rights-contract.json');
if(contract.automatic_destructive_fulfilment!==false||contract.legal_compliance_certified!==false)fail('safety boundary');
if(contract.guardian_submission!=='BLOCKED_MANAGED_IDENTITY_AND_ACTIVE_LINK')fail('guardian boundary');

const evidence=json('docs/productization/evidence/PHASE_26_DATA_RIGHTS_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_DATA_RIGHTS')fail('evidence status');
if(evidence.requests.supported!=='6/6'||evidence.integration.data_rights!=='1/1 PASS')fail('evidence coverage');
if(evidence.safety.direct_deletion_performed!==false||evidence.external.guardian_identity_ready!==false)fail('evidence boundary');

console.log('PHASE26_DATA_RIGHTS_STATIC_PASS');
console.log('request_types=6/6');
console.log('student_self_service=PASS');
console.log('automatic_deletion=DISABLED');
console.log('guardian_channel=EXTERNAL_BLOCKED');
