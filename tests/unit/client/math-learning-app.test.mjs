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
