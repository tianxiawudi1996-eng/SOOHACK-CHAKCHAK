import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../../../infra/database/catalog/k12-formulas.ko.json' with {type:'json'};
import {
  FORMULA_CONTENT_LOCALES,FORMULA_TITLE_TRANSLATIONS,assertFormulaTitleTranslations,
  displayNotationFor,localizeFormulaContent
} from '../../../scripts/productization/formula-catalog-locales.mjs';

const translatedLocales=FORMULA_CONTENT_LOCALES.filter((locale)=>locale!=='ko');
const hasHangul=(value)=>/[가-힣]/u.test(Array.isArray(value)?value.join(' '):String(value));

test('formula catalog has complete titles for seven translated locales',()=>{
  assert.equal(catalog.items.length,72);
  assert.doesNotThrow(()=>assertFormulaTitleTranslations(catalog.items));
  assert.equal(Object.keys(FORMULA_TITLE_TRANSLATIONS).length,72);
  assert.equal(Object.values(FORMULA_TITLE_TRANSLATIONS).flatMap(Object.values).length,504);
});

test('translated formula content is complete and contains no Korean copy',()=>{
  for(const formula of catalog.items){
    for(const locale of translatedLocales){
      const content=localizeFormulaContent(formula,locale);
      for(const [field,value] of Object.entries(content)){
        assert.ok(Array.isArray(value)?value.length>0:String(value).trim(),`${locale} ${formula.semantic_key} ${field}`);
        assert.equal(hasHangul(value),false,`${locale} ${formula.semantic_key} ${field}`);
      }
      assert.equal(displayNotationFor(formula,locale),content.display_notation);
    }
  }
});

test('known title and locale-neutral notation are stable',()=>{
  const formula=catalog.items.find((item)=>item.semantic_key==='kr.e1.number.compose');
  assert.equal(localizeFormulaContent(formula,'en').title,'Composing and decomposing numbers');
  const equality=catalog.items.find((item)=>item.semantic_key==='kr.e1.equality');
  assert.equal(displayNotationFor(equality,'ru'),'a = b');
});
