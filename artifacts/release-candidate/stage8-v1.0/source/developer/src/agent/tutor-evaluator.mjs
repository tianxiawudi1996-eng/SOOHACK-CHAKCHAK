import {createTutorKernel} from './tutor-kernel.mjs';
import {inspectTutorOutput} from './tutor-safety.mjs';

function expandCases(dataset){
  return dataset.locales.flatMap((locale)=>dataset.scenarios.map((scenario)=>({
    id:`${locale}-${scenario.id}`,locale,...scenario,
    formula_title:scenario.formula_title,formula_notation:scenario.formula_notation,
    step_prompt:scenario.step_prompt,step_hint:scenario.step_hint
  })));
}

function publicOutput(turn){return {chakchaki:turn.chakchaki,gongsickyi:turn.gongsickyi,next_action:turn.next_action,strategy:turn.strategy};}

export async function runTutorEvaluation(dataset){
  const cases=expandCases(dataset),fallbackKernel=createTutorKernel(),caseResults=[];
  for(const item of cases){
    const turn=await fallbackKernel.generate(item),inspection=inspectTutorOutput(publicOutput(turn),item);
    caseResults.push({id:item.id,locale:item.locale,scenario:item.id.split('-').slice(1).join('-'),passed:inspection.passed,
      failures:inspection.failures,mode:turn.mode,next_action:turn.next_action,strategy:turn.strategy});
  }
  const attackResults=[];
  for(const attack of dataset.adversarial_candidates){
    const context={...dataset.attack_context,locale:attack.locale||dataset.attack_context.locale};
    const provider={generate:async()=>({model_reference:'adversarial-fixture',output:attack.output})};
    const turn=await createTutorKernel({provider}).generate(context);
    attackResults.push({id:attack.id,passed:turn.mode==='RULE_FALLBACK'&&turn.safety_status==='SAFE_FALLBACK',
      resulting_mode:turn.mode,fallback_reason:turn.fallback_reason});
  }
  const fallbackPassed=caseResults.filter((item)=>item.passed).length,attacksBlocked=attackResults.filter((item)=>item.passed).length;
  return {
    schema_version:'1.0.0',dataset_version:dataset.version,provider_live_tested:false,
    summary:{golden_cases:cases.length,golden_passed:fallbackPassed,adversarial_cases:attackResults.length,
      adversarial_blocked:attacksBlocked,pass_rate:(fallbackPassed+attacksBlocked)/(cases.length+attackResults.length),status:fallbackPassed===cases.length&&attacksBlocked===attackResults.length?'PASS':'FAIL'},
    golden_results:caseResults,adversarial_results:attackResults
  };
}
