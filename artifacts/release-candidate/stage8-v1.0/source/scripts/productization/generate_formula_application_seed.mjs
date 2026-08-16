import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const cases=JSON.parse(fs.readFileSync(path.join(root,'infra/database/catalog/formula-application-cases.ko.json'),'utf8'));
const formulas=JSON.parse(fs.readFileSync(path.join(root,'infra/database/catalog/k12-formulas.ko.json'),'utf8'));
const output=path.join(root,'infra/database/seeds/0006_formula_application_checks.sql');
const formulaKeys=new Set(formulas.items.map((item)=>item.semantic_key));
const quote=(value)=>`'${String(value).replaceAll("'","''")}'`;
const json=(value)=>`${quote(JSON.stringify(value))}::jsonb`;
const uuidSql=(value)=>{const q=quote(value);return `(substr(md5(${q}),1,8)||'-'||substr(md5(${q}),9,4)||'-5'||substr(md5(${q}),14,3)||'-8'||substr(md5(${q}),18,3)||'-'||substr(md5(${q}),21,12))::uuid`;};
const rows=[];
for(const entry of cases.items){
  if(!formulaKeys.has(entry.formula_semantic_key))throw new Error(`UNKNOWN_FORMULA:${entry.formula_semantic_key}`);
  if(entry.tasks.length!==3)throw new Error(`TASK_COUNT:${entry.grade_code}`);
  entry.tasks.forEach((task,index)=>{
    const answerSchema={accepted_values:task.accepted_values,...(task.accepted_units?{accepted_units:task.accepted_units}:{})};
    rows.push(`  (${uuidSql(`${entry.formula_semantic_key}:application:${index+1}:v1`)},${uuidSql(entry.formula_semantic_key)},${index+1},${quote(task.kind)},${quote(task.prompt)},${quote(task.response_type)},${json(answerSchema)},${json(task.misconceptions??[])},${task.difficulty})`);
  });
}
if(cases.items.length!==12||rows.length!==36)throw new Error('APPLICATION_COVERAGE');
const sql=['BEGIN;','','INSERT INTO mathchakchak.formula_application_item','  (id,formula_catalog_id,sequence_no,assessment_kind,prompt_ko,response_type,answer_schema,misconception_rules,difficulty)','VALUES',rows.join(',\n')+';','','COMMIT;',''].join('\n');
fs.writeFileSync(output,sql,'utf8');
console.log('FORMULA_APPLICATION_SEED_GENERATED');
console.log(`grades=${cases.items.length}`);
console.log(`items=${rows.length}`);
