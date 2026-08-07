import fs from 'node:fs';
import path from 'node:path';
import {ACCESSIBILITY_LOCALES,ACCESSIBILITY_MESSAGES,assertAccessibilityMessages} from '../../client/i18n/accessibility.mjs';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(message)=>{console.error(`ACCESSIBILITY_I18N_FAIL: ${message}`);process.exit(1);};
try{assertAccessibilityMessages();}catch(error){fail(error.message);}
const expectedKeys=Object.keys(ACCESSIBILITY_MESSAGES.en);
if(ACCESSIBILITY_LOCALES.length!==8||expectedKeys.length!==31)fail('coverage contract');
for(const locale of ACCESSIBILITY_LOCALES){
  if(Object.keys(ACCESSIBILITY_MESSAGES[locale]).length!==31)fail(`key count ${locale}`);
  if(locale!=='ko'&&/[\uAC00-\uD7A3]/u.test(Object.values(ACCESSIBILITY_MESSAGES[locale]).join(' ')))fail(`Hangul ${locale}`);
}

const surfaces={
  landing:['client/mock/index.html','client/mock/app.js'],
  diagnostic:['client/diagnostic/index.html','client/diagnostic/app.js'],
  lesson:['client/math-learning/index.html','client/math-learning/app.js'],
  curriculum:['client/curriculum/index.html','client/curriculum/app.js']
};
for(const [surface,[htmlFile,appFile]] of Object.entries(surfaces)){
  const html=read(htmlFile);const app=read(appFile);
  if(!html.includes('data-a11y-')||!app.includes('accessibilityMessage'))fail(`runtime wiring ${surface}`);
  if(/aria-label="(?:Language|Grade selection|Primary navigation|Product highlights|Weekly progress report|one half)/.test(html))fail(`hardcoded aria ${surface}`);
}
for(const token of ['role="progressbar"','aria-valuenow']){
  if(!read('client/diagnostic/index.html').includes(token)||!read('client/math-learning/index.html').includes(token))fail(`progress semantics ${token}`);
}
const build=read('scripts/productization/build_staging.mjs');
if(!build.includes("'i18n'")||!build.includes('client/i18n/accessibility.mjs'))fail('staging accessibility runtime copy');

const manifest=JSON.parse(read('docs/productization/reviews/phase21/manifest.json'));
if(manifest.phase!==21||manifest.packet_count!==7||manifest.packets.length!==7||manifest.manual_approvals!=='0/7'||manifest.human_approval_inferred!==false||manifest.status!=='READY_FOR_HUMAN_REVIEW')fail('manual review manifest');
for(const packet of manifest.packets){
  if(packet.status!=='PENDING_HUMAN_REVIEW'||packet.decision!==null||packet.reviewer_identity_reference!==null||packet.urls.length!==4||!fs.existsSync(path.join(root,packet.path)))fail(`packet ${packet.locale}`);
}
for(const doc of ['docs/developer/productization/ACCESSIBILITY_I18N_DESIGN_v1.0.md','docs/productization/prompts/PHASE_21_ACCESSIBILITY_I18N_METAPROMPT_v1.0.md']){
  for(const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering'])if(!read(doc).includes(section))fail(`doc section ${doc} ${section}`);
}
console.log('ACCESSIBILITY_I18N_STATIC_PASS');
console.log('surfaces=4/4');
console.log('locales=8/8');
console.log('accessibility_keys=31/31');
console.log('review_packets=7/7');
console.log('manual_approvals=0/7');
