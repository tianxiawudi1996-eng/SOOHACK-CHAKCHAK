import fs from 'node:fs';
import path from 'node:path';
import {evaluatePerformance,PERFORMANCE_BUDGET} from './performance_budget.mjs';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const fail=(message)=>{throw new Error(`PHASE23_PERFORMANCE_FAIL: ${message}`);};

const pages=['client/mock/index.html','client/diagnostic/index.html','client/math-learning/index.html','client/curriculum/index.html'];
for(const page of pages){
  const html=read(page);
  if(!html.includes('rel="modulepreload"')||!html.includes('app.js?v=0.1.0-phase22'))fail(`module preload ${page}`);
}

const curriculumHtml=read('client/curriculum/index.html');
const curriculumCss=read('client/curriculum/styles.css');
if(!curriculumHtml.includes('class="grade-summary-slot"'))fail('curriculum summary reservation');
if(!/\.hero\{[^}]*min-height:390px/.test(curriculumCss)||!/\.grade-groups\{[^}]*min-height:190px/.test(curriculumCss)||!/min-height:560px/.test(curriculumCss)||!/\.grade-summary-slot\{min-height:96px/.test(curriculumCss))fail('curriculum layout reservation');

const nginx=read('infra/deployment/nginx.staging.conf');
for(const contract of ['gzip on;','gzip_vary on;','gzip_min_length 1024;','expires 1y;','expires 7d;'])if(!nginx.includes(contract))fail(`nginx ${contract}`);
if(!nginx.includes('application/javascript')||!nginx.includes('application/json'))fail('nginx compression types');
if(!read('scripts/productization/build_staging.mjs').includes(".replace('href=\"app.js?v=', 'href=\"assets/app.js?v='"))fail('landing preload artifact path');

const manifest=JSON.parse(read('artifacts/staging/v0.1.0/manifest.json'));
const total=manifest.files.reduce((sum,file)=>sum+file.bytes,0);
const largest=Math.max(...manifest.files.map((file)=>file.bytes));
if(total>PERFORMANCE_BUDGET.transferBytesMax)fail(`artifact total ${total}`);
if(largest>PERFORMANCE_BUDGET.singleAssetBytesMax)fail(`single asset ${largest}`);

for(const required of [
  'docs/developer/productization/PERFORMANCE_ENGINEERING_v1.0.md',
  'docs/productization/prompts/PHASE_23_PERFORMANCE_METAPROMPT_v1.0.md',
  'docs/productization/reports/PHASE_23_PERFORMANCE_REPORT.md',
  'docs/productization/evidence/PHASE_23_PERFORMANCE_QA.json',
])if(!fs.existsSync(path.join(root,required)))fail(`missing ${required}`);

const evidence=JSON.parse(read('docs/productization/evidence/PHASE_23_PERFORMANCE_QA.json'));
const final=evidence.final_median;
const evaluation=evaluatePerformance({
  performanceScore:final.performance_score,
  accessibilityScore:final.accessibility_score,
  bestPracticesScore:final.best_practices_score,
  fcp:final.fcp_ms,
  lcp:final.lcp_ms,
  tbt:final.tbt_ms,
  cls:final.cls,
  speedIndex:final.speed_index_ms,
  transferBytes:final.transfer_bytes,
});
if(evidence.status!=='AUTO_QA_PASS_LOCAL_LAB'||!evaluation.pass||evidence.tooling.field_data_used!==false||evidence.tooling.inp_measured!==false)fail('performance evidence');

console.log('PHASE23_PERFORMANCE_STATIC_PASS');
console.log(`pages=${pages.length}/${pages.length}`);
console.log(`artifact_files=${manifest.file_count}`);
console.log(`artifact_total_bytes=${total}`);
console.log(`largest_asset_bytes=${largest}`);
console.log('compression_cache_contracts=PASS');
