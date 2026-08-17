#!/usr/bin/env node

import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT = resolve(ROOT, 'docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_BROWSER_RUNTIME_QA_v1.0.json');
const TARGET_URL = 'http://127.0.0.1:4174/docs/stage8/evidence/2d-pet/v1.0/gate5-review/';
const EVENTS = ['page.enter.home','learning.start','concept.open','input.started','idle.4s','hint.request','answer.correct','answer.wrong.first','answer.wrong.repeated','search.loading.5s','search.empty','diagnosis.complete','learning.complete','network.error','idle.3m'];

async function resolveBrowser() {
  const candidates = [
    { name:'Google Chrome', path:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    { name:'Microsoft Edge', path:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
    { name:'Microsoft Edge', path:'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' },
  ];
  for (const candidate of candidates) { try { await access(candidate.path); return candidate; } catch {} }
  throw new Error('A Chromium browser executable was not found');
}

async function loadPlaywright() {
  const moduleRoot = process.env.CODEX_WORKSPACE_NODE_MODULES
    || join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules');
  const entry = join(moduleRoot, 'playwright', 'index.mjs');
  await access(entry);
  return import(pathToFileURL(entry).href);
}

function addTest(result, name, pass, observed) {
  result.tests[name] = { status: pass ? 'PASS' : 'FAIL', observed };
  if (!pass) result.failures.push(name.toUpperCase());
}

async function run() {
  const result = { schema_version:'1.0.0', generated_at:new Date().toISOString(), gate:5, target_url:TARGET_URL, browser:'Chromium headless through Playwright', status:'FAIL', tests:{}, failures:[] };
  let browser;
  try {
    const [{ chromium }, selected] = await Promise.all([loadPlaywright(), resolveBrowser()]);
    result.browser = `${selected.name} headless through Playwright`;
    browser = await chromium.launch({ executablePath:selected.path, headless:true, args:['--disable-gpu','--disable-extensions'] });
    const context = await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'no-preference' });
    const page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil:'load', timeout:15000 });
    await page.waitForFunction(() => Boolean(window.mathChakChakBehavior) && Boolean(window.mathChakChakPets));

    const api = await page.evaluate(() => ({states:mathChakChakBehavior.states.length,events:mathChakChakBehavior.events,bubbles:mathChakChakBehavior.bubbles.length,characters:document.querySelectorAll('[data-pet-character]').length,triggers:document.querySelectorAll('[data-ai-event-trigger]').length}));
    addTest(result,'api_contract',api.states===15 && api.events.length===15 && JSON.stringify(api.events)===JSON.stringify(EVENTS) && api.bubbles===13 && api.characters===2 && api.triggers===15,api);

    const matrix = await page.evaluate((triggers) => triggers.map((trigger) => { mathChakChakBehavior.reset(); const outcome=mathChakChakBehavior.simulate(trigger); const snapshot=mathChakChakBehavior.getSnapshot(); return {trigger,status:outcome.status,eventId:outcome.eventId,current:snapshot.current?.id||null,logCount:snapshot.logs.length}; }), EVENTS);
    addTest(result,'event_matrix',matrix.length===15 && matrix.every((item) => item.eventId && item.status.startsWith('APPLIED') && item.current===item.eventId),matrix);

    const priority = await page.evaluate(() => { mathChakChakBehavior.reset(); mathChakChakBehavior.simulate('idle.3m'); const outcome=mathChakChakBehavior.simulate('network.error'); return {outcome,current:mathChakChakBehavior.getSnapshot().current}; });
    addTest(result,'priority_preemption',priority.outcome.status==='APPLIED_PREEMPTED_LOWER_PRIORITY' && priority.current.id==='EVT-014',priority);

    const queue = await page.evaluate(() => { mathChakChakBehavior.reset(); mathChakChakBehavior.simulate('learning.start'); mathChakChakBehavior.simulate('hint.request'); mathChakChakBehavior.simulate('search.empty'); return mathChakChakBehavior.getSnapshot(); });
    addTest(result,'single_queue',queue.queued?.id==='EVT-006' && queue.logs.at(-1).status==='QUEUED',queue);

    await page.locator('input[name="gate5-input-test"]').focus();
    const input = await page.evaluate(() => { const idle=mathChakChakBehavior.simulate('idle.4s'); const error=mathChakChakBehavior.simulate('network.error'); return {idle:idle.status,error:error.status,inputProtected:mathChakChakBehavior.getSnapshot().inputProtected}; });
    addTest(result,'input_protection',input.inputProtected && input.idle==='SUPPRESSED_INPUT_PROTECTION' && input.error.startsWith('APPLIED'),input);

    const privacy = await page.evaluate(() => { const logs=mathChakChakBehavior.getSnapshot().logs; return {keys:[...new Set(logs.flatMap(Object.keys))].sort(),serialized:JSON.stringify(logs)}; });
    const allowedKeys = ['bubbleId','eventId','motionState','sequence','state','status','trigger'];
    addTest(result,'privacy_log',JSON.stringify(privacy.keys)===JSON.stringify(allowedKeys) && !privacy.serialized.includes('gate5-input-test'),privacy);

    await page.locator('[data-ai-hide-toggle]').click();
    const visibility = await page.evaluate(() => ({pressed:document.querySelector('[data-ai-hide-toggle]').getAttribute('aria-pressed'),rootVisibility:[...document.querySelectorAll('[data-pet-character]')].map((root)=>getComputedStyle(root).visibility),controlsVisibility:getComputedStyle(document.querySelector('.event-grid')).visibility}));
    addTest(result,'mascot_hidden_mode',visibility.pressed==='true' && visibility.rootVisibility.every((item)=>item==='hidden') && visibility.controlsVisibility==='visible',visibility);
    await page.locator('[data-ai-hide-toggle]').click();

    const viewports=[];
    for (const viewport of [{name:'mobile',width:360,height:800},{name:'desktop',width:1440,height:1000}]) {
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      const observed=await page.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.querySelectorAll('[data-pet-image]')].map((image)=>image.complete&&image.naturalWidth>0),bubblePointer:getComputedStyle(document.querySelector('[data-ai-bubble-cta]')).pointerEvents}));
      viewports.push({...viewport,observed,status:(!observed.overflow&&observed.images.every(Boolean)&&observed.bubblePointer!=='none')?'PASS':'FAIL'});
    }
    addTest(result,'viewport_and_pointer',viewports.every((item)=>item.status==='PASS'),viewports);
    await context.close();

    const reducedContext = await browser.newContext({ viewport:{width:800,height:900}, reducedMotion:'reduce' });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(TARGET_URL, { waitUntil:'load', timeout:15000 });
    await reducedPage.waitForFunction(() => Boolean(window.mathChakChakBehavior) && Boolean(window.mathChakChakPets));
    const reduced=await reducedPage.evaluate(() => { mathChakChakBehavior.reset(); mathChakChakBehavior.simulate('answer.correct'); const roots=[...document.querySelectorAll('[data-pet-character]')]; return {motionReduced:mathChakChakPets.isReducedMotion(),transitions:roots.map((root)=>getComputedStyle(root).transitionDuration),phases:roots.map((root)=>root.dataset.petPhase)}; });
    addTest(result,'reduced_motion',reduced.motionReduced && reduced.transitions.every((value)=>value==='0s') && reduced.phases.every((value)=>value==='steady'),reduced);
    await reducedContext.close();
    result.status = result.failures.length ? 'FAIL' : 'PASS';
  } catch (error) { result.failures.push(`RUNTIME_ERROR:${error.message}`); }
  finally {
    if (browser) await browser.close();
    await mkdir(dirname(OUTPUT),{recursive:true});
    await writeFile(OUTPUT,`${JSON.stringify(result,null,2)}\n`,'utf8');
  }
  console.log('GATE5_BROWSER_RUNTIME_AUDIT_WRITTEN'); console.log(`status=${result.status}`); console.log(`failures=${result.failures.length}`);
  process.exitCode=result.status==='PASS'?0:1;
}

await run();
