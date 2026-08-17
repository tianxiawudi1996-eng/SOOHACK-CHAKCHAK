#!/usr/bin/env node

import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const siteRoot = resolve(root, 'artifacts/staging/v0.1.0/site');
const outputRoot = resolve(root, 'docs/stage8/evidence/gate6/responsive');
const outputPath = resolve(root, 'docs/stage8/evidence/gate6/GATE6_RESPONSIVE_RUNTIME_QA_v1.0.json');
const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'compact-desktop-1024', width: 1024, height: 900 },
  { name: 'desktop-1200', width: 1200, height: 900 },
];
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.webp', 'image/webp'], ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'], ['.ico', 'image/x-icon'],
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

function createStaticServer() {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/favicon.ico') {
        response.writeHead(204, { 'cache-control': 'no-store' });
        response.end();
        return;
      }
      if (pathname.endsWith('/')) pathname += 'index.html';
      const relative = normalize(pathname).replace(/^[/\\]+/, '');
      let absolute = resolve(siteRoot, relative);
      if (!absolute.startsWith(`${siteRoot}\\`) && absolute !== siteRoot) throw new Error('PATH_OUTSIDE_SITE');
      const info = await stat(absolute);
      if (info.isDirectory()) absolute = resolve(absolute, 'index.html');
      const bytes = await readFile(absolute);
      response.writeHead(200, {
        'content-type': mime.get(extname(absolute).toLowerCase()) || 'application/octet-stream',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
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

async function run() {
  const result = {
    schema_version: '1.0.0', project: 'MathChakChak', stage: 8, gate: 6,
    tested_at: new Date().toISOString(), status: 'FAIL', browser: null, target: 'LOCAL_ISOLATED_STAGING_ARTIFACT',
    viewports: [], route_checks: {}, failures: [], external_deployment_performed: false,
  };
  const server = createStaticServer();
  let browser;
  try {
    await mkdir(outputRoot, { recursive: true });
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    const [{ chromium }, selected] = await Promise.all([loadPlaywright(), resolveBrowser()]);
    result.browser = `${selected.name} headless through Playwright`;
    result.target_url = `${baseUrl}/?locale=ko`;
    browser = await chromium.launch({ executablePath: selected.path, headless: true, args: ['--disable-gpu', '--disable-extensions'] });

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      const errorResponses = [];
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
      page.on('response', (item) => { if (item.status() >= 400) errorResponses.push(`${item.status()} ${item.url()}`); });
      const response = await page.goto(result.target_url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForFunction(() => Boolean(window.mathChakChakPets) && Boolean(window.mathChakChakBehavior));
      await page.waitForTimeout(900);
      const observed = await page.evaluate(() => {
        const petImages = [...document.querySelectorAll('[data-pet-image]')];
        const petBoxes = petImages.map((image) => {
          const box = image.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
        });
        const focusables = [...document.querySelectorAll('a[href],button:not([disabled]),select:not([disabled]),input:not([disabled])')]
          .filter((node) => node.getClientRects().length > 0);
        const bubble = document.querySelector('[data-ai-bubble]');
        const resourceEntries = performance.getEntriesByType('resource').map((entry) => ({
          path: new URL(entry.name).pathname,
          transferSize: entry.transferSize,
          decodedBodySize: entry.decodedBodySize,
        }));
        return {
          title: document.title,
          lang: document.documentElement.lang,
          innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
          h1Count: document.querySelectorAll('h1').length,
          mainPresent: Boolean(document.querySelector('main#main')),
          skipLinkPresent: Boolean(document.querySelector('.skip-link[href="#main"]')),
          focusableCount: focusables.length,
          petCharacters: [...document.querySelectorAll('[data-pet-character]')].map((node) => node.dataset.petCharacter),
          petImagesLoaded: petImages.map((image) => image.complete && image.naturalWidth > 0),
          petBoxes,
          petBoxesInsideViewport: petBoxes.every((box) => box.left >= -1 && box.right <= innerWidth + 1),
          motionStateCount: window.mathChakChakPets.states.length,
          behaviorEventCount: window.mathChakChakBehavior.events.length,
          behaviorBubbleCount: window.mathChakChakBehavior.bubbles.length,
          bubbleVisible: Boolean(bubble && !bubble.hidden),
          diagnosticHref: document.querySelector('a[href*="diagnostic/index.html"]')?.getAttribute('href') || null,
          curriculumHref: document.querySelector('a[href*="curriculum/index.html"]')?.getAttribute('href') || null,
          resourceCount: resourceEntries.length,
          resourceTransferBytes: resourceEntries.reduce((sum, entry) => sum + entry.transferSize, 0),
          resourceDecodedBodyBytes: resourceEntries.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
          resources: resourceEntries,
        };
      });
      const screenshot = `landing-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: resolve(outputRoot, screenshot), fullPage: false });
      const pass = response?.status() === 200
        && !observed.horizontalOverflow && observed.h1Count === 1 && observed.mainPresent && observed.skipLinkPresent
        && observed.focusableCount >= 5 && JSON.stringify(observed.petCharacters.sort()) === JSON.stringify(['Chakchaki', 'Gongsickyi'])
        && observed.petImagesLoaded.every(Boolean) && observed.petBoxesInsideViewport
        && observed.motionStateCount === 8 && observed.behaviorEventCount === 15 && observed.behaviorBubbleCount === 13 && observed.bubbleVisible
        && Boolean(observed.diagnosticHref) && Boolean(observed.curriculumHref)
        && consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0 && errorResponses.length === 0;
      result.viewports.push({ ...viewport, screenshot: `docs/stage8/evidence/gate6/responsive/${screenshot}`, response_status: response?.status() || null, observed, console_errors: consoleErrors, page_errors: pageErrors, failed_requests: failedRequests, error_responses: errorResponses, status: pass ? 'PASS' : 'FAIL' });
      if (!pass) result.failures.push(`VIEWPORT_${viewport.width}_FAILED`);
      await context.close();
    }

    for (const [name, pathname] of Object.entries({ diagnostic: '/diagnostic/index.html?locale=ko', curriculum: '/curriculum/index.html?locale=ko&grade=E4', math_learning: '/math-learning/index.html?locale=ko' })) {
      const response = await fetch(`${baseUrl}${pathname}`);
      result.route_checks[name] = { status_code: response.status, status: response.status === 200 ? 'PASS' : 'FAIL' };
      if (response.status !== 200) result.failures.push(`ROUTE_${name.toUpperCase()}_FAILED`);
    }
    result.status = result.failures.length === 0 ? 'PASS' : 'FAIL';
  } catch (error) {
    result.failures.push(`RUNTIME_ERROR:${error.message}`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  console.log('GATE6_RESPONSIVE_RUNTIME_AUDIT_WRITTEN');
  console.log(`status=${result.status} viewports=${result.viewports.filter((item) => item.status === 'PASS').length}/${viewports.length}`);
  console.log(`failures=${result.failures.length}`);
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}

await run();
