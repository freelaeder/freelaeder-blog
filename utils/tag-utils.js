import { getPostSummaries } from './mdx-utils';
import { tagToSlug } from './tag-slug';

export const getAllTags = () => {
  const tagMap = new Map();

  getPostSummaries().forEach((post) => {
    post.data.tags.forEach((tag) => {
      const existing = tagMap.get(tag) || 0;
      tagMap.set(tag, existing + 1);
    });
  });

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      slug: tagToSlug(name),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

export const getTagBySlug = (tagSlug) =>
  getAllTags().find((tag) => tag.slug === tagSlug) || null;

export const getPostsByTagSlug = (tagSlug) => {
  const tag = getTagBySlug(tagSlug);

  if (!tag) return { tag: null, posts: [] };

  const posts = getPostSummaries().filter((post) =>
    post.data.tags.includes(tag.name)
  );

  return { tag, posts };
};
