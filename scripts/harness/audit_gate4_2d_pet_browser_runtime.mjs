#!/usr/bin/env node

import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT = resolve(ROOT, 'docs/stage8/evidence/2d-pet/v1.0/GATE4_2D_PET_BROWSER_RUNTIME_QA_v1.0.json');
const REQUESTED_DEBUG_PORT = Number(process.env.GATE4_EDGE_DEBUG_PORT || 0);
const TARGET_URL = 'http://127.0.0.1:4174/docs/stage8/evidence/2d-pet/v1.0/gate4-review/';
const STATES = ['IDLE_LISTEN', 'WELCOME', 'GUIDE', 'THINK', 'PRAISE_PROGRESS', 'SEARCH', 'CELEBRATE', 'RETRY'];
const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 800, deviceScaleFactor: 1, mobile: true },
  { name: 'tablet', width: 768, height: 1024, deviceScaleFactor: 1, mobile: true },
  { name: 'desktop', width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
];

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

async function waitForDebugger(debugPort) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (!response.ok) throw new Error(`debug endpoint HTTP ${response.status}`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`Edge debugger did not become ready: ${lastError?.message || 'no page target'}`);
}

async function launchEdge() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  let executable;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      executable = candidate;
      break;
    } catch {
      // Continue to the next standard installation path.
    }
  }
  if (!executable) throw new Error('Microsoft Edge executable was not found');

  const profilePath = join(tmpdir(), `mathchakchak-gate4-edge-${Date.now()}`);
  await mkdir(profilePath, { recursive: true });
  const browserProcess = spawn(executable, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profilePath}`,
    '--no-first-run',
    '--disable-gpu',
    '--disable-extensions',
    '--remote-allow-origins=*',
    TARGET_URL,
  ], { stdio: 'ignore', windowsHide: true });

  const activePortPath = join(profilePath, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const [portLine] = (await readFile(activePortPath, 'utf8')).trim().split(/\r?\n/);
      const debugPort = Number(portLine);
      if (Number.isInteger(debugPort) && debugPort > 0) {
        return { browserProcess, debugPort, executable, profilePath };
      }
    } catch {
      // Edge writes DevToolsActivePort after its browser process is ready.
    }
    await sleep(250);
  }
  browserProcess.kill();
  throw new Error('Microsoft Edge did not publish its DevTools port');
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolvePending, rejectPending } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) rejectPending(new Error(`${message.error.code}: ${message.error.message}`));
      else resolvePending(message.result || {});
    });
    await new Promise((resolveOpen, rejectOpen) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', () => rejectOpen(new Error('CDP WebSocket connection failed')), { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolvePending, rejectPending) => {
      this.pending.set(id, { resolvePending, rejectPending });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'browser evaluation failed');
    }
    return response.result?.value;
  }

  close() {
    this.socket?.close();
  }
}

async function waitForPage(client) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const ready = await client.evaluate(`document.readyState === 'complete' && Boolean(window.mathChakChakPets)`);
    if (ready) return;
    await sleep(100);
  }
  throw new Error('Gate 4 review page did not expose its motion API');
}

function sequenceExpression(states) {
  return `(async () => {
    const states = ${JSON.stringify(states)};
    const observations = [];
    for (const state of states) {
      window.mathChakChakPets.setState(state, 'browser-runtime-audit');
      await new Promise((resolveWait) => setTimeout(resolveWait, 760));
      const roots = [...document.querySelectorAll('[data-pet-character]')];
      observations.push({
        requested: state,
        states: roots.map((root) => root.dataset.petState),
        phases: roots.map((root) => root.dataset.petPhase),
        outgoingLayers: document.querySelectorAll('.pet-motion-outgoing').length,
        activeMotionClasses: document.querySelectorAll('.pet-motion-preparing,.pet-motion-incoming,.pet-motion-settling').length,
        imageCount: document.querySelectorAll('[data-pet-image]').length,
      });
    }
    return observations;
  })()`;
}

function sequencePass(observations) {
  return observations.length === STATES.length && observations.every((item) =>
    item.states.length === 2
    && item.states.every((state) => state === item.requested)
    && item.phases.every((phase) => phase === 'steady')
    && item.outgoingLayers === 0
    && item.activeMotionClasses === 0
    && item.imageCount === 2
  );
}

async function run() {
  const generatedAt = new Date().toISOString();
  let client;
  let browserLaunch;
  const result = {
    schema_version: '1.0.0',
    generated_at: generatedAt,
    gate: 4,
    target_url: TARGET_URL,
    browser: 'Microsoft Edge headless via Chrome DevTools Protocol',
    status: 'FAIL',
    tests: {},
    failures: [],
  };

  try {
    browserLaunch = REQUESTED_DEBUG_PORT > 0 ? null : await launchEdge();
    const debugPort = browserLaunch?.debugPort || REQUESTED_DEBUG_PORT;
    result.browser_launch = browserLaunch
      ? { mode: 'SELF_LAUNCHED_HEADLESS', executable: browserLaunch.executable }
      : { mode: 'EXTERNAL_DEBUG_PORT', debug_port: debugPort };
    const target = await waitForDebugger(debugPort);
    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await client.send('Page.navigate', { url: TARGET_URL });
    await sleep(500);
    await waitForPage(client);

    const api = await client.evaluate(`({
      stateCount: window.mathChakChakPets.states.length,
      states: window.mathChakChakPets.states,
      choreography: window.mathChakChakPets.choreography,
      characters: document.querySelectorAll('[data-pet-character]').length,
      buttons: document.querySelectorAll('[data-pet-state-trigger]').length,
      reducedMotion: window.mathChakChakPets.isReducedMotion(),
    })`);
    const apiPass = api.stateCount === 8
      && JSON.stringify(api.states) === JSON.stringify(STATES)
      && api.characters === 2
      && api.buttons === 8
      && api.choreography.prepareMs === 120
      && api.choreography.bridgeMs === 320
      && api.choreography.settleMs === 240
      && api.reducedMotion === false;
    result.tests.api_contract = { status: apiPass ? 'PASS' : 'FAIL', observed: api };
    if (!apiPass) result.failures.push('API_CONTRACT_INVALID');

    await client.evaluate(`(() => {
      window.__gate4LayoutShift = 0;
      window.__gate4LayoutObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__gate4LayoutShift += entry.value;
      });
      window.__gate4LayoutObserver.observe({ type: 'layout-shift', buffered: true });
      return true;
    })()`);

    const forward = await client.evaluate(sequenceExpression(STATES));
    const forwardPass = sequencePass(forward);
    result.tests.forward_sequence = { status: forwardPass ? 'PASS' : 'FAIL', observations: forward };
    if (!forwardPass) result.failures.push('FORWARD_SEQUENCE_INVALID');

    const reverse = await client.evaluate(sequenceExpression([...STATES].reverse()));
    const reversePass = sequencePass(reverse);
    result.tests.reverse_sequence = { status: reversePass ? 'PASS' : 'FAIL', observations: reverse };
    if (!reversePass) result.failures.push('REVERSE_SEQUENCE_INVALID');

    const rapid = await client.evaluate(`(async () => {
      const states = ${JSON.stringify(STATES)};
      for (const state of states) {
        window.mathChakChakPets.setState(state, 'browser-runtime-rapid-input');
        await new Promise((resolveWait) => setTimeout(resolveWait, 35));
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 760));
      const roots = [...document.querySelectorAll('[data-pet-character]')];
      return {
        expected: states.at(-1),
        states: roots.map((root) => root.dataset.petState),
        phases: roots.map((root) => root.dataset.petPhase),
        outgoingLayers: document.querySelectorAll('.pet-motion-outgoing').length,
        activeMotionClasses: document.querySelectorAll('.pet-motion-preparing,.pet-motion-incoming,.pet-motion-settling').length,
        imageCount: document.querySelectorAll('[data-pet-image]').length,
      };
    })()`);
    const rapidPass = rapid.states.every((state) => state === rapid.expected)
      && rapid.phases.every((phase) => phase === 'steady')
      && rapid.outgoingLayers === 0
      && rapid.activeMotionClasses === 0
      && rapid.imageCount === 2;
    result.tests.rapid_latest_wins = { status: rapidPass ? 'PASS' : 'FAIL', observed: rapid };
    if (!rapidPass) result.failures.push('RAPID_INPUT_LATEST_WINS_FAILED');

    const layoutShift = await client.evaluate(`window.__gate4LayoutShift || 0`);
    const layoutPass = layoutShift < 0.01;
    result.tests.layout_stability = { status: layoutPass ? 'PASS' : 'FAIL', cumulative_layout_shift: layoutShift, maximum: 0.01 };
    if (!layoutPass) result.failures.push('LAYOUT_SHIFT_EXCEEDED');

    const viewportResults = [];
    for (const viewport of VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', viewport);
      await sleep(200);
      const observed = await client.evaluate(`(() => {
        const tolerance = 1;
        const characters = [...document.querySelectorAll('[data-pet-character]')].map((root) => {
          const rect = root.getBoundingClientRect();
          const image = root.querySelector('[data-pet-image]');
          const imageRect = image.getBoundingClientRect();
          return {
            character: root.dataset.petCharacter,
            cardInsideViewport: rect.left >= -tolerance && rect.right <= innerWidth + tolerance,
            imageInsideCard: imageRect.left >= rect.left - tolerance && imageRect.right <= rect.right + tolerance && imageRect.top >= rect.top - tolerance && imageRect.bottom <= rect.bottom + tolerance,
            imageLoaded: image.complete && image.naturalWidth > 0,
            clearance: {
              top: Number((imageRect.top - rect.top).toFixed(2)),
              right: Number((rect.right - imageRect.right).toFixed(2)),
              bottom: Number((rect.bottom - imageRect.bottom).toFixed(2)),
              left: Number((imageRect.left - rect.left).toFixed(2)),
            },
          };
        });
        const button = document.querySelector('[data-pet-state-trigger="RETRY"]');
        button.scrollIntoView({ block: 'center' });
        const buttonRect = button.getBoundingClientRect();
        const hit = document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2);
        return {
          innerWidth,
          innerHeight,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + tolerance,
          characters,
          retryButtonReceivesPointer: Boolean(hit?.closest('[data-pet-state-trigger="RETRY"]')),
        };
      })()`);
      const pass = !observed.horizontalOverflow
        && observed.retryButtonReceivesPointer
        && observed.characters.length === 2
        && observed.characters.every((character) => character.cardInsideViewport && character.imageInsideCard && character.imageLoaded);
      viewportResults.push({ ...viewport, status: pass ? 'PASS' : 'FAIL', observed });
      if (!pass) result.failures.push(`VIEWPORT_${viewport.name.toUpperCase()}_FAILED`);
    }
    result.tests.viewport_and_pointer = {
      status: viewportResults.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL',
      viewports: viewportResults,
    };

    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await client.send('Page.navigate', { url: TARGET_URL });
    await sleep(500);
    await waitForPage(client);
    const reduced = await client.evaluate(`(async () => {
      window.mathChakChakPets.setState('CELEBRATE', 'browser-runtime-reduced-motion');
      await new Promise((resolveWait) => setTimeout(resolveWait, 80));
      const roots = [...document.querySelectorAll('[data-pet-character]')];
      return {
        mediaMatches: window.mathChakChakPets.isReducedMotion(),
        states: roots.map((root) => root.dataset.petState),
        phases: roots.map((root) => root.dataset.petPhase),
        outgoingLayers: document.querySelectorAll('.pet-motion-outgoing').length,
        activeMotionClasses: document.querySelectorAll('.pet-motion-preparing,.pet-motion-incoming,.pet-motion-settling').length,
        animationNames: roots.map((root) => getComputedStyle(root.querySelector('[data-pet-image]')).animationName),
      };
    })()`);
    const reducedPass = reduced.mediaMatches
      && reduced.states.every((state) => state === 'CELEBRATE')
      && reduced.phases.every((phase) => phase === 'steady')
      && reduced.outgoingLayers === 0
      && reduced.activeMotionClasses === 0
      && reduced.animationNames.every((name) => name === 'none');
    result.tests.reduced_motion_runtime = { status: reducedPass ? 'PASS' : 'FAIL', observed: reduced };
    if (!reducedPass) result.failures.push('REDUCED_MOTION_RUNTIME_FAILED');

    result.status = result.failures.length === 0 ? 'PASS' : 'FAIL';
  } catch (error) {
    result.failures.push(`RUNTIME_ERROR:${error.message}`);
  } finally {
    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    if (client) {
      try {
        await Promise.race([client.send('Browser.close'), sleep(1000)]);
      } catch {
        // The browser may close its socket before acknowledging Browser.close.
      }
      client.close();
    }
    if (browserLaunch) {
      await sleep(750);
      if (browserLaunch.browserProcess.exitCode === null) browserLaunch.browserProcess.kill();
      const expectedPrefix = join(tmpdir(), 'mathchakchak-gate4-edge-');
      if (browserLaunch.profilePath.startsWith(expectedPrefix)) {
        let cleanupError;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          try {
            await rm(browserLaunch.profilePath, { recursive: true, force: true });
            cleanupError = null;
            break;
          } catch (error) {
            cleanupError = error;
            await sleep(250);
          }
        }
        if (cleanupError) console.warn(`temporary Edge profile cleanup deferred: ${cleanupError.code || cleanupError.message}`);
      }
    }
  }

  console.log('GATE4_BROWSER_RUNTIME_AUDIT_WRITTEN');
  console.log(`status=${result.status}`);
  console.log(`failures=${result.failures.length}`);
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}

await run();
