import {authMessages,supportedLocales} from './messages.mjs';
import {readPreferredLocale,writePreferredLocale} from '../i18n/preferred-locale.mjs';

const select=document.querySelector('#localeSelect');
const providerButtons=[...document.querySelectorAll('[data-provider]')];
const roleInputs=[...document.querySelectorAll('input[name="role"]')];
const loginPanel=document.querySelector('#loginPanel');
const sessionPanel=document.querySelector('#sessionPanel');
const summary=document.querySelector('#sessionSummary');
const form=document.querySelector('#onboardingForm');
const studentFields=document.querySelector('#studentFields');
const academyFields=document.querySelector('#academyFields');
const continueLink=document.querySelector('#continueLink');
const logoutButton=document.querySelector('#logoutButton');
const providerNote=document.querySelector('#providerNote');
const notice=document.querySelector('#notice');
let locale='en';
let messages=authMessages(locale);
let providerState={};
let selectedRole=null;
let currentSession=null;

const normalize=(value='')=>supportedLocales.find(item=>item.toLowerCase()===String(value).toLowerCase())||supportedLocales.find(item=>item.split('-')[0]===String(value).toLowerCase().split('-')[0])||null;
const resolveLocale=()=>normalize(new URLSearchParams(location.search).get('locale'))||normalize(readPreferredLocale())||normalize(navigator.language)||'en';
const safeReturnTo=(value)=>typeof value==='string'&&value.length<=512&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')?value:null;
const t=(key)=>messages[key]||authMessages('en')[key]||key;
const cookie=(name)=>document.cookie.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${name}=`))?.slice(name.length+1)||'';
const requestedReturnTo=safeReturnTo(new URL(location.href).searchParams.get('return_to'));
const returnTarget=()=>requestedReturnTo||`/?locale=${encodeURIComponent(locale)}`;

function applyLocale(next,{persist=false}={}){
  locale=normalize(next)||'en'; messages=authMessages(locale); document.documentElement.lang=locale; select.value=locale;
  document.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=t(element.dataset.i18n);});
  if(persist){writePreferredLocale(locale);const url=new URL(location.href);url.searchParams.set('locale',locale);history.replaceState({},'',url);}
}

function showNotice(key){notice.textContent=t(key);notice.hidden=false;setTimeout(()=>{notice.hidden=true;},5000);}

function updateProviders(){
  for(const button of providerButtons){const ready=Boolean(selectedRole&&providerState[button.dataset.provider]);button.disabled=!ready;button.setAttribute('aria-disabled',String(!ready));}
  providerNote.textContent=selectedRole&&!Object.values(providerState).some(Boolean)?t('provider.unavailable'):selectedRole?t('provider.body'):t('provider.chooseRole');
}

async function loadProviders(){
  try{
    const response=await fetch('/api/v1/auth/providers',{credentials:'include'});const payload=await response.json();
    providerState=Object.fromEntries((payload.data?.providers||[]).map(item=>[item.provider,item.configured]));
  }catch{providerState={};}
  updateProviders();
}

function showSession(session){
  currentSession=session;loginPanel.hidden=true;sessionPanel.hidden=false;
  const active=session.account_status==='ACTIVE'&&session.auth_level==='FULL';
  continueLink.href=returnTarget();
  summary.textContent=t(active?'session.active':'session.pending');continueLink.hidden=!active;form.hidden=active;
  studentFields.hidden=session.role!=='STUDENT';academyFields.hidden=!['ACADEMY_OWNER','TEACHER'].includes(session.role);
}

async function loadSession(){
  const response=await fetch('/api/v1/auth/session',{credentials:'include'});
  if(!response.ok)return;
  const payload=await response.json();if(payload.data?.authenticated)showSession(payload.data);
}

for(const input of roleInputs)input.addEventListener('change',()=>{selectedRole=input.value;updateProviders();});
for(const button of providerButtons)button.addEventListener('click',()=>{
  if(!selectedRole)return;
  if(!providerState[button.dataset.provider]){showNotice('provider.unavailable');return;}
  const returnTo=returnTarget();
  location.assign(`/api/v1/auth/oauth/${button.dataset.provider.toLowerCase()}/start?role=${encodeURIComponent(selectedRole)}&locale=${encodeURIComponent(locale)}&return_to=${encodeURIComponent(returnTo)}`);
});

form.addEventListener('submit',async(event)=>{
  event.preventDefault();if(!currentSession)return;
  const data=new FormData(form);const body={terms_version:'MCC-TERMS-2026-01'};
  if(currentSession.role==='STUDENT'){body.grade_code=data.get('grade_code');body.age_assurance=data.get('age_assurance');}
  if(['ACADEMY_OWNER','TEACHER'].includes(currentSession.role))body.academy_reference=data.get('academy_reference');
  const response=await fetch('/api/v1/auth/onboarding',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-csrf-token':decodeURIComponent(cookie('mcc_csrf'))},body:JSON.stringify(body)});
  if(!response.ok){showNotice('notice.failed');return;}
  showNotice('notice.saved');location.reload();
});

logoutButton.addEventListener('click',async()=>{
  const response=await fetch('/api/v1/auth/logout',{method:'POST',credentials:'include',headers:{'x-csrf-token':decodeURIComponent(cookie('mcc_csrf'))}});
  if(!response.ok){showNotice('notice.failed');return;}location.assign(`./?locale=${encodeURIComponent(locale)}`);
});
select.addEventListener('change',()=>applyLocale(select.value,{persist:true}));
applyLocale(resolveLocale());
await Promise.all([loadProviders(),loadSession().catch(()=>{})]);
