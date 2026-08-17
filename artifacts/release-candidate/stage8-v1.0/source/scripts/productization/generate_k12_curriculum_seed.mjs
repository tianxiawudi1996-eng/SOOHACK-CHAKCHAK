import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const catalog=JSON.parse(fs.readFileSync(path.join(root,'infra/database/catalog/k12-formulas.ko.json'),'utf8'));
const output=path.join(root,'infra/database/seeds/0004_k12_curriculum_catalog.sql');
const quote=(value)=>`'${String(value).replaceAll("'","''")}'`;
const nullable=(value)=>value===null||value===undefined?'NULL':quote(value);
const json=(value)=>`${quote(JSON.stringify(value))}::jsonb`;
const uuidSql=(expression)=>`(substr(md5(${expression}),1,8)||'-'||substr(md5(${expression}),9,4)||'-5'||substr(md5(${expression}),14,3)||'-8'||substr(md5(${expression}),18,3)||'-'||substr(md5(${expression}),21,12))::uuid`;
const referenceId='e2022330-0000-4000-8000-000000000008';

const gradeRows=[
  ['E1','ELEMENTARY',1,'초등학교 1학년','초등학교 1~2학년',2024,['초등학교 수학'],1],
  ['E2','ELEMENTARY',2,'초등학교 2학년','초등학교 1~2학년',2024,['초등학교 수학'],2],
  ['E3','ELEMENTARY',3,'초등학교 3학년','초등학교 3~4학년',2025,['초등학교 수학'],3],
  ['E4','ELEMENTARY',4,'초등학교 4학년','초등학교 3~4학년',2025,['초등학교 수학'],4],
  ['E5','ELEMENTARY',5,'초등학교 5학년','초등학교 5~6학년',2026,['초등학교 수학'],5],
  ['E6','ELEMENTARY',6,'초등학교 6학년','초등학교 5~6학년',2026,['초등학교 수학'],6],
  ['M1','MIDDLE',1,'중학교 1학년','중학교 1~3학년',2025,['중학교 수학'],7],
  ['M2','MIDDLE',2,'중학교 2학년','중학교 1~3학년',2026,['중학교 수학'],8],
  ['M3','MIDDLE',3,'중학교 3학년','중학교 1~3학년',2027,['중학교 수학'],9],
  ['H1','HIGH',1,'고등학교 1학년','고등학교 과목 선택 구조',2025,['공통수학1','공통수학2'],10],
  ['H2','HIGH',2,'고등학교 2학년','고등학교 과목 선택 구조',2026,['대수','미적분Ⅰ','확률과 통계'],11],
  ['H3','HIGH',3,'고등학교 3학년','고등학교 과목 선택 구조',2027,['미적분Ⅱ','기하'],12]
];

const sequenceByGrade=new Map();
const formulaRows=catalog.items.map((item)=>{
  const sequence=(sequenceByGrade.get(item.grade_code)??0)+1;sequenceByGrade.set(item.grade_code,sequence);
  return `  (${uuidSql(quote(item.semantic_key))},${quote(referenceId)}::uuid,${quote(item.grade_code)},${sequence},${quote(item.strand)},${quote(item.knowledge_type)},${quote(item.semantic_key)},${quote(item.title_ko)},${quote(item.notation)},${quote(item.explanation_ko)},${json(item.source_standard_codes)},${nullable(item.course_name)})`;
});

const lines=[
  'BEGIN;',
  '',
  'INSERT INTO mathchakchak.curriculum_reference',
  '  (id,jurisdiction,authority_name,notice_code,title,annex,official_url,source_sha256,effective_schedule,verified_on)',
  `VALUES (${quote(referenceId)}::uuid,'KR','대한민국 교육부','교육부 고시 제2022-33호','2022 개정 수학과 교육과정','별책 8','https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0','aab8eed59ecf244223d04afad75f4cf5ac5085fadcfc3cf52c2f6d54ddfc7856',${json({2024:['E1','E2'],2025:['E3','E4','M1','H1'],2026:['E5','E6','M2','H2'],2027:['M3','H3']})},'2026-08-06');`,
  '',
  'INSERT INTO mathchakchak.curriculum_grade',
  '  (grade_code,school_level,grade_number,label_ko,official_band,implementation_year,course_path,sequence_no)',
  'VALUES',
  gradeRows.map((row)=>`  (${quote(row[0])},${quote(row[1])},${row[2]},${quote(row[3])},${quote(row[4])},${row[5]},${json(row[6])},${row[7]})`).join(',\n')+';',
  '',
  'INSERT INTO mathchakchak.grade_formula_catalog',
  '  (id,curriculum_reference_id,grade_code,sequence_no,strand,knowledge_type,semantic_key,title_ko,notation,explanation_ko,source_standard_codes,course_name)',
  'VALUES',
  formulaRows.join(',\n')+';',
  '',
  'INSERT INTO mathchakchak.formula_explanation_revision',
  '  (id,formula_catalog_id,revision_no,locale,explanation,derivation_steps,misconception_notes,chakchaki_strategy,gongsickyi_strategy,verification_status)',
  'SELECT ' + uuidSql(`gfc.semantic_key || ${quote(':ko:v1')}`) + ',gfc.id,1,' + quote('ko') + ',gfc.explanation_ko,',
  "       jsonb_build_array('상황 또는 그림에서 수학적 관계를 찾는다.','관계를 기호와 식으로 일반화한다.','예에 대입하고 단위와 범위를 검산한다.'),",
  "       jsonb_build_array('기호만 외우고 관계를 설명하지 못하는 경우','적용 조건이나 단위를 확인하지 않는 경우'),",
  "       '선수 개념을 진단하고 시각적 모델과 학생 언어로 관계를 설명한다.',",
  "       '기호를 정의하고 공식을 유도한 뒤 대입·계산·단위를 검증한다.','SOURCE_ALIGNED'",
  '  FROM mathchakchak.grade_formula_catalog gfc;',
  '',
  'INSERT INTO mathchakchak.character_collaboration_policy',
  '  (policy_version,phase_no,phase_code,lead_character,support_character,objective_ko,handoff_condition)',
  'VALUES',
  "  ('pet-collab-v1',1,'PRECHECK','CHAKCHAKI',NULL,'선수 개념과 학생의 표현을 확인한다.','learner_readiness_recorded'),",
  "  ('pet-collab-v1',2,'CONCEPT_BRIDGE','CHAKCHAKI','GONGSICKYI','그림·상황·언어로 공식 이전의 관계를 연결한다.','concept_relation_explained'),",
  "  ('pet-collab-v1',3,'FORMULA_BUILD','GONGSICKYI','CHAKCHAKI','기호를 정의하고 관계에서 공식을 유도한다.','symbols_and_derivation_confirmed'),",
  "  ('pet-collab-v1',4,'GUIDED_APPLICATION','BOTH',NULL,'힌트와 계산 검증을 결합해 새 문제에 적용한다.','guided_problem_correct'),",
  "  ('pet-collab-v1',5,'VERIFY_REFLECT','GONGSICKYI','CHAKCHAKI','대입·단위·범위를 검산하고 학생 말로 원리를 회상한다.','verification_and_reflection_complete');",
  '',
  'COMMIT;',
  ''
];

fs.writeFileSync(output,lines.join('\n'),'utf8');
console.log('K12_CURRICULUM_SEED_GENERATED');
console.log(`grades=${sequenceByGrade.size}`);
console.log(`formula_clusters=${catalog.items.length}`);
