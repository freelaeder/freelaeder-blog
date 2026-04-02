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
      <main className="mx-auto w-full max-w-5xl px-2 md:px-0">
        <section className="glass-panel animate-fade-up rounded-[2rem] px-6 py-8 md:px-10 md:py-10">
          <p className="section-kicker mx-auto w-fit">Focused topic</p>
          <h1 className="mb-4 mt-5 text-center text-4xl lg:text-6xl">{tag.name}</h1>
          <p className="mb-10 text-center opacity-70">{posts.length} 篇文章</p>
          <ul className="w-full space-y-4">
            {posts.map((post) => (
              <li
                key={post.slug}
                className="story-card rounded-[1.6rem] border border-black/10 bg-white/[0.34] backdrop-blur-lg transition hover:border-primary/[0.18] hover:bg-white/[0.5] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
              >
                <Link
                  href={`/posts/${post.slug}`}
                  className="block px-6 py-6 lg:px-10 lg:py-8"
                >
                  <p className="mb-2 text-sm font-semibold tracking-[0.18em] uppercase opacity-60">
                    {post.data.date}
                  </p>
                  <h2 className="text-2xl">{post.data.title}</h2>
                  {post.data.summary && (
                    <p className="mt-3 opacity-70">{previewText(post.data.summary)}</p>
                  )}
                  {post.data.tags?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.data.tags.slice(0, 4).map((postTag) => (
                        <span
                          key={`${post.slug}-${postTag}`}
                          className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs tracking-[0.18em] uppercase dark:border-white/10 dark:bg-white/10"
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
        </section>
      </main>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="fixed top-12 opacity-[0.28] dark:opacity-[0.46]"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-[0.16] dark:opacity-[0.12]"
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
