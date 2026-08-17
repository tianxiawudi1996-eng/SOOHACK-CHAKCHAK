import test from 'node:test';
import assert from 'node:assert/strict';

const base=process.env.WEB_BASE_URL??'http://127.0.0.1:4180';
const surfaces=['/','/diagnostic/','/math-learning/','/curriculum/'];

test('four core screens serve keyboard focus and reduced-motion contracts',async()=>{
  const stylesheet=await fetch(`${base}/accessibility/interaction.css`);
  assert.equal(stylesheet.status,200);
  const css=await stylesheet.text();
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
  const runtime=await fetch(`${base}/accessibility/interaction.mjs`);
  assert.equal(runtime.status,200);
  assert.match(await runtime.text(),/installSkipLinkFocus/);
  for(const surface of surfaces){
    const response=await fetch(`${base}${surface}?locale=en`);
    assert.equal(response.status,200,surface);
    const html=await response.text();
    assert.match(html,/class="skip-link"/);
    assert.match(html,/<main[^>]+tabindex="-1"/);
    assert.match(html,/accessibility\/interaction\.css/);
  }
});
