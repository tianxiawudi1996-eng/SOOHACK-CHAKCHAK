import fs from 'node:fs';
import path from 'node:path';
import {
  FORMULA_CONTENT_LOCALES,FORMULA_TITLE_TRANSLATIONS,assertFormulaTitleTranslations,
  localizeFormulaContent
} from './formula-catalog-locales.mjs';

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const fail=(message)=>{console.error(`FORMULA_CATALOG_I18N_FAIL: ${message}`);process.exit(1);};
const contract=JSON.parse(read('infra/database/formula-catalog-i18n-contract.json'));
const catalog=JSON.parse(read(contract.catalog));
const migration=read(contract.migration);const rollback=read(contract.rollback);const seed=read(contract.seed);
const repository=read('developer/src/api/repository.mjs');const server=read('developer/src/api/server.mjs');
const client=read('client/curriculum/app.js');const compose=read('infra/deployment/compose.api-staging.yaml');
const register=JSON.parse(read('docs/productization/evidence/PHASE_19_TRANSLATION_REGISTER.json'));
const translatedLocales=FORMULA_CONTENT_LOCALES.filter((locale)=>locale!=='ko');
const hasHangul=(value)=>/[가-힣]/u.test(Array.isArray(value)?value.join(' '):String(value));

try{assertFormulaTitleTranslations(catalog.items);}catch(error){fail(error.message);}
if(contract.database!=='PostgreSQL'||catalog.items.length!==72||contract.formula_count!==72)fail('formula contract');
if(contract.source_rows!==72||contract.translated_rows!==504||contract.revision_rows!==576)fail('revision row contract');
if(contract.locales.join('|')!==FORMULA_CONTENT_LOCALES.join('|'))fail('locale contract');
if(Object.keys(FORMULA_TITLE_TRANSLATIONS).length!==72||Object.values(FORMULA_TITLE_TRANSLATIONS).flatMap(Object.values).length!==504)fail('title coverage');
for(const formula of catalog.items)for(const locale of translatedLocales){
  const content=localizeFormulaContent(formula,locale);
  for(const [field,value] of Object.entries(content)){
    if(!(Array.isArray(value)?value.length:String(value).trim()))fail(`empty ${locale} ${formula.semantic_key} ${field}`);
    if(hasHangul(value))fail(`Hangul remains ${locale} ${formula.semantic_key} ${field}`);
  }
}
for(const token of ['ADD COLUMN title','ADD COLUMN display_notation','ADD COLUMN recall_prompt','ADD COLUMN content_locale','verification_status TYPE varchar(32)','INCLUDE (title,display_notation,explanation,recall_prompt,verification_status)'])if(!migration.includes(token))fail(`migration missing ${token}`);
for(const token of ['DROP COLUMN IF EXISTS title','DROP COLUMN IF EXISTS display_notation','DROP COLUMN IF EXISTS recall_prompt','DROP COLUMN IF EXISTS content_locale','verification_status TYPE varchar(24)'])if(!rollback.includes(token))fail(`rollback missing ${token}`);
for(const locale of translatedLocales)if(!seed.includes(`'${locale}'`))fail(`seed locale missing ${locale}`);
for(const token of ['title,display_notation,explanation,recall_prompt','TRANSLATION_REVIEW_REQUIRED'])if(!seed.includes(token))fail(`seed missing ${token}`);
for(const token of ['ALTER COLUMN title SET NOT NULL','ALTER COLUMN display_notation SET NOT NULL','ALTER COLUMN recall_prompt SET NOT NULL'])if(!seed.includes(token))fail(`final constraint missing ${token}`);
const catalogMethod=repository.slice(repository.indexOf('async getGradeFormulas'),repository.indexOf('async getCurriculumCollaborationPlan'));
for(const token of ['requested.display_notation','requested.title','requested.explanation','content_locale'])if(!catalogMethod.includes(token))fail(`catalog query missing ${token}`);
const recallMethod=repository.slice(repository.indexOf('async getFormulaRecallCheck'),repository.indexOf('async addFormulaRecallAttempt'));
for(const token of ['requested.recall_prompt','localizedChoices','labelByKey','requested.display_notation'])if(!recallMethod.includes(token))fail(`recall localization missing ${token}`);
if(/answer_schema|accepted_values|correct_value/.test(recallMethod))fail('public recall method exposes scoring material');
if(!server.includes("body.locale??'ko'")||!client.includes('locale:state.locale'))fail('locale is not persisted into collaboration');
for(const mount of ['0010_formula_catalog_i18n.sql','0008_formula_catalog_i18n.sql'])if(!compose.includes(mount))fail(`compose mount missing ${mount}`);
for(const doc of ['docs/developer/productization/FORMULA_CATALOG_I18N_DESIGN_v1.0.md','docs/productization/prompts/PHASE_19_FORMULA_CATALOG_I18N_METAPROMPT_v1.0.md'])for(const section of ['Goal Framing','Specification Engineering','Context Engineering','Harness Engineering','Prompt Engineering','Workflow Engineering','Memory Engineering','Loop Engineering'])if(!read(doc).includes(section))fail(`global section missing ${section}`);
if(register.translated_rows!==504||register.manual_translation_approvals!=='0/7'||register.human_approval_inferred!==false)fail('translation review register');
for(const locale of translatedLocales)if(!register.locales[locale]?.status.includes('HUMAN_REVIEW_REQUIRED'))fail(`review status ${locale}`);
console.log('FORMULA_CATALOG_I18N_STATIC_PASS');
console.log('formulas=72/72');console.log('titles=504/504');console.log('content_rows=576/576');console.log('locales=8/8');console.log('human_review_required=7/7');console.log('answer_exposed=false');
