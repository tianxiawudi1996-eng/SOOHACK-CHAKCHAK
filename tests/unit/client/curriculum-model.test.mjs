import test from 'node:test';
import assert from 'node:assert/strict';
import {GRADE_CODES,STRAND_KEYS,createIdempotencyKey,groupGrades,normalizeGrade} from '../../../client/curriculum/model.mjs';

test('K12 model exposes twelve ordered grade codes and safe normalization',()=>{
  assert.deepEqual(GRADE_CODES,['E1','E2','E3','E4','E5','E6','M1','M2','M3','H1','H2','H3']);
  assert.equal(normalizeGrade('H3'),'H3');
  assert.equal(normalizeGrade('X9'),'E1');
  assert.equal(Object.keys(STRAND_KEYS).length,4);
  assert.equal(createIdempotencyKey('test','fixed-id'),'test-fixed-id');
});

test('grades group into elementary, middle, and high without loss',()=>{
  const rows=GRADE_CODES.map((grade_code)=>({grade_code,school_level:grade_code[0]==='E'?'ELEMENTARY':grade_code[0]==='M'?'MIDDLE':'HIGH'}));
  const grouped=groupGrades(rows);
  assert.equal(grouped.ELEMENTARY.length,6);
  assert.equal(grouped.MIDDLE.length,3);
  assert.equal(grouped.HIGH.length,3);
  assert.equal(Object.values(grouped).flat().length,12);
});
