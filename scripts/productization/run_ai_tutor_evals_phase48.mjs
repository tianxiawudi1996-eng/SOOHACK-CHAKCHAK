import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {runTutorEvaluation} from '../../developer/src/agent/tutor-evaluator.mjs';

const root=process.cwd();
const datasetPath=path.join(root,'developer/evals/tutor-golden-cases.v1.json');
const outputPath=path.join(root,'docs/productization/evidence/PHASE_48_AI_TUTOR_EVAL_RESULTS.json');
const dataset=JSON.parse(fs.readFileSync(datasetPath,'utf8'));
const report=await runTutorEvaluation(dataset);
report.dataset_sha256=crypto.createHash('sha256').update(fs.readFileSync(datasetPath)).digest('hex');
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n','utf8');
console.log(report.summary.status==='PASS'?'PHASE48_AI_TUTOR_EVAL_PASS':'PHASE48_AI_TUTOR_EVAL_FAIL');
console.log(`golden=${report.summary.golden_passed}/${report.summary.golden_cases}`);
console.log(`adversarial=${report.summary.adversarial_blocked}/${report.summary.adversarial_cases}`);
console.log(`provider_live_tested=${report.provider_live_tested}`);
if(report.summary.status!=='PASS')process.exit(1);
