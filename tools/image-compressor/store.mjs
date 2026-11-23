import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const IMAGE_PATTERN = /\.(?:jpe?g|png|webp)$/i;
const formats = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' };
const sharpOptions = { limitInputPixels: 100_000_000, failOn: 'warning' };
const sort = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

export class ToolError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validateSettings(settings = {}) {
  const { quality = 72, maxEdge = 2560 } = settings;
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new ToolError('质量必须是 1–100 的整数。');
  }
  if (!Number.isInteger(maxEdge) || (maxEdge !== 0 && (maxEdge < 256 || maxEdge > 10000))) {
    throw new ToolError('最长边必须为 256–10000 px，或填 0 保留原尺寸。');
  }
  return { quality, maxEdge };
}

async function inspectImage(input, name) {
  const metadata = await sharp(input, sharpOptions).metadata();
  if (metadata.format !== formats[path.extname(name).toLowerCase()]) {
    throw new ToolError('图片内容与扩展名不一致，仅支持 JPG、PNG、WebP。');
  }
  if ((metadata.pages || 1) > 1) throw new ToolError('暂不处理动图，请使用静态图片。');
  return metadata;
}

async function encodeImage(input, name, settings) {
  await inspectImage(input, name);
  let image = sharp(input, sharpOptions).autoOrient();
  if (settings.maxEdge) {
    image = image.resize({
      width: settings.maxEdge, height: settings.maxEdge,
      fit: 'inside', withoutEnlargement: true,
    });
  }
  switch (formats[path.extname(name).toLowerCase()]) {
    case 'jpeg': image = image.jpeg({ quality: settings.quality, mozjpeg: true }); break;
    case 'webp': image = image.webp({ quality: settings.quality, effort: 5 }); break;
    case 'png': image = image.png({ compressionLevel: 9, palette: false }); break;
  }
  // Sharp strips EXIF/XMP/GPS by default. PNG stays lossless and retains alpha.
  return image.toBuffer();
}

export async function createImageStore({ imageRoot, syncRecords = async () => {} }) {
  await fs.mkdir(imageRoot, { recursive: true });
  const root = await fs.realpath(imageRoot);
  const uploads = new Map();
  const temporaryFiles = new Set();
  let job = null;
  let work = Promise.resolve();
  let closed = false;
  let uploading = 0;

  const tempPath = () => {
    const file = path.join(root, `.puppy-compress-${randomUUID()}.tmp`);
    temporaryFiles.add(file);
    return file;
  };
  const removeTemp = async (file) => {
    let lastError;
    for (const delay of [0, 25, 75, 150, 300, 500]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        await fs.rm(file, { force: true });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (!['EBUSY', 'EPERM', 'EACCES'].includes(error.code)) break;
      }
    }
    if (lastError) throw lastError;
    temporaryFiles.delete(file);
  };
  const safePath = async (relative) => {
    if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0')) {
      throw new ToolError('文件路径无效。');
    }
    const parts = relative.split('/');
    if (path.isAbsolute(relative) || parts.some((part) => !part || part === '.' || part === '..' || part.includes(':'))) {
      throw new ToolError('只能访问目标目录内的图片。', 403);
    }
    let current = root;
    for (const part of parts) {
      current = path.join(current, part);
      const info = await fs.lstat(current);
      if (info.isSymbolicLink()) throw new ToolError('不能处理符号链接或目录联接。', 403);
    }
    if (!IMAGE_PATTERN.test(relative)) throw new ToolError('仅支持 JPG、JPEG、PNG、WebP 图片。');
    const info = await fs.stat(current);
    if (!info.isFile()) throw new ToolError('所选项目不是图片文件。');
    return current;
  };
  const readImage = async (relative) => fs.readFile(await safePath(relative));

  async function listImages() {
    const images = [];
    async function walk(directory, prefix = '') {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const file = prefix + entry.name;
        if (entry.isDirectory()) await walk(path.join(directory, entry.name), `${file}/`);
        else if (entry.isFile() && IMAGE_PATTERN.test(entry.name)) {
          try {
            const info = await fs.stat(await safePath(file));
            images.push({ file, name: entry.name, bytes: info.size, modified: info.mtimeMs });
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
        }
      }
    }
    await walk(root);
    return images.sort((a, b) => sort.compare(a.file, b.file));
  }

  async function thumbnail(relative) {
    const data = await readImage(relative);
    await inspectImage(data, relative);
    return sharp(data, sharpOptions).autoOrient().resize(160, 120, { fit: 'cover' }).webp({ quality: 65 }).toBuffer();
  }

  async function stageUpload(request, name) {
    if (closed) throw new ToolError('工具正在关闭。', 503);
    if (job?.status === 'running') throw new ToolError('请等待当前任务完成后再导入。', 409);
    if (uploads.size + uploading >= 1000) throw new ToolError('待导入图片最多 1000 张，请先处理或清空。');
    if (typeof name !== 'string' || name !== path.basename(name) || /[<>:"/\\|?*\x00-\x1f]/.test(name) || name.length > 180 || /[. ]$/.test(name) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(name) || !IMAGE_PATTERN.test(name)) {
      throw new ToolError('文件名无效，或格式不受支持。请选择 JPG、JPEG、PNG、WebP。');
    }
    const temporary = tempPath();
    let bytes = 0;
    uploading++;
    try {
      await pipeline(request, new Transform({
        transform(chunk, encoding, callback) {
          bytes += chunk.length;
          callback(bytes > MAX_UPLOAD_BYTES ? new ToolError('单张图片不能超过 50 MB。', 413) : null, chunk);
        },
      }), createWriteStream(temporary, { flags: 'wx' }));
      const uploaded = await fs.readFile(temporary);
      const metadata = await inspectImage(uploaded, name);
      await sharp(uploaded, sharpOptions).stats();
      const id = randomUUID();
      uploads.set(id, { temporary, name, bytes });
      return { id, name, bytes, width: metadata.width, height: metadata.height };
    } catch (error) {
      await removeTemp(temporary);
      throw error;
    } finally {
      uploading--;
    }
  }

  async function discardUploads(ids) {
    if (job?.status === 'running') throw new ToolError('任务处理中，暂时不能移除导入图片。', 409);
    for (const id of ids) {
      const upload = uploads.get(id);
      if (upload) {
        await removeTemp(upload.temporary);
        uploads.delete(id);
      }
    }
  }

  async function writeValidated(data, name) {
    const temporary = tempPath();
    try {
      const handle = await fs.open(temporary, 'wx');
      try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
      await inspectImage(data, name);
      await sharp(data, sharpOptions).stats();
      return temporary;
    } catch (error) {
      await removeTemp(temporary);
      throw error;
    }
  }

  async function compressExisting(relative, settings) {
    const file = await safePath(relative);
    const before = await fs.stat(file);
    const original = await fs.readFile(file);
    const encoded = await encodeImage(original, relative, settings);
    if (encoded.length >= original.length) {
      return { status: 'skipped', file: relative, before: original.length, after: original.length, message: '已足够小，保留原图' };
    }
    const temporary = await writeValidated(encoded, relative);
    try {
      const after = await fs.stat(await safePath(relative));
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino) {
        throw new ToolError('图片已被其他程序修改，已跳过。请刷新后重试。');
      }
      await fs.chmod(temporary, before.mode);
      // Same-directory rename replaces atomically; a failed rename leaves the source intact.
      await fs.rename(temporary, file);
      temporaryFiles.delete(temporary);
    } finally { await removeTemp(temporary); }
    return { status: 'compressed', file: relative, before: original.length, after: encoded.length, message: '已压缩' };
  }

  async function importImage(id, settings) {
    const upload = uploads.get(id);
    if (!upload) throw new ToolError('导入图片已过期，请重新选择。');
    let temporary;
    try {
      const original = await fs.readFile(upload.temporary);
      const encoded = await encodeImage(original, upload.name, settings);
      const smaller = encoded.length < original.length;
      const output = smaller ? encoded : original;
      temporary = await writeValidated(output, upload.name);
      const { name, ext } = path.parse(upload.name);
      let suffix = 1;
      let file;
      while (true) {
        file = suffix === 1 ? upload.name : `${name}-${suffix}${ext}`;
        try {
          // Publish a fully written file without overwriting a concurrent import.
          await fs.link(temporary, path.join(root, file));
          break;
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
          suffix++;
        }
      }
      return { status: 'imported', file, before: original.length, after: output.length, message: smaller ? '已压缩并导入' : '已导入原图（已足够小）' };
    } finally {
      if (temporary) await removeTemp(temporary);
      await removeTemp(upload.temporary);
      uploads.delete(id);
    }
  }

  async function synchronize(current) {
    current.sync = { status: 'running', message: '正在同步成长记录…' };
    try {
      await syncRecords();
      current.sync = { status: 'done', message: '成长记录已同步；新图片的拍摄日期待记录。' };
    } catch (error) {
      current.sync = { status: 'error', message: `图片已保存，记录同步失败：${error.message}。可重试同步或运行 npm run puppy:sync。` };
    }
  }

  function createJob(payload) {
    if (closed) throw new ToolError('工具正在关闭。', 503);
    if (uploading || job?.status === 'running') throw new ToolError('已有任务正在进行，请稍后再试。', 409);
    const { mode, items, confirmOverwrite } = payload;
    if (!['existing', 'import'].includes(mode) || !Array.isArray(items) || !items.length || items.length > 2000 || items.some((item) => typeof item !== 'string')) {
      throw new ToolError('请选择 1–2000 张图片。');
    }
    if (mode === 'existing' && confirmOverwrite !== true) throw new ToolError('请先确认覆盖原图。');
    if (mode === 'import' && items.some((id) => !uploads.has(id))) throw new ToolError('导入图片已过期，请重新选择。');
    const settings = validateSettings(payload.settings);
    const selected = [...new Set(items)];
    job = {
      id: randomUUID(), status: 'running', mode, settings, total: selected.length,
      completed: 0, current: '', results: [], savedBytes: 0, sync: null,
    };
    const current = job;
    work = (async () => {
      for (const item of selected) {
        current.current = mode === 'existing' ? item : uploads.get(item)?.name || item;
        let result;
        try {
          result = mode === 'existing' ? await compressExisting(item, settings) : await importImage(item, settings);
        } catch (error) {
          result = { status: 'error', file: current.current, message: error.message };
        }
        current.results.push(result);
        current.savedBytes += (result.before || 0) - (result.after || 0);
        current.completed++;
      }
      if (mode === 'import' && current.results.some((result) => result.status === 'imported')) await synchronize(current);
      current.status = 'done';
      current.current = '';
    })();
    return current;
  }

  async function retrySync() {
    if (!job || job.sync?.status !== 'error' || job.status === 'running') throw new ToolError('没有待重试的同步任务。');
    job.status = 'running';
    work = synchronize(job).finally(() => { job.status = 'done'; });
    return job;
  }

  return {
    root, listImages, readImage, thumbnail, stageUpload, discardUploads, createJob,
    getJob: () => job, retrySync,
    async close() {
      closed = true;
      await work;
      for (const file of temporaryFiles) await removeTemp(file);
      uploads.clear();
    },
  };
}
