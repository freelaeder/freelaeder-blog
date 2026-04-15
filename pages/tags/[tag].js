import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Layout, { GradientBackground } from '../../components/Layout';
import SEO from '../../components/SEO';
import { formatDisplayDate } from '../../utils/date-utils';
import { getGlobalData } from '../../utils/global-data';
import { getAllTags, getPostsByTagSlug } from '../../utils/tag-utils';

const previewText = (summary = '') =>
  summary.length > 140 ? `${summary.slice(0, 140).trim()}...` : summary;

export default function TagPage({ globalData, tag, posts }) {
  return (
    <Layout contentClassName="max-w-[980px]">
      <SEO
        title={`${tag.name} - ${globalData.name}`}
        description={`${tag.name} 相关文章`}
      />
      <Header name={globalData.name} />

      <main className="mx-auto w-full max-w-[780px] pb-8 pt-4 sm:pt-8">
        <section className="animate-fade-up text-center">
          <Link
            href="/tags"
            className="text-[0.68rem] tracking-[0.18em] text-neutral-500 uppercase hover:text-neutral-900 dark:text-white/42 dark:hover:text-white"
          >
            All tags
          </Link>
          <h1 className="mt-5 text-[clamp(2.5rem,8vw,4.2rem)] leading-[0.94]">
            {tag.name}
          </h1>
          <p className="mt-4 text-[0.72rem] tracking-[0.2em] text-neutral-500 uppercase dark:text-white/42">
            {posts.length} posts
          </p>
        </section>

        <section className="mt-14 border-t border-black/8 pt-4 dark:border-white/10 sm:mt-20 sm:pt-6">
          <ul className="divide-y divide-black/7 dark:divide-white/10">
            {posts.map((post, index) => (
              <li
                key={post.slug}
                className="story-card animate-fade-up"
                style={{ animationDelay: `${Math.min(index * 35, 260)}ms` }}
              >
                <Link
                  href={`/posts/${post.slug}`}
                  className="group grid gap-2 rounded-[1rem] px-3 py-5 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:py-6"
                >
                  <div className="min-w-0">
                    <h2 className="text-[1.24rem] leading-[1.35] text-neutral-900 transition-colors group-hover:text-neutral-950 dark:text-white sm:text-[1.48rem] dark:group-hover:text-white">
                      {post.data.title}
                    </h2>
                    {post.data.summary && (
                      <p className="line-clamp-1 mt-2 max-w-full text-sm leading-7 text-neutral-500 transition-colors group-hover:text-neutral-700 dark:text-white/48 dark:group-hover:text-white/68 sm:max-w-[36rem]">
                        {previewText(post.data.summary)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-[0.68rem] tracking-[0.18em] text-neutral-400 uppercase transition-colors group-hover:text-neutral-600 dark:text-white/35 sm:justify-end sm:pt-1 dark:group-hover:text-white/54">
                    <time>{formatDisplayDate(post.data.date)}</time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer copyrightText={globalData.footerText} />
      <GradientBackground variant="large" className="fixed top-0 opacity-80" />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-70"
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
