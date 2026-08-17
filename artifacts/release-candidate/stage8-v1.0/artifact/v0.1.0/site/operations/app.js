import {OPS_MESSAGES} from './messages.mjs?v=70';

const locales=['ko','zh-CN','ja','en','es','fr','it','ru'];
const state={locale:'ko',role:'teacher',token:null,studentId:null,overview:null};
const byId=id=>document.getElementById(id);
const msg=key=>OPS_MESSAGES[state.locale]?.[key]??OPS_MESSAGES.en[key]??key;
const trackLabel=code=>({CONCEPT_RECOVERY:'Concept recovery',SCHOOL_EXAM:'School mastery',ADVANCED_REASONING:'Advanced reasoning',CONTEST_BRIDGE:'Contest bridge'})[code]??code;
const localeFromUrl=()=>{const raw=new URLSearchParams(location.search).get('locale')||navigator.language||'en';return locales.find(x=>x.toLowerCase()===raw.toLowerCase())??locales.find(x=>x.split('-')[0]===raw.split('-')[0])??'en';};
const idempotencyKey=()=>`ops-${crypto.randomUUID()}`;

async function api(path,{method='GET',body}={}){
  const response=await fetch(path,{method,headers:{...(state.token?{authorization:`Bearer ${state.token}`} : {}),...(body?{'content-type':'application/json'}:{}),...(method==='POST'&&state.token?{'idempotency-key':idempotencyKey()}: {})},body:body?JSON.stringify(body):undefined});
  const payload=await response.json();
  if(!response.ok)throw new Error(payload.error?.code||'REQUEST_FAILED');
  return payload.data;
}

function applyCopy(){
  document.documentElement.lang=state.locale;
  document.title=msg('title');
  for(const [id,key] of [['academyLink','academy'],['eyebrow','eyebrow'],['title','title'],['subtitle','subtitle'],['truth','truth'],['teacherRole','teacher'],['parentRole','parent'],['gradeLabel','grade'],['scoreLabel','score'],['trackLabel','track'],['evidenceLabel','evidence'],['planEyebrow','plan'],['assignButton','assign'],['interveneButton','intervene'],['assignmentsTitle','assignments'],['interventionsTitle','interventions'],['privacy','privacy']])byId(id).textContent=msg(key);
  byId('localeSelect').value=state.locale;
  byId(`${state.role}Role`).classList.add('is-active');
}

async function transitionAssignment(item,toStatus,button){
  try{
    button.disabled=true;
    await api(`/api/v1/operations/students/${state.studentId}/assignments/${item.id}/transition`,{method:'POST',body:{to_status:toStatus}});
    await load();
    byId('status').textContent=msg('saved');
  }catch{
    byId('status').textContent=msg('error');
  }finally{
    button.disabled=false;
  }
}

function itemCard(item,type){
  const article=document.createElement('article');
  const title=document.createElement('strong');
  const meta=document.createElement('p');
  if(type==='assignment'){
    title.textContent=`${trackLabel(item.track_code)} · ${item.status}`;
    meta.textContent=`${msg('due')}: ${new Intl.DateTimeFormat(state.locale,{dateStyle:'medium'}).format(new Date(item.due_at))} · ${item.item_count} ${msg('items')}`;
    if(state.role==='teacher'&&(item.status==='ASSIGNED'||item.status==='IN_PROGRESS')){
      const button=document.createElement('button');
      const toStatus=item.status==='ASSIGNED'?'IN_PROGRESS':'COMPLETED';
      button.type='button';
      button.className='assignment-transition';
      button.textContent=msg(item.status==='ASSIGNED'?'start':'complete');
      button.addEventListener('click',()=>transitionAssignment(item,toStatus,button));
      article.append(title,meta,button);
      return article;
    }
  }else{
    title.textContent=`${item.reason_code} · ${item.priority}`;
    meta.textContent=item.status;
  }
  article.append(title,meta);
  return article;
}

function render(data){
  state.overview=data;
  byId('gradeValue').textContent=data.grade_code;
  byId('scoreValue').textContent=`${data.readiness.score}/100`;
  byId('trackValue').textContent=trackLabel(data.readiness.recommended_track);
  byId('evidenceValue').textContent=data.readiness.evidence_status;
  byId('planTitle').textContent=trackLabel(data.recommended_plan.track_code);
  byId('planMeta').textContent=`${data.recommended_plan.sessions_per_week} ${msg('sessions')} · ${data.recommended_plan.formula_count} ${msg('formulas')}`;
  byId('assignmentList').replaceChildren(...(data.assignments.length?data.assignments.map(item=>itemCard(item,'assignment')):[Object.assign(document.createElement('p'),{textContent:msg('empty')})]));
  byId('interventionList').replaceChildren(...(data.interventions.length?data.interventions.map(item=>itemCard(item,'intervention')):[Object.assign(document.createElement('p'),{textContent:msg('empty')})]));
  byId('teacherActions').hidden=!data.capabilities.assign;
  byId('interventionsTitle').parentElement.hidden=state.role==='parent';
  byId('console').hidden=false;
  byId('status').textContent='';
}

async function load(){
  byId('status').textContent=msg('loading');
  render(await api(`/api/v1/operations/students/${state.studentId}/overview`));
}

byId('assignButton').addEventListener('click',async()=>{
  try{
    byId('assignButton').disabled=true;
    await api(`/api/v1/operations/students/${state.studentId}/assignments`,{method:'POST',body:{curriculum_id:state.overview.recommended_plan.id,due_at:new Date(Date.now()+7*86400000).toISOString()}});
    await load();
    byId('status').textContent=msg('saved');
  }catch{
    byId('status').textContent=msg('error');
  }finally{
    byId('assignButton').disabled=false;
  }
});

byId('interveneButton').addEventListener('click',async()=>{
  try{
    byId('interveneButton').disabled=true;
    await api(`/api/v1/operations/students/${state.studentId}/interventions`,{method:'POST',body:{reason_code:'RECALL_GAP',priority:'WATCH',action_code:'SCHEDULE_RECALL'}});
    await load();
    byId('status').textContent=msg('saved');
  }catch{
    byId('status').textContent=msg('error');
  }finally{
    byId('interveneButton').disabled=false;
  }
});

byId('localeSelect').addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('locale',byId('localeSelect').value);location.href=url;});

async function boot(){
  state.locale=localeFromUrl();
  state.role=new URLSearchParams(location.search).get('role')==='parent'?'parent':'teacher';
  for(const id of ['teacherRole','parentRole']){const url=new URL(byId(id).href,location.href);url.searchParams.set('locale',state.locale);byId(id).href=url;}
  applyCopy();
  try{
    const session=await api(`/api/v1/local-demo/${state.role}/session`,{method:'POST'});
    state.token=session.access_token;
    state.studentId=session.student_id;
    await load();
  }catch{
    byId('status').textContent=msg('error');
  }
}

boot();
