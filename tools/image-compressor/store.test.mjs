import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import sharp from 'sharp';
import { syncPuppyGrowthRecords } from '../../scripts/sync-puppy-growth-records.mjs';
import { createImageStore, validateSettings } from './store.mjs';

const sandboxes = new Set();

async function sandbox() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'puppy-image-compressor-'));
  sandboxes.add(directory);
  return directory;
}

async function noisyJpeg(width = 1200, height = 900, quality = 95) {
  let seed = 88;
  const bytes = Buffer.alloc(width * height * 3);
  for (let index = 0; index < bytes.length; index++) {
    seed = (seed * 16807) % 2147483647;
    bytes[index] = seed % 256;
  }
  return sharp(bytes, { raw: { width, height, channels: 3 } }).jpeg({ quality }).toBuffer();
}

function job(store, mode, items, options = {}) {
  return store.createJob({
    mode, items, confirmOverwrite: true,
    settings: { quality: 72, maxEdge: 2560 }, ...options,
  });
}

async function finished(store) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (store.getJob()?.status === 'done') return store.getJob();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Image job did not complete in time.');
}

afterEach(async () => {
  for (const directory of sandboxes) await rm(directory, { recursive: true, force: true });
  sandboxes.clear();
});

test('validates bounded compression settings', () => {
  assert.deepEqual(validateSettings({}), { quality: 72, maxEdge: 2560 });
  assert.deepEqual(validateSettings({ quality: 96, maxEdge: 0 }), { quality: 96, maxEdge: 0 });
  assert.throws(() => validateSettings({ quality: 101 }), /质量/);
  assert.throws(() => validateSettings({ maxEdge: 255 }), /最长边/);
});

test('compresses existing JPEGs, constrains dimensions and keeps the original name', async () => {
  const root = await sandbox();
  const original = await noisyJpeg();
  await writeFile(path.join(root, '01.jpg'), original);
  const store = await createImageStore({ imageRoot: root });
  try {
    const running = job(store, 'existing', ['01.jpg'], { settings: { quality: 72, maxEdge: 512 } });
    assert.equal(running.status, 'running');
    const result = (await finished(store)).results[0];
    assert.equal(result.status, 'compressed');
    assert.equal(result.file, '01.jpg');
    const output = await readFile(path.join(root, '01.jpg'));
    assert.ok(output.length < original.length);
    const metadata = await sharp(output).metadata();
    assert.ok(metadata.width <= 512 && metadata.height <= 512);
    assert.equal(metadata.format, 'jpeg');
    assert.ok(!metadata.exif);
    assert.equal((await store.listImages()).length, 1);
  } finally { await store.close(); }
});

test('applies EXIF orientation before resize and drops the EXIF marker', async () => {
  const root = await sandbox();
  const input = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#729473' } })
    .jpeg({ quality: 30 }).withMetadata({ orientation: 6 }).toBuffer();
  await writeFile(path.join(root, 'turned.jpg'), input);
  const store = await createImageStore({ imageRoot: root });
  try {
    job(store, 'existing', ['turned.jpg']);
    const result = (await finished(store)).results[0];
    assert.ok(['compressed', 'skipped'].includes(result.status));
    const metadata = await sharp(await readFile(path.join(root, 'turned.jpg'))).metadata();
    assert.deepEqual([metadata.width, metadata.height], [100, 200]);
    assert.ok(!metadata.exif);
  } finally { await store.close(); }
});

test('compresses WebP in its original format with the selected quality', async () => {
  const root = await sandbox();
  const source = await noisyJpeg(700, 500, 96);
  const original = await sharp(source).webp({ quality: 96 }).toBuffer();
  await writeFile(path.join(root, 'portrait.webp'), original);
  const store = await createImageStore({ imageRoot: root });
  try {
    job(store, 'existing', ['portrait.webp'], { settings: { quality: 72, maxEdge: 512 } });
    const result = (await finished(store)).results[0];
    assert.equal(result.status, 'compressed');
    const output = await readFile(path.join(root, 'portrait.webp'));
    assert.ok(output.length < original.length);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, 'webp');
    assert.ok(metadata.width <= 512 && metadata.height <= 512);
  } finally { await store.close(); }
});

test('preserves PNG alpha and keeps the PNG format', async () => {
  const root = await sandbox();
  await mkdir(path.join(root, 'nested'));
  const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 80, g: 120, b: 90, alpha: 0.25 } } }).png().toBuffer();
  await writeFile(path.join(root, 'nested', 'transparent.png'), png);
  const store = await createImageStore({ imageRoot: root });
  try {
    job(store, 'existing', ['nested/transparent.png']);
    const result = (await finished(store)).results[0];
    assert.ok(['compressed', 'skipped'].includes(result.status));
    const metadata = await sharp(await readFile(path.join(root, 'nested', 'transparent.png'))).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.channels, 4);
    const { data, info } = await sharp(await readFile(path.join(root, 'nested', 'transparent.png'))).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4);
    assert.ok(data[3] < 255);
  } finally { await store.close(); }
});

test('skips larger outputs, invalid images, traversal and unsupported video without altering existing files', async () => {
  const root = await sandbox();
  const tiny = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).jpeg({ quality: 25 }).toBuffer();
  const broken = Buffer.from('this is not an image');
  await writeFile(path.join(root, 'tiny.jpg'), tiny);
  await writeFile(path.join(root, 'broken.jpg'), broken);
  await writeFile(path.join(root, 'clip.mp4'), Buffer.from('video'));
  const store = await createImageStore({ imageRoot: root });
  try {
    assert.equal((await store.listImages()).length, 2);
    await assert.rejects(store.readImage('../outside.jpg'), /目录|路径/);
    await assert.rejects(store.readImage('clip.mp4'), /支持/);
    await assert.rejects(store.thumbnail('broken.jpg'));
    job(store, 'existing', ['tiny.jpg', 'broken.jpg']);
    const { results } = await finished(store);
    assert.equal(results[0].status, 'skipped');
    assert.equal(results[1].status, 'error');
    assert.deepEqual(await readFile(path.join(root, 'tiny.jpg')), tiny);
    assert.deepEqual(await readFile(path.join(root, 'broken.jpg')), broken);
  } finally { await store.close(); }
});

test('imports files safely, assigns a new name, and synchronizes growth records', async () => {
  const root = await sandbox();
  const input = await noisyJpeg(600, 500, 95);
  const existing = await sharp({ create: { width: 80, height: 64, channels: 3, background: '#d5c2a8' } }).jpeg().toBuffer();
  await writeFile(path.join(root, 'portrait.jpg'), existing);
  let syncCalls = 0;
  const store = await createImageStore({ imageRoot: root, syncRecords: async () => { syncCalls++; await syncPuppyGrowthRecords(root); } });
  try {
    const upload = await store.stageUpload(new Request('http://local', { method: 'POST', body: input }).body, 'portrait.jpg');
    job(store, 'import', [upload.id]);
    const completed = await finished(store);
    const result = completed.results[0];
    assert.equal(result.file, 'portrait-2.jpg');
    assert.equal(result.status, 'imported');
    assert.equal(completed.sync.status, 'done');
    assert.equal(syncCalls, 1);
    const records = JSON.parse(await readFile(path.join(root, 'image-age-records.json'), 'utf8'));
    assert.deepEqual(new Set(records.records.map((record) => record.file)), new Set(['portrait.jpg', 'portrait-2.jpg']));
    assert.ok(records.records.every((record) => record.age === '日期待记录'));
    assert.deepEqual(await readFile(path.join(root, 'portrait.jpg')), existing);
    const metadata = await sharp(await readFile(path.join(root, 'portrait-2.jpg'))).metadata();
    assert.equal(metadata.format, 'jpeg');
    assert.ok(metadata.width <= 2560 && metadata.height <= 2560);
  } finally { await store.close(); }
});

test('rejects corrupt or extension-mismatched uploads before import', async () => {
  const root = await sandbox();
  const store = await createImageStore({ imageRoot: root });
  try {
    await assert.rejects(store.stageUpload(new Request('http://local', { method: 'POST', body: Buffer.from('not a JPEG') }).body, 'photo.jpg'));
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } }).png().toBuffer();
    await assert.rejects(store.stageUpload(new Request('http://local', { method: 'POST', body: png }).body, 'photo.jpg'), /扩展名/);
  } finally { await store.close(); }
});
