import fs from 'node:fs';
import path from 'node:path';
import {APPLICATION_TASK_BANK,assertApplicationTaskBank} from './formula-application-task-bank.mjs';
import {APPLICATION_LOCALES,localizeApplicationTask} from './formula-application-locales.mjs';

const root=process.cwd();
const formulas=JSON.parse(fs.readFileSync(path.join(root,'infra/database/catalog/k12-formulas.ko.json'),'utf8'));
const legacy=JSON.parse(fs.readFileSync(path.join(root,'infra/database/catalog/formula-application-cases.ko.json'),'utf8'));
assertApplicationTaskBank(formulas.items);
const legacyKeys=new Set(legacy.items.map((item)=>item.formula_semantic_key));
const output=path.join(root,'infra/database/seeds/0007_formula_application_i18n.sql');
const quote=(value)=>`'${String(value).replaceAll("'","''")}'`;
const json=(value)=>`${quote(JSON.stringify(value))}::jsonb`;
const uuidSql=(value)=>{const q=quote(value);return `(substr(md5(${q}),1,8)||'-'||substr(md5(${q}),9,4)||'-5'||substr(md5(${q}),14,3)||'-8'||substr(md5(${q}),18,3)||'-'||substr(md5(${q}),21,12))::uuid`;};
const itemRows=[];
const translationRows=new Map(APPLICATION_LOCALES.map((locale)=>[locale,[]]));

for(const formula of formulas.items){
  const tasks=APPLICATION_TASK_BANK[formula.semantic_key];
  tasks.forEach((task,index)=>{
    const itemId=uuidSql(`${formula.semantic_key}:application:${index+1}:v1`);
    const answerSchema={accepted_values:task.accepted_values,...(task.accepted_units?{accepted_units:task.accepted_units}:{})};
    const ko=localizeApplicationTask(task,'ko');
    itemRows.push(`  (${itemId},${uuidSql(formula.semantic_key)},${index+1},${quote(task.kind)},${quote(ko.prompt)},${quote(task.response_type)},${json(answerSchema)},${json(task.misconceptions)},${task.difficulty},${task.accepted_units?.length?'true':'false'})`);
    for(const locale of APPLICATION_LOCALES){
      const localized=localizeApplicationTask(task,locale);
      translationRows.get(locale).push(`  (${itemId},${quote(locale)},${quote(localized.prompt)},${quote(localized.value_label)},${quote(localized.unit_label)})`);
    }
  });
}

const sql=['BEGIN;','',
  'INSERT INTO mathchakchak.formula_application_item',
  '  (id,formula_catalog_id,sequence_no,assessment_kind,prompt_ko,response_type,answer_schema,misconception_rules,difficulty,unit_required)',
  'VALUES',itemRows.join(',\n'),
  'ON CONFLICT (formula_catalog_id,sequence_no,content_version) DO UPDATE SET',
  '  assessment_kind=EXCLUDED.assessment_kind,prompt_ko=EXCLUDED.prompt_ko,response_type=EXCLUDED.response_type,',
  '  answer_schema=EXCLUDED.answer_schema,misconception_rules=EXCLUDED.misconception_rules,',
  '  difficulty=EXCLUDED.difficulty,unit_required=EXCLUDED.unit_required,active=true;',''];
for(const locale of APPLICATION_LOCALES){
  sql.push('INSERT INTO mathchakchak.formula_application_item_translation',
    '  (application_item_id,locale,prompt,value_label,unit_label)','VALUES',translationRows.get(locale).join(',\n'),
    'ON CONFLICT (application_item_id,locale) DO UPDATE SET',
    '  prompt=EXCLUDED.prompt,value_label=EXCLUDED.value_label,unit_label=EXCLUDED.unit_label,updated_at=now();','');
}
sql.push('COMMIT;','');
fs.writeFileSync(output,sql.join('\n'),'utf8');
console.log('FORMULA_APPLICATION_I18N_SEED_GENERATED');
console.log(`formulas=${formulas.items.length}`);
console.log(`legacy_formulas=${legacyKeys.size}`);
console.log(`expanded_formulas=${formulas.items.length-legacyKeys.size}`);
console.log(`items=${itemRows.length}`);
console.log(`translations=${[...translationRows.values()].reduce((sum,rows)=>sum+rows.length,0)}`);
