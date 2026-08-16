import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRICULUM_RUNTIME_LOCALES,CURRICULUM_REFERENCE_TRANSLATIONS,COLLABORATION_TRANSLATIONS,buildGradeTranslations,assertCurriculumRuntimeTranslations} from '../../../scripts/productization/curriculum-runtime-locales.mjs';

const hasHangul=(value)=>/[가-힣]/u.test(Array.isArray(value)?value.flat(Infinity).join(' '):String(value));
test('curriculum runtime translation rows cover twelve grades and eight locales',()=>{
  assert.doesNotThrow(assertCurriculumRuntimeTranslations);
  const grades=buildGradeTranslations();assert.equal(grades.length,96);
  for(const locale of CURRICULUM_RUNTIME_LOCALES)assert.equal(grades.filter((row)=>row.locale===locale).length,12);
});
test('non-Korean curriculum metadata and collaboration copy contain no Korean prose',()=>{
  for(const locale of CURRICULUM_RUNTIME_LOCALES.filter((item)=>item!=='ko')){
    const grades=buildGradeTranslations().filter((row)=>row.locale===locale);
    for(const grade of grades)for(const field of ['label','official_band','course_path'])assert.equal(hasHangul(grade[field]),false,`${locale} ${grade.grade_code} ${field}`);
    assert.equal(hasHangul(Object.values(CURRICULUM_REFERENCE_TRANSLATIONS[locale])),false,`${locale} reference`);
    assert.equal(hasHangul([Object.values(COLLABORATION_TRANSLATIONS[locale].roles),COLLABORATION_TRANSLATIONS[locale].phases]),false,`${locale} collaboration`);
  }
});
