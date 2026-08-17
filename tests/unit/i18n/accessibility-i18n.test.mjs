import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCESSIBILITY_LOCALES,ACCESSIBILITY_MESSAGES,assertAccessibilityMessages} from '../../../client/i18n/accessibility.mjs';

test('accessibility labels cover four product surfaces in eight locales',()=>{
  assert.doesNotThrow(()=>assertAccessibilityMessages());
  assert.equal(ACCESSIBILITY_LOCALES.length,8);
  assert.equal(Object.keys(ACCESSIBILITY_MESSAGES.en).length,31);
  for(const locale of ACCESSIBILITY_LOCALES)assert.equal(Object.keys(ACCESSIBILITY_MESSAGES[locale]).length,31);
});

test('non-Korean accessibility labels contain no Korean prose',()=>{
  for(const locale of ACCESSIBILITY_LOCALES.filter((item)=>item!=='ko')){
    assert.equal(/[\uAC00-\uD7A3]/u.test(Object.values(ACCESSIBILITY_MESSAGES[locale]).join(' ')),false,locale);
  }
});
