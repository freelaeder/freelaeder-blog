import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const postsDir = path.join(rootDir, 'posts');
const publicDir = path.join(rootDir, 'public');
const redirectsPath = path.join(publicDir, '_redirects');

async function main() {
  const entries = await fs.readdir(postsDir, { withFileTypes: true });
  const slugs = entries
    .filter((entry) => entry.isFile() && /\.mdx?$/i.test(entry.name))
    .map((entry) => entry.name.replace(/\.mdx?$/i, ''))
    .sort();

  const lines = slugs.flatMap((slug) => [
    `/archives/${slug}.html /posts/${slug} 301`,
    `/archives/${slug} /posts/${slug} 301`,
  ]);

  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(redirectsPath, `${lines.join('\n')}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
