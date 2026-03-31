/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/archives/:slug.html',
        destination: '/posts/:slug',
        permanent: true,
      },
      {
        source: '/archives/:slug',
        destination: '/posts/:slug',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
