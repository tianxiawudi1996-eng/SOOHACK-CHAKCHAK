import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCorpusReadiness,CORPUS_TARGET_COUNT} from '../../../developer/src/content/corpus-readiness.mjs';

test('empty corpus fails closed without inventing content',()=>{
  const result=buildCorpusReadiness();
  assert.equal(result.status,'BLOCKED_EXTERNAL_CONTENT_EVIDENCE');
  assert.equal(result.metrics.registered,0);
  assert.equal(result.claims.corpus_30000_complete,false);
  assert.ok(result.blockers.some(({code})=>code==='CORPUS_TARGET_NOT_MET'));
});

test('thirty thousand fully reviewed licensed items meet the corpus gate',()=>{
  const result=buildCorpusReadiness({registered:CORPUS_TARGET_COUNT,active_rights:CORPUS_TARGET_COUNT,metadata_complete:CORPUS_TARGET_COUNT,double_math_approved:CORPUS_TARGET_COUNT,rights_approved:CORPUS_TARGET_COUNT,published:CORPUS_TARGET_COUNT,open_blocking_findings:0});
  assert.equal(result.status,'READY');
  assert.equal(result.readiness_score,100);
  assert.equal(result.blockers.length,0);
});

test('volume cannot bypass rights or dual math review',()=>{
  const result=buildCorpusReadiness({registered:40_000,active_rights:30_000,metadata_complete:40_000,double_math_approved:29_999,rights_approved:40_000,published:30_000});
  assert.equal(result.status,'BLOCKED_EXTERNAL_CONTENT_EVIDENCE');
  assert.equal(result.gates.target_count,true);
  assert.equal(result.gates.rights_coverage,false);
  assert.equal(result.gates.math_review_coverage,false);
});

test('one open critical finding blocks an otherwise complete corpus',()=>{
  const result=buildCorpusReadiness({registered:30_000,active_rights:30_000,metadata_complete:30_000,double_math_approved:30_000,rights_approved:30_000,published:30_000,open_blocking_findings:1});
  assert.equal(result.gates.no_blocking_findings,false);
  assert.equal(result.status,'BLOCKED_EXTERNAL_CONTENT_EVIDENCE');
});

test('reported covered counts cannot exceed registered content',()=>{
  const result=buildCorpusReadiness({registered:3,active_rights:9,metadata_complete:8,double_math_approved:7,rights_approved:6,published:5});
  assert.equal(result.metrics.active_rights,3);
  assert.equal(result.metrics.published,3);
  assert.equal(result.gates.target_count,false);
});

test('corpus readiness never claims learning effect or Daechi fit',()=>{
  const result=buildCorpusReadiness({registered:30_000,active_rights:30_000,metadata_complete:30_000,double_math_approved:30_000,rights_approved:30_000,published:30_000});
  assert.equal(result.claims.learning_effectiveness_proven,false);
  assert.equal(result.claims.daechi_fit_proven,false);
  assert.equal(result.publication_policy.automatic_publication,false);
});
