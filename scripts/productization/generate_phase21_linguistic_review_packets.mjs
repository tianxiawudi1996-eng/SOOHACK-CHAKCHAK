import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const outputRoot=path.join(root,'docs/productization/reviews/phase21');
const locales=[
  ['zh-CN','Chinese (Simplified)'],['ja','Japanese'],['en','English'],['es','Spanish'],
  ['fr','French'],['it','Italian'],['ru','Russian']
];
const sourceFiles=[
  'client/i18n/accessibility.mjs',
  ...['ko','zh-CN','ja','en','es','fr','it','ru'].map((locale)=>`client/i18n/messages/${locale}.json`),
  'client/diagnostic/messages.mjs','client/math-learning/messages.mjs','client/curriculum/messages.mjs',
  'scripts/productization/formula-catalog-locales.mjs','scripts/productization/curriculum-runtime-locales.mjs'
];
const digest=crypto.createHash('sha256');
for(const file of sourceFiles)digest.update(`${file}\0${fs.readFileSync(path.join(root,file))}\0`);
const sourceDigest=digest.digest('hex');
const packageId=`phase21-linguistic-review-${sourceDigest.slice(0,12)}`;
fs.mkdirSync(outputRoot,{recursive:true});

const packets=[];
for(const [locale,language] of locales){
  const packetId=`${packageId}-${locale.toLowerCase()}`;
  const relative=`docs/productization/reviews/phase21/${locale}.md`;
  const urls=[
    `http://127.0.0.1:4180/?locale=${locale}`,
    `http://127.0.0.1:4180/diagnostic/?locale=${locale}`,
    `http://127.0.0.1:4180/math-learning/?locale=${locale}`,
    `http://127.0.0.1:4180/curriculum/?locale=${locale}`
  ];
  const markdown=`# MathChakChak Phase 21 — ${language} linguistic review packet\n\n`+
`- Packet ID: \`${packetId}\`\n- Locale: \`${locale}\`\n- Source digest: \`${sourceDigest}\`\n- Status: \`PENDING_HUMAN_REVIEW\`\n\n`+
`## Fixed review URLs\n\n${urls.map((url)=>`- ${url}`).join('\n')}\n\n`+
`## Review checklist\n\n- [ ] Visible text uses the selected language without Korean or unintended English fallback prose.\n- [ ] Skip links, language selectors, navigation regions, progress indicators, image alternatives, and learning regions have natural accessible names.\n- [ ] Mathematical terminology is correct and age-appropriate for Grades 1–12.\n- [ ] Chakchaki and Gongsickyi remain friendly, accurate, patient, and do not reveal answers directly.\n- [ ] Grade, curriculum source, formula explanation, recall, application, and five collaboration phases preserve the intended meaning.\n- [ ] Truncation, mojibake, mixed-language punctuation, or culturally awkward expressions are listed as patches.\n\n`+
`## Required return fields\n\n- Reviewer identity reference:\n- Decision: \`APPROVE | APPROVE_WITH_PATCH | REJECT\`\n- Reviewed at (ISO-8601 with timezone):\n- Comment:\n- Patch IDs:\n- Unresolved patch: \`true | false\`\n\n`+
`Automatic QA does not fill these fields and does not count as linguistic approval.\n`;
  fs.writeFileSync(path.join(root,relative),markdown,'utf8');
  packets.push({packet_id:packetId,locale,language,path:relative,status:'PENDING_HUMAN_REVIEW',decision:null,reviewer_identity_reference:null,reviewed_at:null,patch_ids:[],unresolved_patch:null,urls});
}

const manifest={schema_version:'1.0.0',phase:21,package_id:packageId,source_digest_sha256:sourceDigest,source_files:sourceFiles,packet_count:7,manual_approvals:'0/7',status:'READY_FOR_HUMAN_REVIEW',human_approval_inferred:false,packets};
fs.writeFileSync(path.join(outputRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
console.log('PHASE21_LINGUISTIC_REVIEW_PACKETS_GENERATED');
console.log(`package_id=${packageId}`);
console.log('packets=7/7');
console.log('manual_approvals=0/7');
