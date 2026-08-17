import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`PRESENTATION_METADATA_FAIL: ${message}`); process.exit(1); };
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const presentationPages = [
  'mock.html',
  'client/mock/index.html',
  'docs/stage8/evidence/2d-pet/v1.0/review/index.html',
  'docs/stage8/evidence/2d-pet/v1.0/gate3-review/index.html',
  'docs/stage8/evidence/2d-pet/v1.0/gate4-review/index.html',
  'docs/stage8/evidence/2d-pet/v1.0/gate5-review/index.html'
];
const forbidden = [
  /<meta\s+name="description"/i,
  /자동\s*QA/i,
  /Gate\s+[2-5]/i,
  /\b(?:VERIFIED|NOT_VERIFIED|PENDING|BLOCKED_EXTERNAL)\b/i,
  /\bEVT-\d{3}\b/i,
  /\bBUB-[A-Z]+-\d+\b/i,
  /transparent PNG/i,
  /productization[^<\n]*mock/i,
  /제품화\s*콘셉트\s*검증을\s*위한\s*목업/i,
  /상태\s*프로필/i,
  /캐릭터\s*리듬\s*차이/i,
  /허용\s*속성/i,
  /수동\s*검토\s*항목/i,
  /개발자용/i,
  /디버그/i,
  /data-ai-bubble-meta/i
];
for (const page of presentationPages) {
  const html = read(page);
  for (const pattern of forbidden) if (pattern.test(html)) fail(`${page} contains ${pattern}`);
  if (!html.includes('<meta charset="utf-8"') || !html.includes('name="viewport"')) {
    fail(`${page} lost functional charset or viewport metadata`);
  }
}
for (const locale of ['ko','zh-CN','ja','en','es','fr','it','ru']) {
  const messages = JSON.parse(read(`client/i18n/messages/${locale}.json`));
  if ('footer.note' in messages) fail(`unused mock footer metadata remains in ${locale}`);
}

const imageRoots = [
  path.join(root, 'outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0'),
  path.join(root, 'docs/stage8/evidence/2d-pet/v1.0/review')
];
const images = new Set();
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(?:png|webp)$/i.test(entry.name)) images.add(absolute);
  }
};
for (const imageRoot of imageRoots) walk(imageRoot);

for (const image of images) {
  const bytes = fs.readFileSync(image);
  if (/\.png$/i.test(image)) {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const size = bytes.readUInt32BE(offset);
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      if (!['IHDR','IDAT','IEND'].includes(type)) {
        fail(`PNG metadata chunk ${type} in ${path.relative(root,image)}`);
      }
      offset += 12 + size;
    }
  } else {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = bytes.toString('ascii', offset, offset + 4);
      const size = bytes.readUInt32LE(offset + 4);
      if (['EXIF','XMP ','ICCP','ANIM','ANMF'].includes(type)) {
        fail(`WebP metadata chunk ${type} in ${path.relative(root,image)}`);
      }
      offset += 8 + size + (size & 1);
    }
  }
}

console.log('PRESENTATION_METADATA_PASS');
console.log(`html_pages=${presentationPages.length}/${presentationPages.length}`);
console.log(`concept_art_images=${images.size}/${images.size}`);
console.log('development_labels=0');
console.log('embedded_metadata=0');
