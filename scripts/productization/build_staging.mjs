import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const release = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const artifactRoot = path.resolve(root, 'artifacts', 'staging', `v${release}`);
const allowedRoot = path.resolve(root, 'artifacts', 'staging') + path.sep;
if (!artifactRoot.startsWith(allowedRoot)) throw new Error('UNSAFE_ARTIFACT_PATH');

fs.rmSync(artifactRoot, {recursive:true, force:true});
const site = path.join(artifactRoot, 'site');
for (const directory of ['accessibility', 'assets', 'assets/characters', 'i18n', 'locales', 'diagnostic', 'math-learning', 'curriculum']) fs.mkdirSync(path.join(site, directory), {recursive:true});

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
let html = read('client/mock/index.html')
  .replace('../design/tokens.css', 'assets/tokens.css')
  .replace('../accessibility/interaction.css', 'accessibility/interaction.css')
  .replace('href="styles.css"', 'href="assets/styles.css"')
  .replace('src="app.js', 'src="assets/app.js')
  .replace('../../outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Chakchaki/chakchaki_p03_guide_v1.0.webp', 'assets/characters/chakchaki-guide.webp')
  .replace('../../outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Gongsickyi/gongsickyi_p05_praise-progress_v1.0.webp', 'assets/characters/gongsickyi-praise.webp')
  .replaceAll('../diagnostic/index.html', 'diagnostic/index.html')
  .replaceAll('../curriculum/index.html', 'curriculum/index.html');
const app = read('client/mock/app.js').replace('../i18n/messages/', '../locales/');
fs.writeFileSync(path.join(site, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(site, 'assets', 'app.js'), app, 'utf8');
fs.copyFileSync(path.join(root, 'client/design/tokens.css'), path.join(site, 'assets/tokens.css'));
fs.copyFileSync(path.join(root, 'client/mock/styles.css'), path.join(site, 'assets/styles.css'));
fs.copyFileSync(path.join(root, 'client/accessibility/interaction.css'), path.join(site, 'accessibility/interaction.css'));

const lessonHtml = read('client/math-learning/index.html')
  .replace('../design/tokens.css', '../assets/tokens.css')
  .replaceAll('../mock/index.html', '../index.html')
  .replace('../../outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Chakchaki/chakchaki_p03_guide_v1.0.webp', '../assets/characters/chakchaki-guide.webp')
  .replace('../../outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Gongsickyi/gongsickyi_p05_praise-progress_v1.0.webp', '../assets/characters/gongsickyi-praise.webp');
fs.writeFileSync(path.join(site, 'math-learning', 'index.html'), lessonHtml, 'utf8');
for (const file of ['app.js','model.mjs','messages.mjs','styles.css']) {
  fs.copyFileSync(path.join(root, 'client/math-learning', file), path.join(site, 'math-learning', file));
}

const diagnosticHtml = read('client/diagnostic/index.html')
  .replace('../design/tokens.css', '../assets/tokens.css')
  .replaceAll('../mock/index.html', '../index.html')
  .replace('../../outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Chakchaki/chakchaki_p03_guide_v1.0.webp', '../assets/characters/chakchaki-guide.webp')
  .replace('../../outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Gongsickyi/gongsickyi_p05_praise-progress_v1.0.webp', '../assets/characters/gongsickyi-praise.webp');
fs.writeFileSync(path.join(site, 'diagnostic', 'index.html'), diagnosticHtml, 'utf8');
for (const file of ['app.js','model.mjs','messages.mjs','styles.css']) {
  fs.copyFileSync(path.join(root, 'client/diagnostic', file), path.join(site, 'diagnostic', file));
}

const curriculumHtml = read('client/curriculum/index.html')
  .replace('../design/tokens.css', '../assets/tokens.css')
  .replaceAll('../mock/index.html', '../index.html')
  .replace('../../outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Chakchaki/chakchaki_p03_guide_v1.0.webp', '../assets/characters/chakchaki-guide.webp')
  .replace('../../outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Gongsickyi/gongsickyi_p05_praise-progress_v1.0.webp', '../assets/characters/gongsickyi-praise.webp');
fs.writeFileSync(path.join(site, 'curriculum', 'index.html'), curriculumHtml, 'utf8');
for (const file of ['app.js','model.mjs','messages.mjs','styles.css']) {
  fs.copyFileSync(path.join(root, 'client/curriculum', file), path.join(site, 'curriculum', file));
}

for (const locale of ['ko','zh-CN','ja','en','es','fr','it','ru']) {
  fs.copyFileSync(path.join(root, 'client/i18n/messages', `${locale}.json`), path.join(site, 'locales', `${locale}.json`));
}
fs.copyFileSync(path.join(root, 'client/i18n/accessibility.mjs'), path.join(site, 'i18n/accessibility.mjs'));
fs.copyFileSync(path.join(root, 'client/accessibility/interaction.mjs'), path.join(site, 'accessibility/interaction.mjs'));
fs.copyFileSync(path.join(root, 'outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Chakchaki/chakchaki_p03_guide_v1.0.webp'), path.join(site, 'assets/characters/chakchaki-guide.webp'));
fs.copyFileSync(path.join(root, 'outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/webp/Gongsickyi/gongsickyi_p05_praise-progress_v1.0.webp'), path.join(site, 'assets/characters/gongsickyi-praise.webp'));

const files = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else {
      const bytes = fs.readFileSync(absolute);
      files.push({path:path.relative(artifactRoot, absolute).split(path.sep).join('/'),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
    }
  }
};
walk(site);
const manifest = {
  schema_version:'1.0.0', project:'MathChakChak', release, environment:'staging',
  artifact_scope:'FRONTEND_PREVIEW', supported_locales:['ko','zh-CN','ja','en','es','fr','it','ru'],
  approved_character_assets:2, files, file_count:files.length,
  external_deployment:{performed:false,url:null,deployment_id:null},
  feature_flags:{gate5_ai_pet_behavior:true,production_traffic:false}
};
fs.writeFileSync(path.join(artifactRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('STAGING_BUILD_CREATED');
console.log(`release=${release}`);
console.log(`files=${files.length}`);
console.log(`artifact=${path.relative(root, artifactRoot).split(path.sep).join('/')}`);
