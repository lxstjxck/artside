import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const port = Number.parseInt(process.env.SMOKE_PORT ?? '3200', 10);
const baseUrl = process.env.SMOKE_BASE_URL ?? `http://localhost:${port}`;
const testDbPath = path.join(process.cwd(), 'prisma', 'smoke-test.db');
const databaseUrl = `file:${testDbPath.replaceAll('\\', '/')}`;
const authSecret = 'smoke-test-secret-smoke-test-secret-smoke-test-secret';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getSetCookies = (headers) => {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const combined = headers.get('set-cookie');
  if (!combined) return [];
  return combined.split(/,(?=\s*[^;,\s]+=)/g);
};

class TestClient {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }

  applyCookies(response) {
    for (const header of getSetCookies(response.headers)) {
      const [pair] = header.split(';');
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex <= 0) continue;
      this.cookies.set(pair.slice(0, separatorIndex).trim(), pair.slice(separatorIndex + 1).trim());
    }
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
  }

  async request(pathname, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const cookie = this.cookieHeader();
    if (cookie) headers.set('Cookie', cookie);
    if (options.json !== undefined) {
      headers.set('Content-Type', 'application/json');
      options.body = JSON.stringify(options.json);
    }

    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      headers,
      redirect: 'manual',
    });
    this.applyCookies(response);

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return { response, data, text };
  }

  async expect(pathname, options, expectedStatus, label) {
    const result = await this.request(pathname, options);
    assert(
      result.response.status === expectedStatus,
      `${this.label}: ${label} returned ${result.response.status}, expected ${expectedStatus}. Body: ${result.text}`
    );
    return result.data;
  }
}

const createPngFile = async (name, color) => {
  const buffer = await sharp({
    create: {
      width: 960,
      height: 720,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toBuffer();

  return new File([buffer], name, { type: 'image/png' });
};

const waitForServer = async () => {
  const startedAt = Date.now();
  let lastError = '';

  while (Date.now() - startedAt < 90_000) {
    try {
      const response = await fetch(baseUrl, { cache: 'no-store' });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(1000);
  }

  throw new Error(`Smoke server did not become ready. Last error: ${lastError}`);
};

const stopServer = (child) => {
  if (!child || child.killed) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  child.kill('SIGTERM');
};

const startServer = async () => {
  await rm(testDbPath, { force: true });
  await rm(`${testDbPath}-journal`, { force: true });
  await rm(`${testDbPath}-wal`, { force: true });
  await rm(`${testDbPath}-shm`, { force: true });

  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run dev -- --port ${port}`]
    : ['run', 'dev', '--', '--port', String(port)];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: authSecret,
      APP_URL: baseUrl,
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    const line = chunk.toString();
    if (process.env.SMOKE_VERBOSE === '1') process.stdout.write(line);
  });
  child.stderr.on('data', (chunk) => {
    const line = chunk.toString();
    if (process.env.SMOKE_VERBOSE === '1') process.stderr.write(line);
  });

  await waitForServer();
  return child;
};

const registerUser = async (client, suffix) => {
  const username = `smoke_${suffix}_${randomBytes(3).toString('hex')}`;
  const email = `${username}@example.test`;
  const password = 'SmokeTest1!';

  const data = await client.expect('/api/auth/register', {
    method: 'POST',
    json: { username, email, password },
  }, 201, 'register');

  assert(data.user?.username === username, 'Registered username mismatch.');
  return { username, email, password };
};

const updateProfile = async (client, username) => {
  const data = await client.expect('/api/profile', {
    method: 'PATCH',
    json: {
      nickname: `${username} Artist`,
      location: 'Moscow',
      bio: 'Smoke test profile for ArtSide platform verification.',
      publicEmail: `${username}@example.test`,
      showPublicEmail: true,
      professionalSkills: ['UI/UX', 'Illustration'],
      professionalSoftware: ['Figma', 'Blender'],
      hiringTypes: ['freelance'],
      publishReady: true,
      socialLinks: {
        website: 'https://example.com',
        telegram: 'https://t.me/example',
        vk: 'https://vk.com/example',
      },
    },
  }, 200, 'update profile');

  assert(data.profile?.publishReady === true, 'Profile publishReady was not saved.');
};

const createWork = async (client) => {
  const image = await createPngFile('smoke-work.png', { r: 45, g: 120, b: 210, alpha: 1 });
  const galleryImage = await createPngFile('smoke-gallery.png', { r: 210, g: 90, b: 80, alpha: 1 });
  const form = new FormData();
  form.set('title', 'Smoke Test Artwork');
  form.set('category', 'UI/UX');
  form.set('description', 'This work is created by the automated smoke test to verify upload and publishing flow.');
  form.set('tags', 'smoke,testing,ui');
  form.set('status', 'pending');
  form.set('image', image);
  form.append('images', galleryImage);

  const data = await client.expect('/api/works', {
    method: 'POST',
    body: form,
  }, 201, 'create work');

  assert(Number.isInteger(data.work?.id), 'Created work id is missing.');
  assert(data.work.status === 'published', `Created work was not auto-published, status: ${data.work.status}`);
  assert(data.work.thumbnailUrl?.endsWith('.avif'), 'AVIF thumbnail was not generated.');
  assert(Array.isArray(data.work.images) && data.work.images.length === 2, 'Gallery images were not saved.');
  return data.work;
};

const runScenario = async () => {
  const author = new TestClient('author');
  const viewer = new TestClient('viewer');

  const authorUser = await registerUser(author, 'author');
  const viewerUser = await registerUser(viewer, 'viewer');

  await updateProfile(author, authorUser.username);

  const session = await author.expect('/api/auth/session', { method: 'GET' }, 200, 'session');
  assert(session.authenticated === true, 'Session is not authenticated.');

  const work = await createWork(author);

  const home = await viewer.expect('/api/home-feed?recommendationsLimit=18', { method: 'GET' }, 200, 'home feed');
  assert(home.recommendations.some((item) => item.id === work.id), 'Created work is missing from recommendations.');
  assert(home.recommendationsPage.limit === 18, 'Home feed pagination metadata is incorrect.');

  const detail = await viewer.expect(`/api/works/${work.id}`, { method: 'GET' }, 200, 'work detail');
  assert(detail.work.id === work.id, 'Work detail returned wrong work.');

  const search = await viewer.expect('/api/search?q=Smoke%20Test', { method: 'GET' }, 200, 'search');
  assert(search.items.some((item) => item.id === work.id), 'Search did not find created work.');

  const folderData = await viewer.expect('/api/library/folders', {
    method: 'POST',
    json: { name: 'Smoke Collection' },
  }, 200, 'create library folder');
  const folder = folderData.folders.find((item) => item.name === 'Smoke Collection');
  assert(folder?.id, 'Created library folder is missing.');

  const saved = await viewer.expect('/api/saved-works', {
    method: 'POST',
    json: { id: work.id, folderId: folder.id },
  }, 200, 'save work');
  assert(saved.items.some((item) => item.id === work.id), 'Saved work is missing from library.');

  const like = await viewer.expect(`/api/works/${work.id}/like`, { method: 'POST' }, 200, 'like work');
  assert(like.liked === true && like.likes >= 1, 'Like was not applied.');

  const comment = await viewer.expect(`/api/works/${work.id}/comments`, {
    method: 'POST',
    json: { text: 'Smoke test comment' },
  }, 201, 'comment work');
  assert(comment.comment?.text === 'Smoke test comment', 'Comment text mismatch.');

  const follow = await viewer.expect(`/api/profile/${authorUser.username}/follow`, {
    method: 'POST',
  }, 200, 'follow author');
  assert(follow.following === true, 'Follow was not applied.');

  const authorNotifications = await author.expect('/api/notifications', { method: 'GET' }, 200, 'author notifications');
  assert(authorNotifications.notifications.length >= 2, 'Author did not receive activity notifications.');

  const readNotifications = await author.expect('/api/notifications/read-all', { method: 'POST' }, 200, 'read notifications');
  assert(readNotifications.notifications.every((item) => item.unread === false), 'Notifications were not marked as read.');

  const unlike = await viewer.expect(`/api/works/${work.id}/like`, { method: 'DELETE' }, 200, 'unlike work');
  assert(unlike.liked === false, 'Unlike was not applied.');

  const unfollow = await viewer.expect(`/api/profile/${authorUser.username}/follow`, {
    method: 'DELETE',
  }, 200, 'unfollow author');
  assert(unfollow.following === false, 'Unfollow was not applied.');

  const deleteWork = await author.expect(`/api/works/${work.id}`, { method: 'DELETE' }, 200, 'delete own work');
  assert(deleteWork.deleted === true, 'Work was not deleted.');

  const deletedDetail = await viewer.request(`/api/works/${work.id}`, { method: 'GET' });
  assert(deletedDetail.response.status === 404, `Deleted work still opens with status ${deletedDetail.response.status}.`);

  return {
    author: authorUser.username,
    viewer: viewerUser.username,
    workId: work.id,
    notifications: authorNotifications.notifications.length,
  };
};

let server = null;
try {
  server = await startServer();
  const result = await runScenario();
  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    databaseUrl,
    ...result,
  }, null, 2));
} finally {
  stopServer(server);
  await sleep(500);
  await rm(testDbPath, { force: true });
  await rm(`${testDbPath}-journal`, { force: true });
  await rm(`${testDbPath}-wal`, { force: true });
  await rm(`${testDbPath}-shm`, { force: true });
}
