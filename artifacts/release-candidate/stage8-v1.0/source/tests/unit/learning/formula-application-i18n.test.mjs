import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {APPLICATION_TASK_BANK,assertApplicationTaskBank} from '../../../scripts/productization/formula-application-task-bank.mjs';
import {APPLICATION_LOCALES,localizeApplicationTask} from '../../../scripts/productization/formula-application-locales.mjs';

test('application task bank covers 72 formulas and three difficulty levels',()=>{
  const formulas=JSON.parse(fs.readFileSync('infra/database/catalog/k12-formulas.ko.json','utf8'));
  assert.doesNotThrow(()=>assertApplicationTaskBank(formulas.items));
  const tasks=Object.values(APPLICATION_TASK_BANK).flat();
  assert.equal(tasks.length,216);
  assert.deepEqual([...new Set(tasks.map((item)=>item.difficulty))],[1,2,3]);
  assert.deepEqual(new Set(tasks.map((item)=>item.kind)),new Set(['CALCULATION','WORD_PROBLEM','UNIT_REASONING','REPRESENTATION_REASONING']));
});

test('all application tasks resolve in eight locales without changing math expressions',()=>{
  const task=APPLICATION_TASK_BANK['kr.e5.plane.area'][0];
  assert.equal(APPLICATION_LOCALES.length,8);
  for(const locale of APPLICATION_LOCALES){
    const localized=localizeApplicationTask(task,locale);
    assert.match(localized.prompt,/8 cm × 5 cm/);
    assert.ok(localized.value_label);
    assert.ok(localized.unit_label);
  }
});
