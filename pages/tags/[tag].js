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
      <main className="mx-auto w-full max-w-5xl px-0.5 sm:px-2 md:px-0">
        <section className="glass-panel animate-fade-up rounded-[1.6rem] px-5 py-6 sm:px-6 sm:py-8 md:rounded-[2rem] md:px-10 md:py-10">
          <p className="section-kicker mx-auto w-fit">Focused topic</p>
          <h1 className="mb-4 mt-5 text-center text-[2.4rem] sm:text-4xl lg:text-6xl">{tag.name}</h1>
          <p className="mb-8 text-center text-[15px] opacity-70 sm:mb-10 sm:text-base">{posts.length} 篇文章</p>
          <ul className="w-full space-y-3 sm:space-y-4">
            {posts.map((post) => (
              <li
                key={post.slug}
                className="story-card rounded-[1.35rem] border border-black/8 bg-white/[0.56] backdrop-blur-lg transition hover:border-primary/[0.16] hover:bg-white/[0.78] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] sm:rounded-[1.6rem]"
              >
                <Link
                  href={`/posts/${post.slug}`}
                  className="block px-5 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8"
                >
                  <p className="mb-2 text-[12px] font-semibold tracking-[0.14em] uppercase opacity-60 sm:text-sm sm:tracking-[0.18em]">
                    {post.data.date}
                  </p>
                  <h2 className="text-[1.35rem] leading-tight sm:text-2xl">{post.data.title}</h2>
                  {post.data.summary && (
                    <p className="mt-3 text-[15px] leading-6 opacity-70 sm:text-base sm:leading-7">
                      {previewText(post.data.summary)}
                    </p>
                  )}
                  {post.data.tags?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.data.tags.slice(0, 4).map((postTag) => (
                        <span
                          key={`${post.slug}-${postTag}`}
                          className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] tracking-[0.12em] uppercase dark:border-white/10 dark:bg-white/10 sm:text-xs sm:tracking-[0.18em]"
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
        className="fixed top-12 opacity-[0.2] dark:opacity-[0.32]"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-[0.1] dark:opacity-[0.08]"
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
