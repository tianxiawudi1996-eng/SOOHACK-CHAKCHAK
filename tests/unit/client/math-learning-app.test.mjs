import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../../../client/math-learning/app.js', import.meta.url), 'utf8');

test('each rendered formula step replaces the previous submit handler', () => {
  assert.match(app, /elements\.form\.onsubmit=null;elements\.form\.replaceChildren\(\)/);
  assert.equal((app.match(/elements\.form\.onsubmit=/g) || []).length, 3);
  assert.doesNotMatch(app, /elements\.form\.addEventListener\('submit'/);
});

test('browser session uses secure cookies and CSRF without persisted bearer tokens', () => {
  assert.match(app, /credentials:'include'/);
  assert.match(app, /mcc_csrf/);
  assert.match(app, /'x-csrf-token'/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|access_token|authorization:`Bearer|\/api\/v1\/local-demo/);
});

test('lesson starts from the diagnostic path item and server-selected formula metadata', () => {
  assert.match(app, /searchParams\.get\('learning_path_item_id'\)/);
  assert.match(app, /learning_path_item_id:state\.learningPathItemId/);
  assert.match(app, /formulaSession\.formula\.title/);
  assert.match(app, /formulaSession\.formula\.notation/);
});

test('scored response requests a privacy-minimized tutor turn and renders both characters', () => {
  assert.match(app, /responses\/\$\{result\.id\}\/tutor-feedback/);
  assert.match(app, /turn\.chakchaki/);
  assert.match(app, /turn\.gongsickyi/);
  assert.match(app, /서버 판정 유지/);
});
