import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../../../client/math-learning/app.js', import.meta.url), 'utf8');

test('each rendered formula step replaces the previous submit handler', () => {
  assert.match(app, /elements\.form\.onsubmit=null;elements\.form\.replaceChildren\(\)/);
  assert.equal((app.match(/elements\.form\.onsubmit=/g) || []).length, 3);
  assert.doesNotMatch(app, /elements\.form\.addEventListener\('submit'/);
});

test('browser session token remains memory-only', () => {
  assert.match(app, /token:null/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|document\.cookie/);
});

test('scored response requests a privacy-minimized tutor turn and renders both characters', () => {
  assert.match(app, /responses\/\$\{result\.id\}\/tutor-feedback/);
  assert.match(app, /turn\.chakchaki/);
  assert.match(app, /turn\.gongsickyi/);
  assert.match(app, /서버 판정 유지/);
});
