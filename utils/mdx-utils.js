import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

// POSTS_PATH is useful when you want to get the path to a specific file
export const POSTS_PATH = path.join(process.cwd(), 'posts');

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

export const getPosts = () => {
  let posts = getPostFilePaths().map((filePath) => {
    const source = fs.readFileSync(path.join(POSTS_PATH, filePath));
    const { content, data } = matter(source);

    return normalizePost({
      content,
      data,
      filePath,
    });
  });

  posts = sortPostsByDate(posts);

  return posts;
};

export const getPostSummaries = () =>
  getPosts().map(({ content, ...post }) => post);

export const getPostBySlug = async (slug) => {
  const post = getPosts().find((entry) => entry.slug === slug);

  if (!post) {
    throw new Error(`Post not found for slug: ${slug}`);
  }

  const postFilePath = path.join(POSTS_PATH, post.filePath);
  const source = fs.readFileSync(postFilePath);

  const { content, data } = matter(source);
  const normalizedData = normalizePostData(data, post.filePath);
  const html = await marked.parse(content, {
    gfm: true,
    breaks: false,
  });

  return { html, data: normalizedData, postFilePath };
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
