import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Layout, { GradientBackground } from '../../components/Layout';
import SEO from '../../components/SEO';
import { getGlobalData } from '../../utils/global-data';
import { getAllTags, getPostsByTagSlug } from '../../utils/tag-utils';

export default function TagPage({ globalData, tag, posts }) {
  const previewText = (summary = '') =>
    summary.length > 160 ? `${summary.slice(0, 160).trim()}...` : summary;

  return (
    <Layout>
      <SEO
        title={`${tag.name} - ${globalData.name}`}
        description={`${tag.name} 相关文章`}
      />
      <Header name={globalData.name} />
      <main className="w-full max-w-5xl px-2 mx-auto md:px-0">
        <h1 className="mb-4 text-3xl text-center lg:text-5xl">{tag.name}</h1>
        <p className="mb-10 text-center opacity-70">{posts.length} 篇文章</p>
        <ul className="w-full">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="transition border border-b-0 bg-white/10 border-gray-800/10 md:first:rounded-t-lg md:last:rounded-b-lg backdrop-blur-lg dark:bg-black/30 hover:bg-white/20 dark:hover:bg-black/50 dark:border-white/10 last:border-b"
            >
              <Link
                href={`/posts/${post.slug}`}
                className="block px-6 py-6 lg:py-8 lg:px-12"
              >
                <p className="mb-2 text-sm font-semibold tracking-[0.18em] uppercase opacity-60">
                  {post.data.date}
                </p>
                <h2 className="text-2xl">{post.data.title}</h2>
                {post.data.summary && (
                  <p className="mt-3 opacity-70">{previewText(post.data.summary)}</p>
                )}
                {post.data.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.data.tags.slice(0, 4).map((postTag) => (
                      <span
                        key={`${post.slug}-${postTag}`}
                        className="px-3 py-1 text-xs tracking-[0.18em] uppercase rounded-full bg-black/5 dark:bg-white/10"
                      >
                        {postTag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="fixed top-20 opacity-40 dark:opacity-60"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-20 dark:opacity-10"
      />
    </Layout>
  );
}

export function getStaticPaths() {
  return {
    paths: getAllTags().map((tag) => ({
      params: { tag: tag.slug },
    })),
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  const { tag, posts } = getPostsByTagSlug(params.tag);

  return {
    props: {
      globalData: getGlobalData(),
      tag,
      posts,
    },
  };
}
