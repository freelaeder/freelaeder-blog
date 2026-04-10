import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

// POSTS_PATH is useful when you want to get the path to a specific file
export const POSTS_PATH = path.join(process.cwd(), 'posts');
export const DEFAULT_POSTS_PAGE_SIZE = 8;
export const POST_SUMMARY_PAGES_PATH = path.join(
  process.cwd(),
  'public',
  'generated',
  'post-pages'
);

let cachedPosts = [];
let cachedPostSummaries = [];
let cachedPostsBySlug = new Map();
let cachedPostIndexKey = '';

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

const normalizePostData = (data, filePath) => {
  const slug = data.slug || data.abbrlink || getSlugFromFilePath(filePath);
  const summary = data.summary || data.description || '';

  return {
    ...data,
    slug,
    date: normalizeDate(data.date),
    updated: normalizeDate(data.updated),
    tags: normalizeTagList(data.tags),
    summary,
    description: summary,
    cover: data.cover || '',
  };
};

const normalizePost = (post) => ({
  ...post,
  slug: normalizePostData(post.data, post.filePath).slug,
  data: normalizePostData(post.data, post.filePath),
});

export const getPostFilePaths = () => {
  return (
    fs
      .readdirSync(POSTS_PATH)
      // Only include md(x) files
      .filter((filePath) => /\.mdx?$/.test(filePath))
      .sort()
  );
};

export const sortPostsByDate = (posts) => {
  return posts.sort((a, b) => {
    const aDate = new Date(a.data.date);
    const bDate = new Date(b.data.date);
    return bDate - aDate;
  });
};

const getPostIndexKey = (filePaths) =>
  filePaths
    .map((filePath) => {
      const absoluteFilePath = path.join(POSTS_PATH, filePath);
      const { mtimeMs, size } = fs.statSync(absoluteFilePath);

      return `${filePath}:${mtimeMs}:${size}`;
    })
    .join('|');

const getPostCache = () => {
  const filePaths = getPostFilePaths();
  const nextIndexKey = getPostIndexKey(filePaths);

  if (cachedPostIndexKey === nextIndexKey && cachedPosts.length > 0) {
    return {
      posts: cachedPosts,
      summaries: cachedPostSummaries,
      postsBySlug: cachedPostsBySlug,
    };
  }

  let posts = filePaths.map((filePath) => {
    const source = fs.readFileSync(path.join(POSTS_PATH, filePath));
    const { content, data } = matter(source);

    return normalizePost({
      content,
      data,
      filePath,
    });
  });

  posts = sortPostsByDate(posts);

  cachedPosts = posts;
  cachedPostSummaries = posts.map(({ content, ...post }) => post);
  cachedPostsBySlug = new Map(posts.map((post) => [post.slug, post]));
  cachedPostIndexKey = nextIndexKey;

  return {
    posts: cachedPosts,
    summaries: cachedPostSummaries,
    postsBySlug: cachedPostsBySlug,
  };
};

export const getPosts = () => getPostCache().posts;

export const getPostSummaries = ({ offset = 0, limit } = {}) => {
  const summaries = getPostCache().summaries;
  const normalizedOffset = Math.max(0, Number(offset) || 0);

  if (typeof limit !== 'number') {
    return summaries.slice(normalizedOffset);
  }

  const normalizedLimit = Math.max(0, limit);
  return summaries.slice(normalizedOffset, normalizedOffset + normalizedLimit);
};

export const getPostSummariesPage = (
  offset = 0,
  limit = DEFAULT_POSTS_PAGE_SIZE
) => {
  const summaries = getPostCache().summaries;
  const normalizedOffset = Math.max(0, Number(offset) || 0);
  const normalizedLimit = Math.max(1, Number(limit) || DEFAULT_POSTS_PAGE_SIZE);
  const posts = summaries.slice(
    normalizedOffset,
    normalizedOffset + normalizedLimit
  );
  const nextOffset = normalizedOffset + posts.length;

  return {
    posts,
    total: summaries.length,
    hasMore: nextOffset < summaries.length,
    nextOffset,
  };
};

export const buildPostSummaryPages = (
  pageSize = DEFAULT_POSTS_PAGE_SIZE
) => {
  const summaries = getPostCache().summaries;
  const normalizedPageSize = Math.max(1, Number(pageSize) || DEFAULT_POSTS_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(summaries.length / normalizedPageSize));

  fs.rmSync(POST_SUMMARY_PAGES_PATH, { recursive: true, force: true });
  fs.mkdirSync(POST_SUMMARY_PAGES_PATH, { recursive: true });

  for (let page = 1; page <= totalPages; page += 1) {
    const offset = (page - 1) * normalizedPageSize;
    const pagePayload = getPostSummariesPage(offset, normalizedPageSize);

    fs.writeFileSync(
      path.join(POST_SUMMARY_PAGES_PATH, `${page}.json`),
      JSON.stringify({
        ...pagePayload,
        page,
        totalPages,
      })
    );
  }

  return {
    totalPages,
    totalPosts: summaries.length,
  };
};

export const getPostBySlug = async (slug) => {
  const post = getPostCache().postsBySlug.get(slug);

  if (!post) {
    throw new Error(`Post not found for slug: ${slug}`);
  }

  const html = await marked.parse(post.content, {
    gfm: true,
    breaks: false,
  });

  return {
    html,
    data: post.data,
    postFilePath: path.join(POSTS_PATH, post.filePath),
  };
};

export const getNextPostBySlug = (slug) => {
  const posts = getPosts();
  const currentPost = posts.find((post) => post.slug === slug);
  const currentPostIndex = posts.indexOf(currentPost);

  const post = posts[currentPostIndex - 1];
  // no prev post found
  if (!post) return null;

  return {
    title: post.data.title,
    slug: post.slug,
  };
};

export const getPreviousPostBySlug = (slug) => {
  const posts = getPosts();
  const currentPost = posts.find((post) => post.slug === slug);
  const currentPostIndex = posts.indexOf(currentPost);

  const post = posts[currentPostIndex + 1];
  // no prev post found
  if (!post) return null;

  return {
    title: post.data.title,
    slug: post.slug,
  };
};
