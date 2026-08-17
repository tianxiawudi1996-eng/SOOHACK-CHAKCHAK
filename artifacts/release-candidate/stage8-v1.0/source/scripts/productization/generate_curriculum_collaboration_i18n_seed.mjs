import fs from 'node:fs';
import path from 'node:path';
import {CURRICULUM_RUNTIME_LOCALES,CURRICULUM_REFERENCE_TRANSLATIONS,COLLABORATION_TRANSLATIONS,buildGradeTranslations,assertCurriculumRuntimeTranslations} from './curriculum-runtime-locales.mjs';

assertCurriculumRuntimeTranslations();
const root=process.cwd();const output=path.join(root,'infra/database/seeds/0009_curriculum_collaboration_i18n.sql');
const quote=(value)=>`'${String(value).replaceAll("'","''")}'`;
const json=(value)=>`${quote(JSON.stringify(value))}::jsonb`;
const status=(locale)=>locale==='ko'?'SOURCE_ALIGNED':'TRANSLATION_REVIEW_REQUIRED';
const referenceId='e2022330-0000-4000-8000-000000000008';
const gradeRows=buildGradeTranslations().map((item)=>`  (${quote(item.grade_code)},${quote(item.locale)},${quote(item.label)},${quote(item.official_band)},${json(item.course_path)},${quote(status(item.locale))})`);
const referenceRows=CURRICULUM_RUNTIME_LOCALES.map((locale)=>{const item=CURRICULUM_REFERENCE_TRANSLATIONS[locale];return `  (${quote(referenceId)}::uuid,${quote(locale)},${quote(item.authority_label)},${quote(item.notice_label)},${quote(item.title)},${quote(item.annex_label)},${quote(item.citation)},${quote(status(locale))})`;});
const roleRows=CURRICULUM_RUNTIME_LOCALES.map((locale)=>{const roles=COLLABORATION_TRANSLATIONS[locale].roles;return `  ('pet-collab-v1',${quote(locale)},${quote(roles.chakchaki)},${quote(roles.gongsickyi)},${quote(status(locale))})`;});
const phaseRows=CURRICULUM_RUNTIME_LOCALES.flatMap((locale)=>COLLABORATION_TRANSLATIONS[locale].phases.map(([title,objective],index)=>`  ('pet-collab-v1',${index+1},${quote(locale)},${quote(title)},${quote(objective)},${quote(status(locale))})`));
const upsert=(table,columns,rows,conflict,update)=>[`INSERT INTO mathchakchak.${table} (${columns})`,'VALUES',rows.join(',\n'),`ON CONFLICT (${conflict}) DO UPDATE SET ${update};`,'' ];
const sql=['BEGIN;','',
  ...upsert('curriculum_grade_translation','grade_code,locale,label,official_band,course_path,verification_status',gradeRows,'grade_code,locale','label=EXCLUDED.label,official_band=EXCLUDED.official_band,course_path=EXCLUDED.course_path,verification_status=EXCLUDED.verification_status'),
  ...upsert('curriculum_reference_translation','curriculum_reference_id,locale,authority_label,notice_label,title,annex_label,citation,verification_status',referenceRows,'curriculum_reference_id,locale','authority_label=EXCLUDED.authority_label,notice_label=EXCLUDED.notice_label,title=EXCLUDED.title,annex_label=EXCLUDED.annex_label,citation=EXCLUDED.citation,verification_status=EXCLUDED.verification_status'),
  ...upsert('character_collaboration_role_translation','policy_version,locale,chakchaki_role,gongsickyi_role,verification_status',roleRows,'policy_version,locale','chakchaki_role=EXCLUDED.chakchaki_role,gongsickyi_role=EXCLUDED.gongsickyi_role,verification_status=EXCLUDED.verification_status'),
  ...upsert('character_collaboration_phase_translation','policy_version,phase_no,locale,phase_title,objective,verification_status',phaseRows,'policy_version,phase_no,locale','phase_title=EXCLUDED.phase_title,objective=EXCLUDED.objective,verification_status=EXCLUDED.verification_status'),
  'COMMIT;',''];
fs.writeFileSync(output,sql.join('\n'),'utf8');
console.log('CURRICULUM_COLLABORATION_I18N_SEED_GENERATED');
console.log(`grade_rows=${gradeRows.length}`);console.log(`reference_rows=${referenceRows.length}`);console.log(`role_rows=${roleRows.length}`);console.log(`phase_rows=${phaseRows.length}`);
