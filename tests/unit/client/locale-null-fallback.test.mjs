import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('student screens normalize a missing URL locale safely',()=>{
  for(const file of ['client/diagnostic/app.js','client/math-learning/app.js']){
    const source=fs.readFileSync(file,'utf8');
    assert.match(source,/String\(value\s*\?\?\s*''\)/,`${file} must accept a null search parameter`);
  }
});
