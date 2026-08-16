import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const surfaces = [
  'client/mock/index.html',
  'client/diagnostic/index.html',
  'client/math-learning/index.html',
  'client/curriculum/index.html'
];

test('four product surfaces share the same product shell and 44px target contract', () => {
  for (const file of surfaces) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /class="product-page\s/);
    assert.match(html, /\.\.\/design\/product-shell\.css/);
  }
  const css = fs.readFileSync('client/design/product-shell.css', 'utf8');
  assert.match(css, /--tap-target:\s*2\.75rem/);
  assert.match(css, /min-height:\s*var\(--tap-target\)/);
  assert.match(css, /min-width:\s*var\(--tap-target\)/);
});

test('landing discloses sample metrics and explains the dual tutor system', () => {
  const html = fs.readFileSync('client/mock/index.html', 'utf8');
  assert.match(html, /data-i18n="preview\.sample"/);
  assert.match(html, /id="duet"/);
  assert.match(html, /data-i18n="duet\.chakchaki\.role"/);
  assert.match(html, /data-i18n="duet\.gongsickyi\.role"/);
  assert.match(html, /2d-pet-motion-v1\.0\.css/);
  assert.match(html, /2d-pet-motion-v1\.0\.js/);
  assert.match(html, /ai-behavior-v1\.0\.css/);
  assert.match(html, /ai-behavior-v1\.0\.js/);
  assert.match(html, /data-ai-bubble/);
});
