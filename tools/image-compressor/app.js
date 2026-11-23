const $ = (selector) => document.querySelector(selector);
const gallery = $('#photo-grid');
const dropZone = $('#drop-zone');
const filePicker = $('#file-picker');
const importPanel = $('#import-panel');
const confirmDialog = $('#overwrite-dialog');
const scopeDialog = $('#scope-dialog');
const progressSection = $('#progress-section');
let token = '';
let images = [];
let selected = new Set();
let imports = [];
let currentJobId = '';
let polling = false;
let uploadingCount = 0;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
};
const api = async (url, { tokenRequired = false, ...options } = {}) => {
  const headers = new Headers(options.headers || {});
  if (tokenRequired) headers.set('X-Tool-Token', token);
  const response = await fetch(url, { ...options, headers, cache: 'no-store' });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(data?.error || `本机服务请求失败（${response.status}）。`);
  return data;
};

function shownImages() {
  const query = $('#filter-input').value.trim().toLocaleLowerCase();
  return images.filter((image) => image.file.toLocaleLowerCase().includes(query));
}

function drawGallery() {
  const visible = shownImages();
  $('#photo-count').textContent = `${images.length} 张`;
  gallery.dataset.view = $('.view-button.active')?.dataset.view || 'grid';
  $('#select-all').checked = visible.length > 0 && visible.every((image) => selected.has(image.file));
  $('#select-all').indeterminate = visible.some((image) => selected.has(image.file)) && !$('#select-all').checked;
  if (!images.length) {
    gallery.innerHTML = '<div class="empty-state">这个文件夹里还没有支持的图片。<br />可以从电脑中选择照片添加进来。</div>';
    updateSelection();
    return;
  }
  if (!visible.length) {
    gallery.innerHTML = '<div class="empty-state">没有找到匹配的照片。<br />试试其他关键词，或清空搜索。</div>';
    updateSelection();
    return;
  }
  gallery.innerHTML = visible.map((image) => {
    const checked = selected.has(image.file);
    const escapedFile = escapeHtml(image.file);
    const escapedName = escapeHtml(image.name);
    const extension = image.name.split('.').pop().toUpperCase();
    return `<article class="photo-item${checked ? ' selected' : ''}" data-file="${escapedFile}">
      <label class="photo-check" aria-label="选择 ${escapedName}"><input type="checkbox" data-file="${escapedFile}"${checked ? ' checked' : ''}/><span class="checkmark"></span></label>
      <img class="thumb" src="/api/thumbnail?file=${encodeURIComponent(image.file)}" alt="${escapedName}" loading="lazy" />
      <div class="photo-info"><span class="photo-name" title="${escapedFile}">${escapedName}</span><span class="photo-meta"><span class="badge">${extension}</span><span>${formatBytes(image.bytes)}</span></span></div>
    </article>`;
  }).join('');
  updateSelection();
}

function updateSelection() {
  const count = selected.size + imports.filter((item) => !item.error).length;
  const imported = imports.filter((item) => !item.error).length;
  $('#selected-count').textContent = `已选 ${count} 张`;
  $('#selection-summary').textContent = imported ? `目录内 ${selected.size} 张 · 待导入 ${imported} 张` : selected.size ? `准备压缩 ${selected.size} 张成长照片` : '选择想要处理的照片';
  $('#button-count').textContent = count ? `${count}` : '';
  $('#compress-button').disabled = !count || uploadingCount > 0 || $('#compress-button').dataset.busy === 'true';
  const busy = $('#compress-button').dataset.busy === 'true';
  $('#select-all').disabled = !images.length || busy;
  gallery.querySelectorAll('input[data-file]').forEach((input) => { input.disabled = busy; });
  $('#quality-setting').disabled = busy;
  $('#edge-setting').disabled = busy;
  $('#choose-files').disabled = busy;
  $('#refresh-button').disabled = busy;
  importPanel.querySelectorAll('button[data-remove-name]').forEach((button) => { button.disabled = busy; });
  renderImports();
}

function renderImports() {
  const pending = imports.filter((item) => !item.error);
  importPanel.hidden = imports.length === 0;
  if (!imports.length) { importPanel.innerHTML = ''; return; }
  importPanel.innerHTML = `<div class="import-heading"><strong>待导入照片</strong><span>${pending.length} 张可处理</span></div><div class="import-list">${imports.map((item) => `<div class="import-row"><span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><span>${item.error ? `<span class="error-text">${escapeHtml(item.error)}</span>` : formatBytes(item.bytes)}</span><button type="button" data-remove-upload="${item.id || ''}" data-remove-name="${escapeHtml(item.name)}" aria-label="移除 ${escapeHtml(item.name)}"${item.uploading || $('#compress-button').dataset.busy === 'true' ? ' disabled' : ''}>移除</button></div>`).join('')}</div>`;
}

async function loadImages() {
  gallery.setAttribute('aria-busy', 'true');
  gallery.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在读取成长照片…</div>';
  $('#refresh-button').disabled = true;
  try {
    const { images: entries } = await api('/api/images');
    images = entries;
    const existing = new Set(images.map((image) => image.file));
    selected = new Set([...selected].filter((file) => existing.has(file)));
    $('#folder-path').textContent = window.imageRoot || 'public/images/puppy-growth';
    $('#folder-path').title = window.imageRoot || 'public/images/puppy-growth';
    drawGallery();
  } catch (error) {
    gallery.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}<br />请确认工具已启动，并从本机地址重新打开。</div>`;
    $('#folder-path').textContent = '无法连接，请刷新页面';
  } finally {
    gallery.setAttribute('aria-busy', 'false');
    $('#refresh-button').disabled = false;
  }
}

function settings() {
  const quality = Number($('#quality-setting').value);
  const maxEdge = Number($('#edge-setting').value);
  if (!Number.isInteger(maxEdge) || (maxEdge !== 0 && (maxEdge < 256 || maxEdge > 10000))) {
    $('#edge-setting').setAttribute('aria-invalid', 'true');
    $('#edge-setting').focus();
    throw new Error('最长边需要是 256–10000 的整数，或填写 0。');
  }
  $('#edge-setting').removeAttribute('aria-invalid');
  return { quality, maxEdge };
}

function updateProgress(job) {
  if (!job) return;
  progressSection.hidden = false;
  const percent = job.total ? Math.round(job.completed / job.total * 100) : 0;
  $('.progress-track').setAttribute('aria-valuenow', percent);
  $('#progress-fill').style.width = `${percent}%`;
  $('#progress-value').textContent = `${job.completed} / ${job.total}`;
  $('#progress-current').textContent = job.status === 'running' ? job.completed === job.total && job.sync?.status === 'running' ? job.sync.message : `正在处理：${job.current || '准备中…'}` : `处理完成 · ${job.results?.length || 0} 张照片`;
  $('#results-list').innerHTML = (job.results || []).slice().reverse().map((result) => {
    let outcome = result.message;
    if (result.before !== undefined) outcome += result.before > result.after && result.status === 'compressed' ? ` · ${formatBytes(result.before - result.after)}` : '';
    return `<div class="result-row"><span title="${escapeHtml(result.file)}">${escapeHtml(result.file)}</span><span class="${result.status === 'error' ? 'error' : result.status === 'compressed' || result.status === 'imported' ? 'success' : ''}">${escapeHtml(outcome)}</span></div>`;
  }).join('');
  const status = $('#sync-status');
  const retry = $('#retry-sync');
  if (job.sync) {
    status.hidden = false;
    status.classList.toggle('error', job.sync.status === 'error');
    status.textContent = job.sync.message;
    retry.hidden = job.sync.status !== 'error' || job.status === 'running';
    retry.disabled = job.sync.status === 'running';
  }
  $('#compress-button').dataset.busy = job.status === 'running' ? 'true' : 'false';
  updateSelection();
}

async function pollJob(jobId) {
  if (polling) return;
  polling = true;
  currentJobId = jobId;
  try {
    while (currentJobId === jobId) {
      const { job } = await api('/api/jobs/latest');
      if (!job || job.id !== jobId) break;
      updateProgress(job);
      if (job.status === 'done') {
        if (job.mode === 'existing') selected.clear();
        drawGallery();
        if (job.mode === 'import') { imports = []; updateSelection(); }
        if (job.results.some((result) => result.status === 'imported')) await loadImages();
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    $('#progress-current').textContent = `进度刷新失败：${error.message}。刷新页面后可重新查看结果。`;
  } finally { polling = false; }
}

function askBeforeOverwrite() {
  $('#dialog-copy').textContent = `将尝试压缩 ${selected.size} 张成长照片。仅替换压缩后体积确实变小且通过校验的图片；已替换的原图无法恢复。`;
  return new Promise((resolve) => {
    const close = () => { confirmDialog.removeEventListener('close', close); resolve(confirmDialog.returnValue === 'confirm'); };
    confirmDialog.addEventListener('close', close);
    confirmDialog.showModal();
    $('#confirm-compress').focus();
  });
}

function chooseScope() {
  return new Promise((resolve) => {
    const close = () => { scopeDialog.removeEventListener('close', close); resolve(scopeDialog.returnValue); };
    scopeDialog.addEventListener('close', close);
    scopeDialog.showModal();
    scopeDialog.querySelector('[value="existing"]').focus();
  });
}

async function startProcessing() {
  let compressionSettings;
  try { compressionSettings = settings(); } catch (error) { $('#drop-status').textContent = error.message; return; }
  const activeImports = imports.filter((item) => !item.error);
  let mode;
  let items;
  if (selected.size && activeImports.length) {
    const choice = await chooseScope();
    if (choice === 'existing') { mode = 'existing'; items = [...selected]; }
    else if (choice === 'import') { mode = 'import'; items = activeImports.map((item) => item.id); }
    else return;
  } else if (activeImports.length) { mode = 'import'; items = activeImports.map((item) => item.id); }
  else { mode = 'existing'; items = [...selected]; }
  let confirmOverwrite = false;
  if (mode === 'existing') {
    confirmOverwrite = await askBeforeOverwrite();
    if (!confirmOverwrite) return;
  }
  const button = $('#compress-button');
  button.dataset.busy = 'true';
  button.disabled = true;
  $('#progress-section').hidden = false;
  $('#results-list').replaceChildren();
  $('#sync-status').hidden = true;
  $('#retry-sync').hidden = true;
  try {
    const { job } = await api('/api/jobs', { method: 'POST', tokenRequired: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, items, confirmOverwrite, settings: compressionSettings }) });
    updateProgress(job);
    pollJob(job.id);
    progressSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    button.dataset.busy = 'false';
    $('#progress-current').textContent = error.message;
    updateSelection();
  }
}

const accepted = (file) => /\.(jpe?g|png|webp)$/i.test(file.name) && (!file.type || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type));

async function stageFiles(files) {
  if ($('#compress-button').dataset.busy === 'true') { $('#drop-status').textContent = '处理过程中不能添加新图片，请等待当前任务完成。'; return; }
  const available = [...files];
  if (!available.length) return;
  const room = Math.max(0, 1000 - imports.length);
  const queue = available.slice(0, room);
  uploadingCount += queue.filter((file) => accepted(file) && file.size <= 50 * 1024 * 1024).length;
  updateSelection();
  if (queue.length < available.length) $('#drop-status').textContent = '待导入图片最多 1000 张，超出数量未加入。';
  for (const file of queue) {
    if (!accepted(file)) {
      imports.push({ id: '', name: file.name, bytes: file.size, error: '格式不支持（不接收视频或动图）' });
      updateSelection();
      continue;
    }
    if (file.size > 50 * 1024 * 1024) {
      imports.push({ id: '', name: file.name, bytes: file.size, error: '单张图片不能超过 50 MB' });
      updateSelection();
      continue;
    }
    const staged = { id: '', name: file.name, bytes: file.size, uploading: true };
    imports.push(staged);
    updateSelection();
    $('#drop-status').textContent = `正在读取 ${file.name}…`;
    try {
      const query = new URLSearchParams({ name: file.name });
      const response = await fetch(`/api/uploads?${query}`, { method: 'POST', headers: { 'X-Tool-Token': token, 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '上传失败。');
      Object.assign(staged, result, { uploading: false });
      $('#drop-status').textContent = `已添加 ${file.name}`;
    } catch (error) {
      staged.error = error.message;
      staged.uploading = false;
      $('#drop-status').textContent = `${file.name}：${error.message}`;
    } finally {
      uploadingCount--;
    }
    updateSelection();
  }
}

gallery.addEventListener('change', (event) => {
  const input = event.target.closest('input[data-file]');
  if (!input) return;
  if (input.checked) selected.add(input.dataset.file); else selected.delete(input.dataset.file);
  input.closest('.photo-item').classList.toggle('selected', input.checked);
  updateSelection();
  const visible = shownImages();
  $('#select-all').checked = visible.length > 0 && visible.every((image) => selected.has(image.file));
  $('#select-all').indeterminate = visible.some((image) => selected.has(image.file)) && !$('#select-all').checked;
});
$('#select-all').addEventListener('change', (event) => {
  shownImages().forEach((image) => event.target.checked ? selected.add(image.file) : selected.delete(image.file));
  drawGallery();
});
$('#filter-input').addEventListener('input', drawGallery);
$('#quality-setting').addEventListener('input', (event) => { $('#quality-value').value = event.target.value; });
$('#refresh-button').addEventListener('click', loadImages);
$('#choose-files').addEventListener('click', () => filePicker.click());
filePicker.addEventListener('change', async () => { await stageFiles(filePicker.files); filePicker.value = ''; });
for (const type of ['dragenter', 'dragover']) dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.add('dragover'); });
for (const type of ['dragleave', 'drop']) dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (event) => stageFiles(event.dataTransfer.files));
dropZone.addEventListener('click', (event) => { if (event.target.closest('button, input')) return; filePicker.click(); });
dropZone.addEventListener('keydown', (event) => { if (event.target === dropZone && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); filePicker.click(); } });
dropZone.tabIndex = 0;
dropZone.setAttribute('role', 'region');
dropZone.setAttribute('aria-label', '拖入或选择其他照片');
$('.view-toggle').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (!button) return;
  const activeButton = $('.view-button.active');
  activeButton?.classList.remove('active');
  activeButton?.setAttribute('aria-pressed', 'false');
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  drawGallery();
});
importPanel.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-remove-name]');
  if (!button) return;
  const index = imports.findIndex((item) => item.name === button.dataset.removeName);
  const item = imports[index];
  if (item?.id) {
    try { await api('/api/uploads', { method: 'DELETE', tokenRequired: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [item.id] }) }); }
    catch (error) { $('#drop-status').textContent = error.message; return; }
  }
  imports.splice(index, 1);
  updateSelection();
});
$('#compress-button').addEventListener('click', startProcessing);
$('#retry-sync').addEventListener('click', async () => {
  try {
    const { job } = await api('/api/sync', { method: 'POST', tokenRequired: true });
    updateProgress(job);
    pollJob(job.id);
  } catch (error) { $('#sync-status').textContent = error.message; }
});

async function boot() {
  try {
    const config = await api('/api/config');
    token = config.token;
    window.imageRoot = config.imageRoot;
    await loadImages();
    const { job } = await api('/api/jobs/latest');
    if (job) { updateProgress(job); if (job.status === 'running') pollJob(job.id); }
  } catch (error) {
    $('#folder-path').textContent = error.message;
    gallery.setAttribute('aria-busy', 'false');
    gallery.innerHTML = '<div class="empty-state">请通过 npm run images:compress 启动本机工具。<br />然后从终端提供的本机地址打开页面。</div>';
  }
  updateSelection();
}
boot();
