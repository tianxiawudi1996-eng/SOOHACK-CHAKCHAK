const ENDPOINT='https://api.openai.com/v1/responses';
export const TUTOR_PROMPT_VERSION='mathchakchak-tutor-duo-v1.0.0';

function outputText(payload){
  if(typeof payload.output_text==='string')return payload.output_text;
  for(const item of payload.output||[])for(const content of item.content||[])if(typeof content.text==='string')return content.text;
  throw new Error('OPENAI_OUTPUT_MISSING');
}

export function createOpenAIResponsesProvider({apiKey,model='gpt-5.6-sol',promptVersion=TUTOR_PROMPT_VERSION,fetchImpl=fetch}={}){
  if(!apiKey)return null;
  if(promptVersion!==TUTOR_PROMPT_VERSION)throw new Error('UNAPPROVED_TUTOR_PROMPT_VERSION');
  return {
    async generate({input,schema}){
      const response=await fetchImpl(ENDPOINT,{
        method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
        body:JSON.stringify({
          model,store:false,max_output_tokens:250,
          instructions:'You are the child-safe MathChakChak tutor duo. Never reveal a final numeric answer. Chakchaki encourages and asks; Gongsickyi verifies a mathematical rule. Use the requested locale. Return only the schema.',
          input:JSON.stringify(input),
          text:{format:{type:'json_schema',name:'mathchakchak_tutor_turn',strict:true,schema}}
        })
      });
      if(!response.ok)throw new Error(`OPENAI_HTTP_${response.status}`);
      const payload=await response.json();
      return {
        output:JSON.parse(outputText(payload)),model_reference:payload.model||model,prompt_version:promptVersion,
        usage:{input_tokens:Number(payload.usage?.input_tokens||0),output_tokens:Number(payload.usage?.output_tokens||0)}
      };
    }
  };
}
