import { getGlobalData } from '../../utils/global-data';
import {
  getPostBySlug,
  getPostFilePaths,
} from '../../utils/mdx-utils';

import { startTransition, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Layout, { GradientBackground } from '../../components/Layout';
import SEO from '../../components/SEO';
import { tagToSlug } from '../../utils/tag-slug';
import { formatDisplayDateTime } from '../../utils/date-utils';

const HOME_TIMELINE_RETURN_KEY = 'home-timeline-return';
const HOME_TIMELINE_RETURN_SLUG_KEY = 'home-timeline-return-slug';

export default function PostPage({
  html,
  frontMatter,
  globalData,
}) {
  const router = useRouter();
  const [isMetaDocked, setIsMetaDocked] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const heroHeaderRef = useRef(null);

  const scrollToTop = () => {
    const scrollContainer = document.getElementById('page-scroll-container');

    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const goBackToTimeline = () => {
    sessionStorage.setItem(HOME_TIMELINE_RETURN_KEY, '1');
    sessionStorage.setItem(HOME_TIMELINE_RETURN_SLUG_KEY, frontMatter.slug);
    startTransition(() => {
      router.push('/', undefined, { scroll: false });
    });
  };

  useEffect(() => {
    const scrollContainer = document.getElementById('page-scroll-container');

    if (!scrollContainer) {
      return undefined;
    }

    const handleScroll = () => {
      const nextScrolledState = scrollContainer.scrollTop > 48;
      const scrollContainerRect = scrollContainer.getBoundingClientRect();
      const heroHeaderRect = heroHeaderRef.current?.getBoundingClientRect();
      const maxScrollableDistance =
        scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const nextReadProgress =
        maxScrollableDistance > 0
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  (scrollContainer.scrollTop / maxScrollableDistance) * 100
                )
              )
            )
          : 0;

      setIsMetaDocked(
        heroHeaderRect
          ? heroHeaderRect.bottom <= scrollContainerRect.top + 104
          : scrollContainer.scrollTop > 220
      );
      setReadProgress(nextReadProgress);

      window.dispatchEvent(
        new CustomEvent('header-compact-state', {
          detail: { isScrolled: nextScrolledState },
        })
      );
    };

    handleScroll();
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.dispatchEvent(
        new CustomEvent('header-compact-state', {
          detail: { isScrolled: false },
        })
      );
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    router.prefetch('/');
  }, [router]);

  return (
    <Layout>
      <SEO
        title={`${frontMatter.title} - ${globalData.name}`}
        description={frontMatter.summary}
        image={frontMatter.cover}
      />
      <Header name={globalData.name} />
      <div className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 xl:block">
        <div
          className={`transition-all duration-300 ${
            isMetaDocked
              ? 'pointer-events-none translate-x-6 scale-95 opacity-0'
              : 'translate-x-0 scale-100 opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={goBackToTimeline}
            className="rounded-full border border-white/50 bg-white/72 px-4 py-2 text-xs tracking-[0.24em] uppercase shadow-[0_14px_36px_rgba(230,198,166,0.2)] backdrop-blur-md transition-colors hover:bg-white dark:border-white/10 dark:bg-black/30 dark:hover:bg-black/40"
          >
            Back to timeline
          </button>
        </div>

        <aside
          className={`absolute right-0 top-1/2 w-[18rem] -translate-y-1/2 transition-all duration-400 ${
            isMetaDocked
              ? 'translate-x-0 scale-100 opacity-100'
              : 'pointer-events-none translate-x-10 scale-95 opacity-0'
          }`}
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-white/26 p-4 shadow-[0_18px_60px_rgba(230,198,166,0.24)] backdrop-blur-[24px] dark:border-white/10 dark:bg-white/8 dark:shadow-[0_18px_56px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
            <div className="relative">
              {frontMatter.cover && (
                <div className="mb-4 overflow-hidden rounded-[1.35rem] border border-white/35 bg-white/35 dark:border-white/10 dark:bg-white/5">
                  <img
                    src={frontMatter.cover}
                    alt={frontMatter.title}
                    className="block aspect-[1.2/1] w-full object-cover"
                  />
                </div>
              )}
              {frontMatter.date && (
                <p className="text-[11px] font-semibold tracking-[0.24em] uppercase opacity-55">
                  {formatDisplayDateTime(frontMatter.date)}
                </p>
              )}
              <h2 className="mt-3 text-2xl leading-tight dark:text-white">
                {frontMatter.title}
              </h2>
              {frontMatter.summary && (
                <p className="mt-3 text-sm leading-7 opacity-72">
                  {frontMatter.summary}
                </p>
              )}
              {frontMatter.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {frontMatter.tags.slice(0, 3).map((tag) => (
                    <Link
                      key={`${frontMatter.slug}-dock-${tag}`}
                      href={`/tags/${tagToSlug(tag)}`}
                      className="rounded-full bg-black/5 px-3 py-1 text-[11px] tracking-[0.18em] uppercase dark:bg-white/10"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-5 rounded-[1.2rem] border border-white/35 bg-white/35 px-4 py-3 dark:border-white/10 dark:bg-white/6">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">
                  <span>Read</span>
                  <span>{readProgress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${readProgress}%` }}
                  />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-black/10 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="inline-flex rounded-full border border-white/55 bg-white/68 px-4 py-2 text-xs tracking-[0.22em] uppercase shadow-[0_10px_24px_rgba(230,198,166,0.18)] backdrop-blur-md transition-colors hover:bg-white dark:border-white/10 dark:bg-black/28 dark:hover:bg-black/40"
                >
                  Back to top
                </button>
                <button
                  type="button"
                  onClick={goBackToTimeline}
                  className="inline-flex rounded-full border border-white/55 bg-white/68 px-4 py-2 text-xs tracking-[0.22em] uppercase shadow-[0_10px_24px_rgba(230,198,166,0.18)] backdrop-blur-md transition-colors hover:bg-white dark:border-white/10 dark:bg-black/28 dark:hover:bg-black/40"
                >
                  Back to timeline
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <article className="w-full max-w-4xl px-2 mx-auto md:px-0">
        <header ref={heroHeaderRef}>
          {frontMatter.cover && (
            <div className="mb-8 overflow-hidden border border-black/10 rounded-[2rem] bg-white/60 dark:border-white/10 dark:bg-white/5">
              <img
                src={frontMatter.cover}
                alt={frontMatter.title}
                className="block object-cover w-full aspect-16/9"
              />
            </div>
          )}
          {frontMatter.date && (
            <p className="mb-3 text-sm font-semibold tracking-[0.22em] uppercase text-center opacity-60">
              {formatDisplayDateTime(frontMatter.date)}
            </p>
          )}
          <h1 className="mb-6 text-3xl text-center md:text-5xl dark:text-white">
            {frontMatter.title}
          </h1>
          {frontMatter.summary && (
            <p className="max-w-2xl mx-auto mb-6 text-lg text-center opacity-75">
              {frontMatter.summary}
            </p>
          )}
          {frontMatter.tags?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {frontMatter.tags.map((tag) => (
                <Link
                  key={`${frontMatter.slug}-${tag}`}
                  href={`/tags/${tagToSlug(tag)}`}
                  className="px-3 py-1 text-xs tracking-[0.18em] uppercase rounded-full bg-black/5 dark:bg-white/10"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </header>
        <main>
          <article
            className="prose prose-neutral max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </main>
      </article>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="absolute -top-32 opacity-30 dark:opacity-50"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-20 dark:opacity-10"
      />
    </Layout>
  );
}

export const getStaticProps = async ({ params }) => {
  const globalData = getGlobalData();
  const { html, data } = await getPostBySlug(params.slug);

  return {
    props: {
      globalData,
      html,
      frontMatter: data,
    },
  };
};

export const getStaticPaths = async () => {
  const paths = getPostFilePaths()
    .map((filePath) => filePath.replace(/\.mdx?$/, ''))
    .map((slug) => ({ params: { slug } }));

  return {
    paths,
    fallback: false,
  };
};
