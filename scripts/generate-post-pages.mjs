import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const ROOT_PATH = process.cwd();
const POSTS_PATH = path.join(ROOT_PATH, 'posts');
const OUTPUT_PATH = path.join(ROOT_PATH, 'public', 'generated', 'post-pages');
const PAGE_SIZE = 8;

const normalizeTagList = (tags = []) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => `${tag}`.trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeDate = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue !== 'string') return `${dateValue}`;
  return dateValue.replace('T', ' ').replace(/\+\d\d:\d\d$/, '');
};

const getSlugFromFilePath = (filePath) => filePath.replace(/\.mdx?$/, '');

const getPostSummaries = () => {
  const filePaths = fs
    .readdirSync(POSTS_PATH)
    .filter((filePath) => /\.mdx?$/.test(filePath));

  return filePaths
    .map((filePath) => {
      const source = fs.readFileSync(path.join(POSTS_PATH, filePath), 'utf8');
      const { data } = matter(source);
      const slug = data.slug || data.abbrlink || getSlugFromFilePath(filePath);
      const summary = data.summary || data.description || '';

      return {
        slug,
        data: {
          ...data,
          slug,
          date: normalizeDate(data.date),
          updated: normalizeDate(data.updated),
          tags: normalizeTagList(data.tags),
          summary,
          description: summary,
          cover: data.cover || '',
        },
      };
    })
    .sort((firstPost, secondPost) => {
      return new Date(secondPost.data.date) - new Date(firstPost.data.date);
    });
};

const writePostSummaryPages = () => {
  const posts = getPostSummaries();
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));

  fs.rmSync(OUTPUT_PATH, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });

  for (let page = 1; page <= totalPages; page += 1) {
    const offset = (page - 1) * PAGE_SIZE;
    const pagePosts = posts.slice(offset, offset + PAGE_SIZE);

    fs.writeFileSync(
      path.join(OUTPUT_PATH, `${page}.json`),
      JSON.stringify({
        posts: pagePosts,
        total: posts.length,
        hasMore: page < totalPages,
        nextOffset: offset + pagePosts.length,
        page,
        totalPages,
      })
    );
  }

  console.log(`Generated ${totalPages} post summary pages in ${OUTPUT_PATH}`);
};

writePostSummaryPages();
