import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { get as httpGet } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { startImageCompressor } from './server.mjs';

const directories = new Set();

afterEach(async () => {
  for (const item of directories) await rm(item, { recursive: true, force: true });
  directories.clear();
});

test('serves a loopback-only UI and validates requests against host, origin, and token', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'puppy-image-server-'));
  directories.add(directory);
  const app = await startImageCompressor({ imageRoot: directory, port: 0 });
  try {
    assert.equal(new URL(app.url).hostname, '127.0.0.1');
    const page = await fetch(app.url);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(await page.text(), /小狗成长照片/);
    const config = await fetch(`${app.url}/api/config`).then((response) => response.json());
    const wrongToken = await fetch(`${app.url}/api/jobs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tool-Token': 'wrong' }, body: JSON.stringify({ mode: 'existing', items: ['x.jpg'] }),
    });
    assert.equal(wrongToken.status, 403);
    const wrongOrigin = await fetch(`${app.url}/api/images`, { headers: { Origin: 'http://example.com' } });
    assert.equal(wrongOrigin.status, 403);
    const wrongHostStatus = await new Promise((resolve, reject) => {
      const request = httpGet({ hostname: '127.0.0.1', port: new URL(app.url).port, path: '/api/images', headers: { host: 'example.com' } }, (response) => {
        response.resume();
        response.once('end', () => resolve(response.statusCode));
      });
      request.once('error', reject);
    });
    assert.equal(wrongHostStatus, 403);
    const missingToken = await fetch(`${app.url}/api/jobs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'existing', items: ['x.jpg'] }),
    });
    assert.equal(missingToken.status, 403);
    assert.equal(config.imageRoot, directory);
    assert.ok(config.token.length >= 32);
    assert.equal(page.headers.get('access-control-allow-origin'), null);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  } finally { await app.close(); }
});
