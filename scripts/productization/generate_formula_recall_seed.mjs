import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const catalog=JSON.parse(fs.readFileSync(path.join(root,'infra/database/catalog/k12-formulas.ko.json'),'utf8'));
const output=path.join(root,'infra/database/seeds/0005_formula_recall_checks.sql');
const quote=(value)=>`'${String(value).replaceAll("'","''")}'`;
const json=(value)=>`${quote(JSON.stringify(value))}::jsonb`;
const uuidSql=(expression)=>`(substr(md5(${expression}),1,8)||'-'||substr(md5(${expression}),9,4)||'-5'||substr(md5(${expression}),14,3)||'-8'||substr(md5(${expression}),18,3)||'-'||substr(md5(${expression}),21,12))::uuid`;
const byGrade=new Map();
for(const item of catalog.items){if(!byGrade.has(item.grade_code))byGrade.set(item.grade_code,[]);byGrade.get(item.grade_code).push(item);}
const rows=[];
for(const items of byGrade.values())for(let index=0;index<items.length;index++){
  const item=items[index];
  const base=[0,1,2,3].map((offset)=>items[(index+offset)%items.length]).map((choice)=>({value:choice.semantic_key,label:choice.notation}));
  const rotation=index%4;const choices=[...base.slice(rotation),...base.slice(0,rotation)];
  const prompt=`‘${item.title_ko}’의 핵심 관계로 알맞은 표현을 고르세요.`;
  rows.push(`  (${uuidSql(quote(`${item.semantic_key}:recall:v1`))},${uuidSql(quote(item.semantic_key))},${quote(prompt)},${json(choices)},${json({correct:{value:item.semantic_key}})})`);
}
const sql=['BEGIN;','','INSERT INTO mathchakchak.formula_recall_item','  (id,formula_catalog_id,prompt_ko,choices,answer_schema)','VALUES',rows.join(',\n')+';','','COMMIT;',''].join('\n');
fs.writeFileSync(output,sql,'utf8');
console.log('FORMULA_RECALL_SEED_GENERATED');
console.log(`items=${rows.length}`);console.log(`grades=${byGrade.size}`);
