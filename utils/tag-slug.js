export const tagToSlug = (tag) =>
  encodeURIComponent(tag).replace(/%/g, '_').toLowerCase();
