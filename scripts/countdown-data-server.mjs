import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const eventsFilePath = path.resolve(__dirname, '../utils/countdown-events.json');
const host = process.env.COUNTDOWN_DATA_HOST || '127.0.0.1';
const port = Number(process.env.COUNTDOWN_DATA_PORT || 3789);
const maxBodySize = 64 * 1024;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    ...headers,
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
};

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;

      if (Buffer.byteLength(body, 'utf8') > maxBodySize) {
        reject(new Error('请求内容太大。'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });

const isValidHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(value);
const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const normalizeEvent = (event, index) => {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error(`第 ${index + 1} 个事件格式无效。`);
  }

  const id = `${event.id || ''}`.trim();
  const title = `${event.title || ''}`.trim();
  const date = `${event.date || ''}`.trim();
  const hint = `${event.hint || ''}`.trim();
  const backgroundColor = `${event.backgroundColor || ''}`.trim();

  if (!/^[a-zA-Z0-9_-]{3,64}$/.test(id)) {
    throw new Error(`第 ${index + 1} 个事件的 id 只能包含字母、数字、下划线和短横线。`);
  }

  if (!title || title.length > 80) {
    throw new Error(`第 ${index + 1} 个事件的主题需要在 1 到 80 个字符之间。`);
  }

  if (!isValidDate(date)) {
    throw new Error(`第 ${index + 1} 个事件的日期需要使用 YYYY-MM-DD。`);
  }

  if (!hint || hint.length > 120) {
    throw new Error(`第 ${index + 1} 个事件的距离提示需要在 1 到 120 个字符之间。`);
  }

  if (!isValidHexColor(backgroundColor)) {
    throw new Error(`第 ${index + 1} 个事件的背景色需要使用 #RRGGBB。`);
  }

  return {
    id,
    title,
    date,
    hint,
    backgroundColor: backgroundColor.toLowerCase(),
  };
};

const normalizeEvents = (events) => {
  if (!Array.isArray(events)) {
    throw new Error('事件列表必须是数组。');
  }

  const normalizedEvents = events.map(normalizeEvent);
  const ids = new Set();

  normalizedEvents.forEach((event) => {
    if (ids.has(event.id)) {
      throw new Error(`事件 id 重复：${event.id}`);
    }

    ids.add(event.id);
  });

  return normalizedEvents;
};

const readEvents = async () => {
  const rawEvents = await readFile(eventsFilePath, 'utf8');
  return normalizeEvents(JSON.parse(rawEvents));
};

const writeEvents = async (events) => {
  const normalizedEvents = normalizeEvents(events);
  await writeFile(eventsFilePath, `${JSON.stringify(normalizedEvents, null, 2)}\n`, 'utf8');
  return normalizedEvents;
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  if (requestUrl.pathname === '/health' && request.method === 'GET') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname !== '/events') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  try {
    if (request.method === 'GET') {
      sendJson(response, 200, { events: await readEvents() });
      return;
    }

    if (request.method === 'PUT') {
      const body = await readRequestBody(request);
      const payload = JSON.parse(body || '{}');
      const events = await writeEvents(payload.events);

      sendJson(response, 200, { events });
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : '保存事件失败。',
    });
  }
});

server.listen(port, host, () => {
  console.log(`Countdown data server listening at http://${host}:${port}`);
  console.log(`Writing events to ${eventsFilePath}`);
});
