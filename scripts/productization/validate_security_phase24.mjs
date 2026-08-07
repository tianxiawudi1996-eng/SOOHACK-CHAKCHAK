import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const json=(relative)=>JSON.parse(read(relative));
const fail=(message)=>{throw new Error(`PHASE24_SECURITY_FAIL: ${message}`);};

const required=[
  'developer/src/api/security.mjs',
  'tests/unit/api/security-boundary.test.mjs',
  'tests/integration/api-security-boundary.test.mjs',
  'docs/developer/productization/SECURITY_HARDENING_v1.0.md',
  'docs/productization/prompts/PHASE_24_SECURITY_HARDENING_METAPROMPT_v1.0.md',
  'docs/productization/evidence/PHASE_24_SECURITY_QA.json',
  'docs/productization/reports/PHASE_24_SECURITY_REPORT.md'
];
for(const file of required)if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);

const auth=read('developer/src/api/auth.mjs');
for(const marker of ['MAX_TOKEN_BYTES = 4096','claims.exp <= claims.iat','timingSafeEqual','EXPECTED_AUDIENCE'])if(!auth.includes(marker))fail(`token ${marker}`);

const http=read('developer/src/api/http.mjs');
for(const marker of ['MAX_BODY_BYTES = 64 * 1024','UNSUPPORTED_MEDIA_TYPE','IDEMPOTENCY_KEY_PATTERN','Cross-Origin-Resource-Policy','X-Permitted-Cross-Domain-Policies'])if(!http.includes(marker))fail(`http ${marker}`);

const security=read('developer/src/api/security.mjs');
for(const marker of ['ORIGIN_FORBIDDEN','TRUSTED_TEST_HEADERS_FORBIDDEN_OUTSIDE_TEST','parseAllowedOrigins'])if(!security.includes(marker))fail(`boundary ${marker}`);

const server=read('developer/src/api/server.mjs');
if(!server.includes('assertAllowedRequestOrigin(request, auth.allowedOrigins)'))fail('origin enforcement');
const compose=read('infra/deployment/compose.api-staging.yaml');
if(!compose.includes('ALLOW_TRUSTED_TEST_HEADERS: "false"')||!compose.includes('ALLOWED_BROWSER_ORIGINS: "http://127.0.0.1:4180,http://localhost:4180"'))fail('runtime boundary');

const nginx=read('infra/deployment/nginx.staging.conf');
for(const marker of ['Cross-Origin-Resource-Policy "same-origin"','X-Permitted-Cross-Domain-Policies "none"'])if(!nginx.includes(marker))fail(`web header ${marker}`);
if(nginx.includes('Strict-Transport-Security'))fail('HSTS must not be emitted by local HTTP staging');

const secretPatterns=[
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /gh[opsu]_[A-Za-z0-9]{30,}/,
  /sk-[A-Za-z0-9_-]{32,}/
];
const scanRoots=['client','developer/src','agent','infra','scripts/productization'];
let scanned=0;
function walk(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const full=path.join(directory,entry.name);
    if(entry.isDirectory()){walk(full);continue;}
    if(!/\.(?:mjs|js|json|ya?ml|md|html|css|sql|example)$/.test(entry.name))continue;
    const content=fs.readFileSync(full,'utf8');scanned++;
    for(const pattern of secretPatterns)if(pattern.test(content))fail(`secret pattern ${path.relative(root,full)}`);
  }
}
for(const relative of scanRoots)walk(path.join(root,relative));

const evidence=json('docs/productization/evidence/PHASE_24_SECURITY_QA.json');
if(evidence.status!=='AUTO_QA_PASS_LOCAL_SECURITY'||evidence.npm_audit.vulnerabilities.total!==0||evidence.secret_scan.findings!==0)fail('evidence status');
if(evidence.integration.security_boundary!=='1/1 PASS'||evidence.integration.postgresql_regression!=='15/15 PASS')fail('integration evidence');
if(evidence.external_security.performed!==false||evidence.external_security.status!=='BLOCKED_EXTERNAL_CONFIGURATION')fail('external boundary');

console.log('PHASE24_SECURITY_STATIC_PASS');
console.log('token_boundaries=PASS');
console.log('request_boundaries=PASS');
console.log('web_api_headers=PASS');
console.log(`secret_files_scanned=${scanned}`);
console.log('known_vulnerabilities=0');
