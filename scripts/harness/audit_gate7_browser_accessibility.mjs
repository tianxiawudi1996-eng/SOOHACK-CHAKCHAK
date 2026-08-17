#!/usr/bin/env node

import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const siteRoot = resolve(root, 'artifacts/release-candidate/stage8-v1.0/artifact/v0.1.0/site');
const evidenceRoot = resolve(root, 'docs/stage8/evidence/gate7');
const outputPath = resolve(evidenceRoot, 'GATE7_BROWSER_ACCESSIBILITY_QA_v1.0.json');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.webp', 'image/webp'], ['.png', 'image/png'],
]);

async function resolveBrowser() {
  const candidates = [
    { name: 'Google Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    { name: 'Microsoft Edge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
    { name: 'Microsoft Edge', path: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' },
  ];
  for (const candidate of candidates) {
    try { await access(candidate.path); return candidate; } catch {}
  }
  throw new Error('CHROMIUM_EXECUTABLE_NOT_FOUND');
}

async function loadPlaywright() {
  const moduleRoot = process.env.CODEX_WORKSPACE_NODE_MODULES
    || join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules');
  const entry = join(moduleRoot, 'playwright', 'index.mjs');
  await access(entry);
  return import(pathToFileURL(entry).href);
}

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      if (url.pathname === '/favicon.ico') {
        response.writeHead(204, { 'cache-control': 'no-store' });
        response.end();
        return;
      }
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const relative = normalize(pathname).replace(/^[/\\]+/, '');
      let absolute = resolve(siteRoot, relative);
      if (!absolute.startsWith(`${siteRoot}\\`) && absolute !== siteRoot) throw new Error('PATH_OUTSIDE_SITE');
      if ((await stat(absolute)).isDirectory()) absolute = resolve(absolute, 'index.html');
      const bytes = await readFile(absolute);
      response.writeHead(200, {
        'content-type': mime.get(extname(absolute).toLowerCase()) || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(bytes);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
}

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  return server.address().port;
}

function addCheck(result, id, passed, observed) {
  result.checks[id] = { status: passed ? 'PASS' : 'FAIL', observed };
  if (!passed) result.failures.push(id);
}

const result = {
  schema_version: '1.0.0',
  project: 'MathChakChak',
  stage: 8,
  gate: 7,
  tested_at: new Date().toISOString(),
  status: 'FAIL',
  target: 'FROZEN_LOCAL_RELEASE_CANDIDATE',
  browser: null,
  checks: {},
  failures: [],
  claim_boundary: 'Automated browser and accessibility-tree inspection; no claim of a human screen-reader session.',
};
const server = createServer();
let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  const [{ chromium }, selected] = await Promise.all([loadPlaywright(), resolveBrowser()]);
  result.browser = `${selected.name} headless through Playwright`;
  result.target_url = `${baseUrl}/?locale=ko`;
  browser = await chromium.launch({ executablePath: selected.path, headless: true, args: ['--disable-gpu', '--disable-extensions'] });

  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(result.target_url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.mathChakChakPets) && Boolean(window.mathChakChakBehavior));

  const semantics = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    mainCount: document.querySelectorAll('main#main').length,
    h1Count: document.querySelectorAll('h1').length,
    liveRegionCount: document.querySelectorAll('[aria-live]').length,
    emptyVisibleImageAltCount: [...document.images].filter((image) => image.getClientRects().length > 0 && !image.alt.trim()).length,
    labelledNavigationCount: document.querySelectorAll('nav[aria-label]').length,
  }));
  addCheck(
    result,
    'screen_reader_semantics',
    semantics.lang === 'ko' && semantics.mainCount === 1 && semantics.h1Count === 1 && semantics.liveRegionCount >= 2 && semantics.emptyVisibleImageAltCount === 0 && semantics.labelledNavigationCount >= 1,
    semantics,
  );

  const cdp = await context.newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const axTree = await cdp.send('Accessibility.getFullAXTree');
  const roleCounts = {};
  for (const node of axTree.nodes || []) {
    const role = node.role?.value;
    if (role) roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  addCheck(
    result,
    'chromium_accessibility_tree',
    (roleCounts.main || 0) >= 1 && (roleCounts.heading || 0) >= 1 && (roleCounts.link || 0) >= 3,
    { nodeCount: axTree.nodes?.length || 0, roleCounts },
  );

  await page.keyboard.press('Tab');
  const firstFocus = await page.evaluate(() => ({
    className: document.activeElement?.className || '',
    href: document.activeElement?.getAttribute?.('href') || null,
    outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
    outlineWidth: getComputedStyle(document.activeElement).outlineWidth,
  }));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  const focusAfterSkip = await page.evaluate(() => ({
    id: document.activeElement?.id || null,
    hash: location.hash,
  }));
  addCheck(
    result,
    'keyboard_skip_and_visible_focus',
    firstFocus.className.includes('skip-link') && firstFocus.href === '#main' && firstFocus.outlineStyle !== 'none' && focusAfterSkip.hash === '#main',
    { firstFocus, focusAfterSkip },
  );

  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  await page.waitForTimeout(100);
  const zoom = await page.evaluate(() => ({
    visualViewportScale: window.visualViewport?.scale || 1,
    mainPresent: Boolean(document.querySelector('main#main')),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  await page.screenshot({ path: resolve(evidenceRoot, 'landing-200-percent-zoom.png'), fullPage: false });
  addCheck(result, 'zoom_200_percent', zoom.visualViewportScale >= 1.9 && zoom.mainPresent, zoom);
  await context.close();

  const reducedContext = await browser.newContext({ viewport: { width: 768, height: 1024 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.route('**/poses/webp/**p04_think**', (route) => route.abort('failed'));
  await reducedPage.goto(result.target_url, { waitUntil: 'networkidle' });
  await reducedPage.waitForFunction(() => Boolean(window.mathChakChakPets));
  const reduced = await reducedPage.evaluate(async () => {
    const accepted = window.mathChakChakPets.setState('THINK', 'gate7-reduced-motion-fallback');
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    const roots = [...document.querySelectorAll('[data-pet-character]')];
    const images = [...document.querySelectorAll('[data-pet-image]')];
    return {
      apiReducedMotion: window.mathChakChakPets.isReducedMotion(),
      accepted,
      states: roots.map((root) => root.dataset.petState),
      phases: roots.map((root) => root.dataset.petPhase),
      transitioningCount: document.querySelectorAll('.is-pet-transitioning').length,
      imageSources: images.map((image) => image.currentSrc || image.src),
      imageLoaded: images.map((image) => image.complete && image.naturalWidth > 0),
    };
  });
  addCheck(
    result,
    'reduced_motion_static_swap',
    reduced.apiReducedMotion === true && reduced.accepted === true && reduced.states.every((state) => state === 'THINK') && reduced.phases.every((phase) => phase === 'steady') && reduced.transitioningCount === 0,
    reduced,
  );
  addCheck(
    result,
    'webp_to_png_fallback',
    reduced.imageSources.every((source) => source.endsWith('.png')) && reduced.imageLoaded.every(Boolean),
    { imageSources: reduced.imageSources, imageLoaded: reduced.imageLoaded },
  );
  await reducedContext.close();

  result.status = result.failures.length === 0 ? 'PASS' : 'FAIL';
} catch (error) {
  result.failures.push(`RUNTIME_ERROR:${error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

console.log(`GATE7_BROWSER_ACCESSIBILITY_${result.status}`);
console.log(`checks=${Object.values(result.checks).filter((item) => item.status === 'PASS').length}/${Object.keys(result.checks).length}`);
console.log(`failures=${result.failures.length}`);
process.exitCode = result.status === 'PASS' ? 0 : 1;
