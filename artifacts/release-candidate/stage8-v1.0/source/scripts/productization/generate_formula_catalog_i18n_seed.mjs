import fs from 'node:fs';
import path from 'node:path';
import {FORMULA_CONTENT_LOCALES,assertFormulaTitleTranslations,localizeFormulaContent} from './formula-catalog-locales.mjs';

const root=process.cwd();
const catalog=JSON.parse(fs.readFileSync(path.join(root,'infra/database/catalog/k12-formulas.ko.json'),'utf8'));
assertFormulaTitleTranslations(catalog.items);
const output=path.join(root,'infra/database/seeds/0008_formula_catalog_i18n.sql');
const quote=(value)=>`'${String(value).replaceAll("'","''")}'`;
const json=(value)=>`${quote(JSON.stringify(value))}::jsonb`;
const uuidSql=(value)=>{const q=quote(value);return `(substr(md5(${q}),1,8)||'-'||substr(md5(${q}),9,4)||'-5'||substr(md5(${q}),14,3)||'-8'||substr(md5(${q}),18,3)||'-'||substr(md5(${q}),21,12))::uuid`;};
const rowsByLocale=new Map(FORMULA_CONTENT_LOCALES.filter((locale)=>locale!=='ko').map((locale)=>[locale,[]]));

for(const formula of catalog.items){
  for(const locale of rowsByLocale.keys()){
    const content=localizeFormulaContent(formula,locale);
    rowsByLocale.get(locale).push(`  (${uuidSql(`${formula.semantic_key}:${locale}:v1`)},${uuidSql(formula.semantic_key)},1,${quote(locale)},${quote(content.title)},${quote(content.display_notation)},${quote(content.explanation)},${quote(content.recall_prompt)},${json(content.derivation_steps)},${json(content.misconception_notes)},${quote(content.chakchaki_strategy)},${quote(content.gongsickyi_strategy)},'TRANSLATION_REVIEW_REQUIRED')`);
  }
}

const sql=['BEGIN;','',
  `UPDATE mathchakchak.formula_explanation_revision fer SET title=gfc.title_ko,display_notation=gfc.notation,recall_prompt='‘' || gfc.title_ko || '’의 핵심 관계로 알맞은 표현을 고르세요.' FROM mathchakchak.grade_formula_catalog gfc WHERE gfc.id=fer.formula_catalog_id AND fer.locale='ko';`,''
];
for(const [locale,rows] of rowsByLocale){
  sql.push('INSERT INTO mathchakchak.formula_explanation_revision',
    '  (id,formula_catalog_id,revision_no,locale,title,display_notation,explanation,recall_prompt,derivation_steps,misconception_notes,chakchaki_strategy,gongsickyi_strategy,verification_status)',
    'VALUES',rows.join(',\n'),
    'ON CONFLICT (formula_catalog_id,revision_no,locale) DO UPDATE SET',
    '  title=EXCLUDED.title,display_notation=EXCLUDED.display_notation,explanation=EXCLUDED.explanation,recall_prompt=EXCLUDED.recall_prompt,',
    '  derivation_steps=EXCLUDED.derivation_steps,misconception_notes=EXCLUDED.misconception_notes,',
    '  chakchaki_strategy=EXCLUDED.chakchaki_strategy,gongsickyi_strategy=EXCLUDED.gongsickyi_strategy,',
    "  verification_status='TRANSLATION_REVIEW_REQUIRED';",'');
}
sql.push('ALTER TABLE mathchakchak.formula_explanation_revision',
  '  ALTER COLUMN title SET NOT NULL,',
  '  ALTER COLUMN display_notation SET NOT NULL,',
  '  ALTER COLUMN recall_prompt SET NOT NULL;','',
  'COMMIT;','');
fs.writeFileSync(output,sql.join('\n'),'utf8');
console.log('FORMULA_CATALOG_I18N_SEED_GENERATED');
console.log(`formulas=${catalog.items.length}`);
console.log(`translated_locales=${rowsByLocale.size}`);
console.log(`translated_rows=${[...rowsByLocale.values()].reduce((sum,rows)=>sum+rows.length,0)}`);
