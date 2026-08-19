import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {authMessages,supportedLocales} from '../../../client/auth/messages.mjs';

const html=fs.readFileSync(new URL('../../../client/auth/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../../../client/auth/app.js',import.meta.url),'utf8');
const built=fs.readFileSync(new URL('../../../artifacts/staging/v0.1.0/site/auth/index.html',import.meta.url),'utf8');

test('social login screen exposes four roles and three configured provider entry points',()=>{
  for(const role of ['STUDENT','PARENT','ACADEMY_OWNER','TEACHER'])assert.match(html,new RegExp(`value="${role}"`));
  for(const provider of ['GOOGLE','NAVER','KAKAO'])assert.match(html,new RegExp(`data-provider="${provider}"`));
  assert.match(html,/id="onboardingForm"/);
  assert.match(html,/id="logoutButton"/);
});

test('all required locales resolve the complete English contract with localized role labels',()=>{
  assert.deepEqual(supportedLocales,['ko','zh-CN','ja','en','es','fr','it','ru']);
  const required=Object.keys(authMessages('en'));
  for(const locale of supportedLocales){
    const messages=authMessages(locale);
    assert.equal(required.every(key=>typeof messages[key]==='string'&&messages[key].length>0),true,locale);
    assert.notEqual(messages['role.student'],undefined);
  }
});

test('browser lifecycle uses credentialed API, CSRF and no web storage token persistence',()=>{
  assert.match(app,/credentials:'include'/);
  assert.match(app,/'x-csrf-token'/);
  assert.doesNotMatch(app,/localStorage|sessionStorage|access_token|refresh_token/);
  assert.match(app,/\/api\/v1\/auth\/logout/);
  assert.match(app,/\/api\/v1\/auth\/onboarding/);
});

test('social login preserves only an internal return target',()=>{
  assert.match(app,/searchParams\.get\('return_to'\)/);
  assert.match(app,/startsWith\('\/'\)/);
  assert.match(app,/startsWith\('\/\/'\)/);
  assert.match(app,/return_to=\$\{encodeURIComponent\(returnTo\)\}/);
});

test('staging artifact contains the auth screen with product asset paths',()=>{
  assert.match(built,/\.\.\/assets\/tokens\.css/);
  assert.match(built,/\.\.\/assets\/product-shell\.css/);
  assert.equal(fs.existsSync(new URL('../../../artifacts/staging/v0.1.0/site/auth/app.js',import.meta.url)),true);
});
