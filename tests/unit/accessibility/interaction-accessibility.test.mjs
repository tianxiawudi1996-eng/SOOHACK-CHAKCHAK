import test from 'node:test';
import assert from 'node:assert/strict';
import {CRITICAL_CONTRAST_PAIRS,contrastRatio,relativeLuminance} from '../../../scripts/productization/accessibility_contrast.mjs';

test('WCAG contrast calculation handles black and white',()=>{
  assert.equal(relativeLuminance('#000000'),0);
  assert.equal(relativeLuminance('#ffffff'),1);
  assert.equal(contrastRatio('#000000','#ffffff'),21);
});

test('critical text and focus color pairs meet their contrast thresholds',()=>{
  for(const pair of CRITICAL_CONTRAST_PAIRS){
    assert.ok(contrastRatio(pair.foreground,pair.background)>=pair.minimum,`${pair.name}: ${contrastRatio(pair.foreground,pair.background).toFixed(2)} < ${pair.minimum}`);
  }
});
