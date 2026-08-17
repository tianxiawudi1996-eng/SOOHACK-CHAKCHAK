import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLocale} from '../../../developer/src/i18n/locale-resolver.mjs';

test('locale resolution follows URL, user, cookie, header, default order', () => {
  assert.deepEqual(resolveLocale({urlLocale:'ja',userLocale:'ko',cookieLocale:'fr',acceptLanguage:'es-ES'}), {locale:'ja',source:'url',fallbackUsed:false});
  assert.equal(resolveLocale({userLocale:'zh-cn'}).locale, 'zh-CN');
  assert.equal(resolveLocale({cookieLocale:'it'}).source, 'locale_cookie');
  assert.equal(resolveLocale({acceptLanguage:'fr-FR,fr;q=0.9'}).locale, 'fr');
  assert.deepEqual(resolveLocale({urlLocale:'xx'}), {locale:'en',source:'default_locale',fallbackUsed:true});
});
