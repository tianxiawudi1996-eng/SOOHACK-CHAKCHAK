import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpenAIResponsesProvider} from '../../../developer/src/agent/openai-responses-provider.mjs';
import {TUTOR_OUTPUT_SCHEMA} from '../../../developer/src/agent/tutor-kernel.mjs';

test('provider uses non-persistent Responses structured output',async()=>{
  let request;
  const fetchImpl=async(url,options)=>{
    request={url,options,body:JSON.parse(options.body)};
    return {ok:true,json:async()=>({model:'gpt-test',output_text:JSON.stringify({
      chakchaki:'Try one more connection.',gongsickyi:'Check the denominator rule.',next_action:'RETRY',strategy:'VERIFY_RULE'
    })})};
  };
  const provider=createOpenAIResponsesProvider({apiKey:'unit-secret',model:'gpt-test',fetchImpl});
  const result=await provider.generate({input:{locale:'en'},schema:TUTOR_OUTPUT_SCHEMA});
  assert.equal(request.url,'https://api.openai.com/v1/responses');
  assert.equal(request.body.store,false);
  assert.equal(request.body.text.format.type,'json_schema');
  assert.equal(request.body.text.format.strict,true);
  assert.equal(request.options.body.includes('unit-secret'),false);
  assert.equal(result.model_reference,'gpt-test');
});

test('provider is disabled when no API key is configured',()=>{
  assert.equal(createOpenAIResponsesProvider({apiKey:''}),null);
});
