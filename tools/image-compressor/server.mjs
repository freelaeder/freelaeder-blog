import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncPuppyGrowthRecords } from '../../scripts/sync-puppy-growth-records.mjs';
import { createImageStore, MAX_UPLOAD_BYTES, ToolError } from './store.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(directory, '../..');
const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
};
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

function json(response, status, value) {
  response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function body(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new ToolError('请求需要使用 JSON。', 415);
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new ToolError('请求内容过大。', 413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new ToolError('请求格式无效。'); }
}

export async function startImageCompressor({
  imageRoot = path.join(projectRoot, 'public/images/puppy-growth'),
  port = Number(process.env.IMAGE_COMPRESSOR_PORT || 3790),
  syncRecords = () => syncPuppyGrowthRecords(imageRoot),
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('IMAGE_COMPRESSOR_PORT 必须是有效端口号。');
  const store = await createImageStore({ imageRoot, syncRecords });
  const token = randomBytes(32).toString('hex');
  let origin;
  const server = createServer(async (request, response) => {
    try {
      if (request.headers.host !== new URL(origin).host || (request.headers.origin && request.headers.origin !== origin) || request.headers['sec-fetch-site'] === 'cross-site') {
        throw new ToolError('请从工具的本机地址打开页面。', 403);
      }
      const url = new URL(request.url, origin);
      const method = request.method;
      if (!['GET', 'POST', 'DELETE'].includes(method)) throw new ToolError('不支持此请求方式。', 405);
      if (method !== 'GET' && request.headers['x-tool-token'] !== token) throw new ToolError('操作凭证已失效，请刷新页面。', 403);

      if (method === 'GET' && assets[url.pathname]) {
        const [file, type] = assets[url.pathname];
        response.writeHead(200, { ...headers, 'Content-Type': type });
        response.end(await readFile(path.join(directory, file)));
      } else if (method === 'GET' && url.pathname === '/api/config') {
        json(response, 200, { token, imageRoot: store.root, maxUploadBytes: MAX_UPLOAD_BYTES });
      } else if (method === 'GET' && url.pathname === '/api/images') {
        json(response, 200, { images: await store.listImages() });
      } else if (method === 'GET' && url.pathname === '/api/thumbnail') {
        const thumbnail = await store.thumbnail(url.searchParams.get('file'));
        response.writeHead(200, { ...headers, 'Content-Type': 'image/webp' });
        response.end(thumbnail);
      } else if (method === 'POST' && url.pathname === '/api/uploads') {
        if (Number(request.headers['content-length']) > MAX_UPLOAD_BYTES) throw new ToolError('单张图片不能超过 50 MB。', 413);
        json(response, 201, await store.stageUpload(request, url.searchParams.get('name')));
      } else if (method === 'DELETE' && url.pathname === '/api/uploads') {
        const payload = await body(request);
        if (!Array.isArray(payload.ids) || payload.ids.some((id) => typeof id !== 'string')) throw new ToolError('导入列表格式无效。');
        await store.discardUploads(payload.ids);
        json(response, 200, { ok: true });
      } else if (method === 'GET' && url.pathname === '/api/jobs/latest') {
        json(response, 200, { job: store.getJob() });
      } else if (method === 'POST' && url.pathname === '/api/jobs') {
        json(response, 202, { job: store.createJob(await body(request)) });
      } else if (method === 'POST' && url.pathname === '/api/sync') {
        json(response, 202, { job: await store.retrySync() });
      } else {
        throw new ToolError('未找到该资源。', 404);
      }
    } catch (error) {
      if (!response.headersSent && !response.destroyed) {
        const status = error.status || (error.code === 'ENOENT' ? 404 : 400);
        json(response, status, { error: error.message || '操作失败，请刷新后重试。' });
      } else if (!response.destroyed) response.end();
      request.resume();
    }
  });
  server.requestTimeout = 120_000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      origin = `http://127.0.0.1:${server.address().port}`;
      server.removeListener('error', reject);
      resolve();
    });
  }).catch(async (error) => {
    await store.close();
    if (error.code === 'EADDRINUSE') throw new Error(`端口 ${port} 已被占用。请关闭旧工具，或设置 IMAGE_COMPRESSOR_PORT 后重试。`);
    throw error;
  });
  return {
    url: origin, imageRoot: store.root,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await store.close();
    },
  };
}
