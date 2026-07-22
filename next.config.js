/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Export route folders with index.html so local static servers can resolve
  // clean links such as /posts/my-post without requiring an .html suffix.
  trailingSlash: true,
};

module.exports = nextConfig;
