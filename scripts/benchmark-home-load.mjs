import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const defaultTargets = [
  {
    name: 'ArtSide local',
    url: 'http://localhost:3000',
    note: 'Локальная главная страница ArtSide с 30 опубликованными работами.',
  },
  {
    name: 'Behance search',
    url: 'https://www.behance.net/search/projects?search=ui%20design',
    note: 'Публичная страница поиска проектов Behance.',
  },
  {
    name: 'ArtStation search',
    url: 'https://www.artstation.com/search?sort_by=relevance&query=ui%20design',
    note: 'Публичная страница поиска ArtStation.',
  },
  {
    name: 'Pinterest search',
    url: 'https://www.pinterest.com/search/pins/?q=ui%20design',
    note: 'Публичная страница поиска Pinterest; может включать антибот/логин-гейт.',
  },
];

const runs = Number.parseInt(process.env.BENCHMARK_RUNS ?? '3', 10);
const outputDir = path.join(process.cwd(), 'docs', 'benchmarks');

const findChrome = async () => {
  for (const candidate of chromeCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  throw new Error('Chrome or Edge executable was not found.');
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
};

const round = (value) => Math.round(value);

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'n/a';
  if (bytes < 1024) return `${round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const measureTarget = async (browser, target, runIndex) => {
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  const network = {
    requests: 0,
    failed: 0,
    transferBytes: 0,
    encodedBodyBytes: 0,
  };

  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  client.on('Network.requestWillBeSent', () => {
    network.requests += 1;
  });
  client.on('Network.loadingFailed', () => {
    network.failed += 1;
  });
  client.on('Network.loadingFinished', (event) => {
    network.encodedBodyBytes += event.encodedDataLength ?? 0;
  });
  client.on('Network.responseReceived', (event) => {
    const headers = event.response?.headers ?? {};
    const lengthHeader = headers['content-length'] ?? headers['Content-Length'];
    const length = Number.parseInt(String(lengthHeader ?? ''), 10);
    if (Number.isFinite(length)) {
      network.transferBytes += length;
    }
  });

  await page.setViewport({ width: 1365, height: 768, deviceScaleFactor: 1 });

  const startedAt = Date.now();
  let status = null;
  let error = null;

  try {
    const response = await page.goto(target.url, {
      waitUntil: 'load',
      timeout: 45_000,
    });
    status = response?.status() ?? null;
    await page.waitForNetworkIdle({ idleTime: 1200, timeout: 10_000 }).catch(() => undefined);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const wallTimeMs = Date.now() - startedAt;
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(
      performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime])
    );
    const resources = performance.getEntriesByType('resource');
    return {
      navigationType: nav?.type ?? null,
      duration: nav?.duration ?? 0,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
      loadEventEnd: nav ? nav.loadEventEnd - nav.startTime : 0,
      responseStart: nav?.responseStart ?? 0,
      firstPaint: paints['first-paint'] ?? null,
      firstContentfulPaint: paints['first-contentful-paint'] ?? null,
      resourceCount: resources.length,
      resourceTransferSize: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      resourceEncodedBodySize: resources.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0),
      title: document.title,
      bodyTextSample: document.body?.innerText?.slice(0, 180) ?? '',
    };
  }).catch(() => ({}));

  await page.close();

  return {
    target: target.name,
    url: target.url,
    run: runIndex,
    status,
    error,
    wallTimeMs,
    requests: network.requests,
    failedRequests: network.failed,
    networkEncodedBytes: network.encodedBodyBytes,
    networkDeclaredTransferBytes: network.transferBytes,
    ...metrics,
  };
};

const summarizeTarget = (target, rows) => {
  const successful = rows.filter((row) => !row.error && row.status && row.status < 500);
  const source = successful.length > 0 ? successful : rows;
  const pick = (key) => source.map((row) => Number(row[key] ?? 0)).filter((value) => Number.isFinite(value));

  return {
    name: target.name,
    url: target.url,
    note: target.note,
    runs: rows.length,
    successfulRuns: successful.length,
    medianWallTimeMs: round(median(pick('wallTimeMs'))),
    avgWallTimeMs: round(average(pick('wallTimeMs'))),
    p90WallTimeMs: round(percentile(pick('wallTimeMs'), 90)),
    medianDomContentLoadedMs: round(median(pick('domContentLoaded'))),
    medianLoadEventMs: round(median(pick('loadEventEnd'))),
    medianResponseStartMs: round(median(pick('responseStart'))),
    medianFcpMs: round(median(pick('firstContentfulPaint'))),
    medianRequests: round(median(pick('requests'))),
    medianNetworkEncodedBytes: round(median(pick('networkEncodedBytes'))),
    errors: rows.filter((row) => row.error).map((row) => row.error),
  };
};

const toMarkdown = (summaries, rows) => {
  const lines = [
    '# Home Page Load Benchmark',
    '',
    `Date: ${new Date().toISOString()}`,
    `Runs per target: ${runs}`,
    'Viewport: 1365x768, cache disabled, Chrome headless.',
    '',
    'Important limitation: external platforms are live third-party websites with CDN, geolocation, cookies, anti-bot checks and different content volume. Treat this as an indicative demo benchmark, not a laboratory-equal product comparison.',
    '',
    '| Target | Successful runs | Median full wait | Median DOMContentLoaded | Median load event | Median FCP | Median requests | Median encoded network |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...summaries.map((item) => (
      `| ${item.name} | ${item.successfulRuns}/${item.runs} | ${item.medianWallTimeMs} ms | ${item.medianDomContentLoadedMs} ms | ${item.medianLoadEventMs} ms | ${item.medianFcpMs || 'n/a'} ms | ${item.medianRequests} | ${formatBytes(item.medianNetworkEncodedBytes)} |`
    )),
    '',
    '## Targets',
    '',
    ...summaries.flatMap((item) => [
      `- ${item.name}: ${item.url}`,
      `  ${item.note}`,
    ]),
    '',
    '## Raw Run Statuses',
    '',
    '| Target | Run | HTTP status | Wall time | Requests | Failed requests | Error |',
    '|---|---:|---:|---:|---:|---:|---|',
    ...rows.map((row) => (
      `| ${row.target} | ${row.run} | ${row.status ?? 'n/a'} | ${row.wallTimeMs} ms | ${row.requests} | ${row.failedRequests} | ${row.error ? row.error.replaceAll('|', '/') : ''} |`
    )),
    '',
  ];
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  await fs.mkdir(outputDir, { recursive: true });
  const executablePath = await findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  const rows = [];
  try {
    for (const target of defaultTargets) {
      for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
        console.log(`Measuring ${target.name}, run ${runIndex}/${runs}`);
        rows.push(await measureTarget(browser, target, runIndex));
      }
    }
  } finally {
    await browser.close();
  }

  const summaries = defaultTargets.map((target) => summarizeTarget(
    target,
    rows.filter((row) => row.target === target.name)
  ));

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `home-load-${stamp}.json`);
  const mdPath = path.join(outputDir, `home-load-${stamp}.md`);
  await fs.writeFile(jsonPath, JSON.stringify({ summaries, rows }, null, 2), 'utf8');
  await fs.writeFile(mdPath, toMarkdown(summaries, rows), 'utf8');

  console.log(JSON.stringify({ summaries, jsonPath, mdPath }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
