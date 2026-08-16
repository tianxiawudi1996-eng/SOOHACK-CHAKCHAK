import fs from 'node:fs';
import path from 'node:path';
import {CRITICAL_CONTRAST_PAIRS,contrastRatio} from './accessibility_contrast.mjs';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(message)=>{console.error(`ACCESSIBILITY_INTERACTION_FAIL: ${message}`);process.exit(1);};
const surfaces={
  landing:['client/mock/index.html','client/mock/app.js'],
  diagnostic:['client/diagnostic/index.html','client/diagnostic/app.js'],
  lesson:['client/math-learning/index.html','client/math-learning/app.js'],
  curriculum:['client/curriculum/index.html','client/curriculum/app.js']
};

for(const [name,[htmlFile]] of Object.entries(surfaces)){
  const html=read(htmlFile);
  if(!/class="skip-link"/.test(html)||!/<main[^>]+tabindex="-1"/.test(html))fail(`skip target ${name}`);
  if(!html.includes('../accessibility/interaction.css'))fail(`interaction stylesheet ${name}`);
  if(!read(surfaces[name][1]).includes('installSkipLinkFocus'))fail(`skip focus runtime ${name}`);
  if(/tabindex="[1-9]/.test(html)||/\sautofocus(?:\s|>)/.test(html))fail(`unsafe tab order ${name}`);
}

const requiredTargets={
  diagnostic:['id="questionPrompt" tabindex="-1"','id="resultTitle" tabindex="-1"'],
  lesson:['id="stepPrompt" tabindex="-1"','id="completeTitle" tabindex="-1"'],
  curriculum:['id="collabTitle" tabindex="-1"','id="activityTitle" tabindex="-1"','id="recallTitle" tabindex="-1"']
};
for(const [name,tokens] of Object.entries(requiredTargets))for(const token of tokens)if(!read(surfaces[name][0]).includes(token))fail(`focus target ${name} ${token}`);

const focusCounts={diagnostic:2,lesson:2,curriculum:2};
for(const [name,count] of Object.entries(focusCounts)){
  const matches=read(surfaces[name][1]).match(/\.focus\(\{preventScroll:true\}\)/g)??[];
  if(matches.length<count)fail(`focus management ${name} ${matches.length}/${count}`);
}

const css=read('client/accessibility/interaction.css');
for(const token of [':focus-visible','outline: 3px solid','[tabindex="-1"]:focus','prefers-reduced-motion'])if(!css.includes(token))fail(`css ${token}`);
if(/outline:\s*none/.test(css))fail('focus outline suppressed');
for(const pair of CRITICAL_CONTRAST_PAIRS){const ratio=contrastRatio(pair.foreground,pair.background);if(ratio<pair.minimum)fail(`contrast ${pair.name} ${ratio.toFixed(2)}`);}

for(const token of ['role="status"','aria-live="polite"'])if(!Object.values(surfaces).some(([html])=>read(html).includes(token)))fail(`live status ${token}`);
const build=read('scripts/productization/build_staging.mjs');
if(!build.includes("'accessibility'")||!build.includes('client/accessibility/interaction.css')||!build.includes('client/accessibility/interaction.mjs'))fail('staging accessibility runtime');

const review=JSON.parse(read('docs/productization/reviews/phase22/manifest.json'));
if(review.phase!==22||review.status!=='READY_FOR_MANUAL_ACCESSIBILITY_REVIEW'||review.manual_approvals!=='0/1'||review.human_approval_inferred!==false||review.urls.length!==4)fail('manual review manifest');
for(const doc of ['docs/developer/productization/ACCESSIBILITY_INTERACTION_DESIGN_v1.0.md','docs/productization/prompts/PHASE_22_ACCESSIBILITY_INTERACTION_METAPROMPT_v1.0.md']){
  for(const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering'])if(!read(doc).includes(section))fail(`doc section ${doc} ${section}`);
}
console.log('ACCESSIBILITY_INTERACTION_STATIC_PASS');
console.log('surfaces=4/4');
console.log('keyboard_focus_contracts=4/4');
console.log(`contrast_pairs=${CRITICAL_CONTRAST_PAIRS.length}/${CRITICAL_CONTRAST_PAIRS.length}`);
console.log('manual_accessibility_approvals=0/1');
