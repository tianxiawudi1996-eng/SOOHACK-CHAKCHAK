import test from 'node:test';
import assert from 'node:assert/strict';

const base=process.env.WEB_BASE_URL??'http://127.0.0.1:4180';
const locales=['ko','zh-CN','ja','en','es','fr','it','ru'];
const surfaces=['/','/diagnostic/','/math-learning/','/curriculum/'];

test('four core screens serve the accessibility locale runtime for all eight locales',async()=>{
  const runtime=await fetch(`${base}/i18n/accessibility.mjs`);
  assert.equal(runtime.status,200);
  assert.match(await runtime.text(),/ACCESSIBILITY_MESSAGES/);
  for(const locale of locales){
    for(const surface of surfaces){
      const response=await fetch(`${base}${surface}?locale=${encodeURIComponent(locale)}`);
      assert.equal(response.status,200,`${locale} ${surface}`);
      assert.match(await response.text(),/data-a11y-(?:text|aria)/,`${locale} ${surface}`);
    }
  }
});
