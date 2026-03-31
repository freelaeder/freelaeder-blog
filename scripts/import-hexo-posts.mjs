import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const projectRoot = process.cwd();
const providedHexoRoot = process.argv[2];
const defaultHexoRoot = 'E:\\Isands🙄\\blog\\ho';
const hexoRoot = path.resolve(providedHexoRoot || defaultHexoRoot);
const sourcePostsDir = path.join(hexoRoot, 'source', '_posts');
const publicArchivesDir = path.join(hexoRoot, 'public', 'archives');
const publicImgDir = path.join(hexoRoot, 'public', 'img');
const outputPostsDir = path.join(projectRoot, 'posts');
const outputLegacyImgDir = path.join(projectRoot, 'public', 'legacy', 'img');

const yamlQuote = (value = '') => JSON.stringify(`${value}`);

const normalizeArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const decodeHtml = (value = '') =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/g, '/');

const stripTags = (value = '') =>
  decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

const cleanSummaryText = (value = '') =>
  decodeHtml(value)
    .replace(/Copy;/gi, ' ')
    .replace(/\b\d{8,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toLegacyUrl = (url = '') => {
  if (!url) return '';
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('#')) {
    return url;
  }
  if (url.startsWith('/archives/')) {
    return url
      .replace(/\/archives\/([^/.]+)\.html$/, '/posts/$1')
      .replace(/\/archives\/([^/]+)$/, '/posts/$1');
  }
  if (url.startsWith('/')) {
    return `/legacy${url}`;
  }
  return url;
};

const sanitizeHtml = (html = '') => {
  let sanitized = html;

  sanitized = sanitized.replace(/<a[^>]*class="headerlink"[^>]*><\/a>/g, '');
  sanitized = sanitized.replace(
    /<img([^>]*?)src\s*=\s*(['"])(data:image[^'"]*)\2([^>]*?)data-lazy-src\s*=\s*(['"])([^'"]+)\5([^>]*?)>/gi,
    (_, before, _quote, _placeholder, middle, _quote2, lazySrc, after) =>
      `<img${before}src="${toLegacyUrl(lazySrc)}"${middle}${after}>`
  );
  sanitized = sanitized.replace(/\sdata-lazy-src\s*=\s*(['"])([^'"]+)\1/gi, (_, _quote, value) => ` src="${toLegacyUrl(value)}"`);
  sanitized = sanitized.replace(/\sdata-lazy-srcset\s*=\s*(['"])([^'"]+)\1/gi, (_, _quote, value) => ` srcset="${value}"`);
  sanitized = sanitized.replace(
    /\b(src|href|poster)\s*=\s*(['"])([^'"]+)\2/gi,
    (_, attr, quote, value) => `${attr}=${quote}${toLegacyUrl(value)}${quote}`
  );
  sanitized = sanitized.replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />');
  sanitized = sanitized.replace(/<br>/gi, '<br />');
  sanitized = sanitized.replace(/<hr>/gi, '<hr />');

  return sanitized.trim();
};

const summarizeArticleHtml = (html = '') => {
  const withoutCode = html
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ')
    .replace(/<img[^>]*\/?>/gi, ' ')
    .replace(/<div class="note[^"]*"[^>]*>/gi, ' ')
    .replace(/<div class="tip[^"]*"[^>]*>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<\/(p|li|blockquote|h1|h2|h3|h4|h5|h6|ul|ol)>/gi, '$&\n');

  const blocks = withoutCode
    .split(/\n+/)
    .map((part) => cleanSummaryText(stripTags(part)))
    .filter(Boolean)
    .filter((part) => part.length >= 8)
    .filter((part) => !/^[-–—:：]+$/.test(part))
    .filter((part) => !/^https?:\/\//i.test(part));

  const summary = blocks.slice(0, 2).join(' ').trim();
  return summary.slice(0, 180);
};

const extractArticleHtml = (html) => {
  const match = html.match(/<article class="post-content" id="article-container">([\s\S]*?)<\/article>/i);
  return match ? match[1].trim() : '';
};

const extractMetaDescription = (html) => {
  const match = html.match(/<meta name="description" content="([^"]*)">/i);
  return match ? decodeHtml(match[1]) : '';
};

const extractArchiveTitle = (html) => {
  const match = html.match(/<meta property="og:title" content="([^"]*)">/i);
  return match ? decodeHtml(match[1]) : '';
};

const toIsoDate = (dateValue = '') => {
  if (!dateValue) return '';
  if (dateValue instanceof Date) {
    const iso = dateValue.toISOString();
    return iso.replace(/\.\d{3}Z$/, '+08:00');
  }
  return `${`${dateValue}`.replace(' ', 'T')}+08:00`;
};

const buildFrontMatter = ({ title, date, updated, slug, tags, summary, cover }) => {
  const lines = [
    '---',
    `title: ${yamlQuote(title)}`,
    `date: ${yamlQuote(toIsoDate(date))}`,
    ...(updated ? [`updated: ${yamlQuote(toIsoDate(updated))}`] : []),
    `slug: ${yamlQuote(slug)}`,
    'tags:',
    ...tags.map((tag) => `  - ${yamlQuote(tag)}`),
    `summary: ${yamlQuote(summary)}`,
    ...(cover ? [`cover: ${yamlQuote(cover)}`] : []),
    '---',
    '',
  ];

  return lines.join('\n');
};

const ensureDir = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const cleanDirectory = (targetPath) => {
  ensureDir(targetPath);
  for (const entry of fs.readdirSync(targetPath)) {
    fs.rmSync(path.join(targetPath, entry), { recursive: true, force: true });
  }
};

if (!fs.existsSync(sourcePostsDir)) {
  throw new Error(`Hexo source posts directory not found: ${sourcePostsDir}`);
}

if (!fs.existsSync(publicArchivesDir)) {
  throw new Error(`Hexo public archives directory not found: ${publicArchivesDir}`);
}

cleanDirectory(outputPostsDir);
ensureDir(path.dirname(outputLegacyImgDir));

if (fs.existsSync(publicImgDir)) {
  fs.rmSync(outputLegacyImgDir, { recursive: true, force: true });
  fs.cpSync(publicImgDir, outputLegacyImgDir, { recursive: true });
}

const sourceFiles = fs
  .readdirSync(sourcePostsDir)
  .filter((fileName) => /\.md$/i.test(fileName))
  .sort((a, b) => a.localeCompare(b));

const sourceEntries = sourceFiles.map((fileName) => {
  const sourceFilePath = path.join(sourcePostsDir, fileName);
  const source = fs.readFileSync(sourceFilePath, 'utf8');
  const parsed = matter(source);
  const baseSlug = String(parsed.data.abbrlink || path.basename(fileName, path.extname(fileName)));

  return {
    fileName,
    fileBaseName: path.basename(fileName, path.extname(fileName)),
    source,
    data: parsed.data,
    baseSlug,
    sourceFilePath,
  };
});

const duplicateGroups = new Map();
for (const entry of sourceEntries) {
  if (!duplicateGroups.has(entry.baseSlug)) {
    duplicateGroups.set(entry.baseSlug, []);
  }
  duplicateGroups.get(entry.baseSlug).push(entry);
}

const slugOwners = new Map();
for (const [baseSlug, entries] of duplicateGroups.entries()) {
  if (entries.length === 1) {
    slugOwners.set(baseSlug, entries[0].fileName);
    continue;
  }

  const archiveFilePath = path.join(publicArchivesDir, `${baseSlug}.html`);
  const archiveTitle = fs.existsSync(archiveFilePath)
    ? extractArchiveTitle(fs.readFileSync(archiveFilePath, 'utf8'))
    : '';
  const matchedEntry =
    entries.find((entry) => `${entry.data.title || ''}` === archiveTitle) || entries[0];

  slugOwners.set(baseSlug, matchedEntry.fileName);
}

let importedCount = 0;

for (const entry of sourceEntries) {
  const { fileName, fileBaseName, source, data, baseSlug } = entry;
  const slug = slugOwners.get(baseSlug) === fileName ? baseSlug : fileBaseName;
  const archiveFilePath = path.join(publicArchivesDir, `${baseSlug}.html`);
  const canUseArchiveHtml = slugOwners.get(baseSlug) === fileName;

  let body = '';
  let summary = '';

  if (canUseArchiveHtml && fs.existsSync(archiveFilePath)) {
    const html = fs.readFileSync(archiveFilePath, 'utf8');
    body = sanitizeHtml(extractArticleHtml(html));
    summary = summarizeArticleHtml(body) || extractMetaDescription(html);
  }

  if (!body) {
    const fallbackMarkdown = source.replace(/^---[\s\S]*?---/, '').trim();
    body = sanitizeHtml(marked.parse(fallbackMarkdown));
  }

  if (!summary) {
    summary = summarizeArticleHtml(body) || cleanSummaryText(stripTags(body)).slice(0, 180);
  }

  const postContent = [
    buildFrontMatter({
      title: data.title || slug,
      date: data.date || '',
      updated: data.updated || '',
      slug,
      tags: normalizeArray(data.tags),
      summary,
      cover: toLegacyUrl(data.cover || ''),
    }),
    body,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outputPostsDir, `${slug}.mdx`), postContent, 'utf8');
  importedCount += 1;
}

console.log(`Imported ${importedCount} posts from ${hexoRoot}`);
