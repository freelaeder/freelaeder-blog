import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const imageRoot = path.join(rootDir, 'public', 'images', 'puppy-growth');
const recordsPath = path.join(imageRoot, 'image-age-records.json');
const supportedImagePattern = /\.(?:avif|gif|jpe?g|jfif|png|svg|webp)$/i;
const dayInMs = 24 * 60 * 60 * 1000;
const defaultBaseline = { date: '2026-07-04', months: 1, days: 12 };
const naturalSort = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

const normalizePath = (value) => value.replace(/\\/g, '/');

const toUtcDate = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const calculateAge = (dateKey, baseline) => {
  const elapsedDays = Math.max(
    0,
    Math.round((toUtcDate(dateKey) - toUtcDate(baseline.date)) / dayInMs)
  );
  const totalDays = baseline.months * 30 + baseline.days + elapsedDays;
  return { months: Math.floor(totalDays / 30), days: totalDays % 30 };
};

const formatAge = ({ months, days }) => {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return [
      `${years}岁`,
      remainingMonths > 0 ? `${remainingMonths}个月` : '',
      days > 0 ? `${days}天` : '',
    ].filter(Boolean).join('');
  }

  return `${months}个月${days > 0 ? `${days}天` : ''}`;
};

async function readImages(directory, relativeDirectory = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = normalizePath(path.join(relativeDirectory, entry.name));
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await readImages(absolutePath, relativePath));
    } else if (entry.isFile() && supportedImagePattern.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

async function readRecordData() {
  try {
    return JSON.parse(await fs.readFile(recordsPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { schemaVersion: 1, baseline: defaultBaseline, records: [] };
    }
    throw error;
  }
}

async function main() {
  await fs.mkdir(imageRoot, { recursive: true });
  const recordData = await readRecordData();
  const baseline = recordData.baseline || defaultBaseline;
  const records = Array.isArray(recordData.records) ? recordData.records : [];
  const images = (await readImages(imageRoot)).sort(naturalSort.compare);
  const imageSet = new Set(images.map((file) => file.toLocaleLowerCase()));
  const recordsByFile = new Map(
    records.map((record) => [normalizePath(String(record.file || '')).toLocaleLowerCase(), record])
  );
  const recordsBySequence = new Map(
    records.map((record) => [Number(record.sequence), record])
  );
  let nextSequence = Math.max(0, ...records.map((record) => Number(record.sequence) || 0)) + 1;
  let addedCount = 0;

  for (const file of images) {
    const normalizedFile = file.toLocaleLowerCase();
    if (recordsByFile.has(normalizedFile)) continue;

    const fileStem = path.parse(file).name;
    const numericSequence = /^\d+$/.test(fileStem) ? Number(fileStem) : null;
    const replaceableRecord = numericSequence ? recordsBySequence.get(numericSequence) : null;

    if (
      replaceableRecord &&
      !imageSet.has(normalizePath(String(replaceableRecord.file)).toLocaleLowerCase())
    ) {
      replaceableRecord.file = file;
      continue;
    }

    const sequence = numericSequence && !recordsBySequence.has(numericSequence)
      ? numericSequence
      : nextSequence;
    nextSequence = Math.max(nextSequence, sequence + 1);
    const record = {
      sequence,
      file,
      capturedOn: null,
      age: '日期待记录',
    };
    records.push(record);
    recordsByFile.set(normalizedFile, record);
    recordsBySequence.set(sequence, record);
    addedCount += 1;
  }

  for (const record of records) {
    record.file = normalizePath(String(record.file));
    record.age = record.capturedOn
      ? formatAge(calculateAge(record.capturedOn, baseline))
      : '日期待记录';
  }

  records.sort((first, second) => first.sequence - second.sequence);
  const nextData = {
    schemaVersion: 1,
    baseline,
    records,
  };
  await fs.writeFile(recordsPath, `${JSON.stringify(nextData, null, 2)}\n`, 'utf8');
  console.log(
    addedCount > 0
      ? `Added ${addedCount} puppy image record(s); capture dates are pending.`
      : `Puppy image age records are up to date (${records.length}).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
