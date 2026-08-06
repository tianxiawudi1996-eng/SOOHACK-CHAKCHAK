import {buildStepResponse,createIdempotencyKey,stageProgress,STAGES} from './model.mjs?v=1.0.0';
import {UI_MESSAGES} from './messages.mjs?v=1.0.0';

const supported = ['ko','zh-CN','ja','en','es','fr','it','ru'];
const fallback = 'en';
const state = {locale:fallback,messages:UI_MESSAGES.en,token:null,lesson:null,learningSessionId:null,formulaSession:null,selectedChoice:null,handoffCode:null};
const byId = (id) => document.getElementById(id);
const elements = {
  locale:byId('localeSelect'),intro:byId('introPanel'),lesson:byId('lessonPanel'),complete:byId('completePanel'),
  start:byId('startButton'),stages:byId('stageList'),stageNumber:byId('stageNumber'),stageName:byId('stageName'),
  mastery:byId('masteryLabel'),progress:byId('progressBar'),formulaTitle:byId('formulaTitle'),notation:byId('formulaNotation'),
  memoryCue:byId('memoryCue'),prompt:byId('stepPrompt'),visual:byId('visualModel'),form:byId('answerForm'),
  feedback:byId('feedback'),continue:byId('continueButton'),completeSummary:byId('completeSummary')
};

function normalizeLocale(value='') {
  const candidate = String(value ?? '');
  const exact = supported.find((item) => item.toLowerCase() === candidate.toLowerCase());
  if (exact) return exact;
  const language = candidate.split('-')[0].toLowerCase();
  return supported.find((item) => item.split('-')[0].toLowerCase() === language) || null;
}

function resolveLocale() {
  return normalizeLocale(new URLSearchParams(location.search).get('locale')) || normalizeLocale(navigator.language) || fallback;
}

function message(key) { return state.messages[key] ?? UI_MESSAGES.en[key] ?? key; }

function applyMessages() {
  document.documentElement.lang = state.locale;
  document.querySelectorAll('[data-message]').forEach((node) => { node.textContent = message(node.dataset.message); });
  elements.locale.value = state.locale;
  renderStageList(null);
}

function renderStageList(currentStage) {
  const currentIndex = STAGES.indexOf(currentStage);
  elements.stages.replaceChildren(...STAGES.map((stage,index) => {
    const item = document.createElement('li');
    if (index < currentIndex || currentStage === 'COMPLETED') item.className = 'done';
    if (stage === currentStage) item.className = 'current';
    if (stage === currentStage) item.setAttribute('aria-current','step');
    const number = document.createElement('span'); number.className='stage-index'; number.textContent=String(index+1).padStart(2,'0');
    const label = document.createElement('span'); label.textContent=message('stages')[index];
    item.append(number,label);
    return item;
  }));
}

async function request(path,{method='GET',body,authenticated=true}={}) {
  const response = await fetch(path,{
    method,
    headers:{
      ...(authenticated && state.token ? {authorization:`Bearer ${state.token}`} : {}),
      ...(body === undefined ? {} : {'content-type':'application/json'}),
      ...(method === 'POST' && authenticated ? {'idempotency-key':createIdempotencyKey('ui')} : {})
    },
    body:body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error?.code || 'REQUEST_FAILED');
    error.code = payload.error?.code;
    throw error;
  }
  return payload.data;
}

function showFeedback(kind,text) {
  elements.feedback.className=`feedback ${kind}`;
  elements.feedback.textContent=text;
  elements.feedback.hidden=false;
}

function optionButton(choice) {
  const value=typeof choice==='string' ? choice : choice.value;
  const label=typeof choice==='string' ? message(choice) : choice.label;
  const button=document.createElement('button');
  button.type='button';button.className='choice-button';button.textContent=label;
  button.addEventListener('click',()=>submitResponse({choice:value}));
  return button;
}

function fractionForm(step) {
  const wrapper=document.createElement('div');wrapper.className='fraction-entry';
  const inputs=document.createElement('div');inputs.className='fraction-inputs';
  const numerator=document.createElement('input');numerator.name='numerator';numerator.inputMode='numeric';numerator.pattern='-?[0-9]+';numerator.required=true;numerator.setAttribute('aria-label',message('numerator'));
  const line=document.createElement('span');line.className='fraction-line';
  const denominator=document.createElement('input');denominator.name='denominator';denominator.inputMode='numeric';denominator.pattern='-?[0-9]+';denominator.required=true;denominator.setAttribute('aria-label',message('denominator'));
  inputs.append(numerator,line,denominator);wrapper.append(inputs);
  const submit=document.createElement('button');submit.type='submit';submit.className='primary-button submit-answer';submit.textContent=message('submit');
  elements.form.append(wrapper,submit);
  elements.form.onsubmit=(event)=>{event.preventDefault();const data=new FormData(elements.form);submitResponse({numerator:data.get('numerator'),denominator:data.get('denominator')});};
  numerator.focus();
}

function selectField(name,labelKey,options) {
  const label=document.createElement('label');label.textContent=message(labelKey);
  const select=document.createElement('select');select.name=name;select.required=true;
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=message('choose');select.append(placeholder);
  for (const value of options) { const option=document.createElement('option');option.value=value;option.textContent=message(value);select.append(option); }
  label.append(select);return label;
}

function recallForm() {
  const fields=document.createElement('div');fields.className='formula-fields';
  fields.append(selectField('numerator_rule','numerator',['cross_products_sum','add_numerators']),selectField('denominator_rule','denominator',['product','sum']));
  const submit=document.createElement('button');submit.type='submit';submit.className='primary-button submit-answer';submit.textContent=message('submit');
  elements.form.append(fields,submit);
  elements.form.onsubmit=(event)=>{event.preventDefault();const data=new FormData(elements.form);submitResponse({numerator_rule:data.get('numerator_rule'),denominator_rule:data.get('denominator_rule')});};
}

function renderVisual(content) {
  elements.visual.replaceChildren();
  if (!content.visual_model) { elements.visual.hidden=true;return; }
  const model=document.createElement('div');model.className='sixths';
  for(let index=0;index<6;index+=1) model.append(document.createElement('i'));
  elements.visual.append(model);elements.visual.hidden=false;
}

function renderStep() {
  const session=state.formulaSession;
  const step=session.current_step;
  if (!step) return completeLesson();
  const progress=stageProgress(step.stage);
  renderStageList(step.stage);
  elements.stageNumber.textContent=`${progress} / 5`;
  elements.stageName.textContent=message('stages')[progress-1];
  elements.mastery.textContent=`${Math.round(session.mastery_score*100)}%`;
  elements.progress.style.width=`${progress*20}%`;
  elements.prompt.textContent=step.content.prompt;
  renderVisual(step.content);
  elements.form.onsubmit=null;elements.form.replaceChildren();elements.feedback.hidden=true;elements.continue.hidden=true;
  if (step.interaction_type==='CONCEPT_CHOICE' || step.interaction_type==='VISUAL_CHOICE') {
    elements.form.append(...step.content.choices.map(optionButton));
  } else if (step.interaction_type==='GUIDED_FRACTION' || step.interaction_type==='APPLICATION_FRACTION') fractionForm(step);
  else if (step.interaction_type==='FORMULA_RECALL') recallForm();
}

async function submitResponse(values) {
  try {
    const step=state.formulaSession.current_step;
    elements.form.querySelectorAll('button,input,select').forEach((node)=>node.disabled=true);
    const responseValue=buildStepResponse(step.interaction_type,values);
    const result=await request(`/api/v1/formula-lessons/${state.formulaSession.id}/responses`,{method:'POST',body:{response_value:responseValue,hint_level:0}});
    if (result.outcome==='CORRECT') {
      showFeedback('correct',message('correct'));
      elements.continue.hidden=false;
    } else {
      showFeedback('incorrect',`${message('incorrect')} ${result.hint || ''}`);
      elements.form.querySelectorAll('button,input,select').forEach((node)=>node.disabled=false);
    }
  } catch { showFeedback('incorrect',message('error')); }
}

async function loadFormulaSession() {
  state.formulaSession=await request(`/api/v1/formula-lessons/${state.formulaSession.id}`);
  renderStep();
}

async function completeLesson() {
  const completed=await request(`/api/v1/formula-lessons/${state.formulaSession.id}/complete`,{method:'POST',body:{}});
  await request(`/api/v1/learning-sessions/${state.learningSessionId}/complete`,{method:'POST',body:{}});
  renderStageList('COMPLETED');
  elements.lesson.hidden=true;elements.complete.hidden=false;
  elements.completeSummary.textContent=message('completeSummary').replace('{score}',String(Math.round(completed.mastery_score*100)));
  elements.locale.disabled=false;
}

async function startLesson() {
  elements.start.disabled=true;elements.start.textContent=message('loading');
  try {
    const bootstrap=state.handoffCode
      ? await request(`/api/v1/local-demo/handoffs/${state.handoffCode}/consume`,{method:'POST',authenticated:false})
      : await request('/api/v1/local-demo/session',{method:'POST',body:{},authenticated:false});
    state.handoffCode=null;
    state.token=bootstrap.access_token;
    state.lesson=await request(`/api/v1/concepts/${bootstrap.concept_id}/lesson?locale=${encodeURIComponent(state.locale)}`);
    const learning=await request('/api/v1/learning-sessions',{method:'POST',body:{learning_path_item_id:bootstrap.learning_path_item_id,locale:state.locale}});
    state.learningSessionId=learning.id;
    state.formulaSession=await request(`/api/v1/learning-sessions/${learning.id}/formula-lessons`,{method:'POST',body:{lesson_definition_id:state.lesson.lesson.id}});
    elements.formulaTitle.textContent=state.lesson.formula.title;
    elements.notation.textContent=state.lesson.formula.notation;
    elements.memoryCue.textContent=state.lesson.formula.memory_cue;
    elements.intro.hidden=true;elements.lesson.hidden=false;elements.locale.disabled=true;
    renderStep();
  } catch (error) {
    elements.start.disabled=false;elements.start.textContent=message('start');
    const detail=error.code==='NOT_FOUND' ? ' (local demo disabled)' : '';
    const note=document.querySelector('.local-note');note.textContent=`${message('error')}${detail}`;
  }
}

const fragment=new URLSearchParams(location.hash.slice(1));
state.handoffCode=/^[0-9a-f]{64}$/.test(fragment.get('handoff') || '') ? fragment.get('handoff') : null;
if (state.handoffCode) history.replaceState(null,'',`${location.pathname}${location.search}`);
state.locale=resolveLocale();state.messages=UI_MESSAGES[state.locale] || UI_MESSAGES.en;applyMessages();
elements.start.addEventListener('click',startLesson);
elements.continue.addEventListener('click',loadFormulaSession);
elements.locale.addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('locale',elements.locale.value);location.href=url;});
