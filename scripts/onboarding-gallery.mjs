import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  unlink,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import chokidar from 'chokidar';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const galleryRoot = join(projectRoot, 'artifacts', 'onboarding-web-gallery');
const screenshotDirectory = join(galleryRoot, 'screens');
const onboardingDirectory = join(projectRoot, 'app', 'onboarding');
const stepsFile = join(projectRoot, 'lib', 'onboardingSteps.ts');
const expoOrigin = 'http://localhost:8081';
const galleryPort = 4173;
const chromeBinary = '/usr/bin/google-chrome-beta';

const captureWaits = {
  currentState: 3000,
  exerciseLink: 2400,
  lifetimeProjection: 3000,
  methodFeedback: 2200,
  reclaimedTime: 3000,
  scrollUnlock: 2800,
  squatTimeTrade: 3000,
};

const specialTargets = {
  blockedAppsPicker: '/onboarding/apps',
  homeScreen: '/onboarding/home-preview',
  oneTimeOfferPaywall: '/onboarding/paywall-preview?offer=discount',
  subscriptionPaywall: '/onboarding/paywall-preview',
};

let ownedExpoProcess;
let currentManifest = [];
let revision = Date.now();
let rebuildTimer;
let rebuilding = false;
let queuedRebuild = false;
const eventClients = new Set();

function kebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: options.stdio ?? 'pipe',
    });
    let output = '';

    child.stdout?.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0 || options.allowFailure) {
        resolvePromise({ code, output });
        return;
      }
      rejectPromise(new Error(`${command} exited with ${code}\n${output}`));
    });
  });
}

async function waitForExpo() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(`${expoOrigin}/onboarding`);
      if (response.ok) return;
    } catch {
      // The development server is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error('Expo web did not become ready on port 8081.');
}

async function ensureExpo() {
  try {
    const response = await fetch(`${expoOrigin}/onboarding`);
    if (response.ok) return;
  } catch {
    // Start a private Expo process below.
  }

  ownedExpoProcess = spawn(
    'npx',
    ['expo', 'start', '--web', '--localhost', '--port', '8081'],
    {
      cwd: projectRoot,
      env: { ...process.env, BROWSER: 'none' },
      stdio: 'inherit',
    },
  );
  await waitForExpo();
}

async function parseOnboardingSteps() {
  const source = await readFile(stepsFile, 'utf8');
  const entries = [];
  const pattern =
    /^\s{2}([A-Za-z0-9]+):\s*\{[\s\S]*?key:\s*'([^']+)'[\s\S]*?index:\s*(\d+),[\s\S]*?^\s{2}\},/gm;
  let match;

  while ((match = pattern.exec(source))) {
    entries.push({
      property: match[1],
      analyticsKey: match[2],
      index: Number(match[3]),
    });
  }

  return entries.sort((left, right) => left.index - right.index);
}

async function discoverRoute(property) {
  if (specialTargets[property]) return specialTargets[property];

  const files = (await readdir(onboardingDirectory))
    .filter((name) => name.endsWith('.tsx'))
    .filter((name) => !name.includes('-preview'));

  for (const file of files) {
    const source = await readFile(join(onboardingDirectory, file), 'utf8');
    if (!source.includes(`ONBOARDING_STEPS.${property}`)) continue;

    const routeName = basename(file, '.tsx');
    const route = routeName === 'index' ? '/onboarding' : `/onboarding/${routeName}`;
    const numberedPattern = new RegExp(
      `(\\d+)\\s*:\\s*ONBOARDING_STEPS\\.${property}\\b`,
    );
    const numberedMatch = source.match(numberedPattern);
    if (numberedMatch) return `${route}?previewStep=${numberedMatch[1]}`;

    if (routeName === 'setup') {
      const slideMatches = [
        ...source.matchAll(/analyticsStep:\s*ONBOARDING_STEPS\.([A-Za-z0-9]+)/g),
      ];
      const slideIndex = slideMatches.findIndex((match) => match[1] === property);
      if (slideIndex >= 0) return `${route}?previewStep=${slideIndex}`;
    }

    return route;
  }

  return `/onboarding/${kebabCase(property)}`;
}

async function buildTargets() {
  const steps = await parseOnboardingSteps();
  const targets = [];

  for (const step of steps) {
    const slug = `${String(step.index).padStart(2, '0')}-${kebabCase(step.property)}`;
    targets.push({
      ...step,
      filename: `${slug}.png`,
      path: await discoverRoute(step.property),
      waitMs: captureWaits[step.property] ?? 800,
    });
  }

  return targets;
}

async function captureTarget(target) {
  const profileDirectory = await mkdtemp(join(tmpdir(), 'bootyblock-gallery-'));
  const outputPath = join(screenshotDirectory, target.filename);
  const url = `${expoOrigin}${target.path}`;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-sandbox',
    '--run-all-compositor-stages-before-draw',
    '--window-size=390,844',
    `--user-data-dir=${profileDirectory}`,
    `--virtual-time-budget=${target.waitMs}`,
    `--screenshot=${outputPath}`,
    url,
  ];

  try {
    await run(chromeBinary, args, { allowFailure: true });
    await access(outputPath);
  } finally {
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

async function runWithConcurrency(items, concurrency, task) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await task(item);
    }
  });
  await Promise.all(workers);
}

async function removeStaleScreens(targets) {
  const expected = new Set(targets.map((target) => target.filename));
  const files = await readdir(screenshotDirectory);

  await Promise.all(
    files
      .filter((name) => name.endsWith('.png') && !expected.has(name))
      .map((name) => unlink(join(screenshotDirectory, name))),
  );
}

function announceRefresh() {
  revision = Date.now();
  const payload = `data: ${revision}\n\n`;
  for (const response of eventClients) response.write(payload);
}

async function rebuildGallery() {
  if (rebuilding) {
    queuedRebuild = true;
    return;
  }

  rebuilding = true;
  try {
    const targets = await buildTargets();
    await runWithConcurrency(targets, 4, captureTarget);
    await removeStaleScreens(targets);
    currentManifest = targets.map(({ filename, index, property }) => ({
      filename,
      index,
      property,
    }));
    announceRefresh();
    console.log(`Onboarding gallery refreshed: ${targets.length} screens`);
  } catch (error) {
    console.error('Onboarding gallery refresh failed:', error);
  } finally {
    rebuilding = false;
    if (queuedRebuild) {
      queuedRebuild = false;
      void rebuildGallery();
    }
  }
}

function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    void rebuildGallery();
  }, 650);
}

function contentType(pathname) {
  const extension = extname(pathname);
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.png') return 'image/png';
  if (extension === '.js') return 'text/javascript; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

function startGalleryServer() {
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`);

    if (requestUrl.pathname === '/manifest.json') {
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify({ revision, screenshots: currentManifest }));
      return;
    }

    if (requestUrl.pathname === '/events') {
      response.writeHead(200, {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
      });
      response.write(`data: ${revision}\n\n`);
      eventClients.add(response);
      request.on('close', () => eventClients.delete(response));
      return;
    }

    const relativePath = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
    const filePath = resolve(galleryRoot, relativePath);
    if (relative(galleryRoot, filePath).startsWith('..')) {
      response.writeHead(403);
      response.end();
      return;
    }

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) throw new Error('Not a file');
      response.writeHead(200, {
        'Cache-Control': filePath.endsWith('.png') ? 'no-store' : 'no-cache',
        'Content-Type': contentType(filePath),
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });

  server.listen(galleryPort, '127.0.0.1', () => {
    console.log(`Live onboarding gallery: http://127.0.0.1:${galleryPort}`);
  });
}

async function main() {
  await access(chromeBinary);
  await mkdir(screenshotDirectory, { recursive: true });
  await ensureExpo();
  startGalleryServer();

  const watcher = chokidar.watch(
    [
      join(projectRoot, 'app', 'onboarding'),
      join(projectRoot, 'app', '(tabs)', 'index.tsx'),
      join(projectRoot, 'assets', 'onboarding'),
      join(projectRoot, 'assets', 'paywall-apps.png'),
      join(projectRoot, 'components'),
      join(projectRoot, 'constants'),
      join(projectRoot, 'lib'),
      join(projectRoot, 'global.css'),
    ],
    {
      awaitWriteFinish: {
        pollInterval: 100,
        stabilityThreshold: 300,
      },
      ignoreInitial: true,
    },
  );

  watcher.on('add', scheduleRebuild);
  watcher.on('change', scheduleRebuild);
  watcher.on('unlink', scheduleRebuild);

  await rebuildGallery();
}

function cleanUp() {
  ownedExpoProcess?.kill('SIGTERM');
}

process.on('SIGINT', () => {
  cleanUp();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanUp();
  process.exit(0);
});

void main().catch((error) => {
  console.error(error);
  cleanUp();
  process.exit(1);
});
