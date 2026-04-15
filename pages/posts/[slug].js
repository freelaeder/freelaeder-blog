import { startTransition, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getGlobalData } from '../../utils/global-data';
import {
  getPostBySlug,
  getPosts,
} from '../../utils/mdx-utils';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Layout, { GradientBackground } from '../../components/Layout';
import SEO from '../../components/SEO';
import { tagToSlug } from '../../utils/tag-slug';
import { formatDisplayDateTime } from '../../utils/date-utils';

const HOME_TIMELINE_RETURN_KEY = 'home-timeline-return';
const HOME_TIMELINE_RETURN_SLUG_KEY = 'home-timeline-return-slug';

const arrowUpIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 19V5M12 5l-5 5M12 5l5 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const archiveIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 7H5v4M5 11l5-5a7 7 0 111.5 11.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function PostPage({
  html,
  frontMatter,
  globalData,
}) {
  const router = useRouter();
  const [readProgress, setReadProgress] = useState(0);
  const [showFloatingActions, setShowFloatingActions] = useState(false);

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
      const currentScrollTop = scrollContainer.scrollTop;
      const maxScrollableDistance =
        scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const nextReadProgress =
        maxScrollableDistance > 0
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  (currentScrollTop / maxScrollableDistance) * 100
                )
              )
            )
          : 0;

      setReadProgress(nextReadProgress);
      setShowFloatingActions(currentScrollTop > 180);

      window.dispatchEvent(
        new CustomEvent('header-compact-state', {
          detail: { isScrolled: currentScrollTop > 36 },
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
    <Layout contentClassName="max-w-[980px]">
      <SEO
        title={`${frontMatter.title} - ${globalData.name}`}
        description={frontMatter.summary}
        image={frontMatter.cover}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px bg-black/8 dark:bg-white/10">
        <div
          className="h-full bg-neutral-950 transition-[width] duration-200 dark:bg-white"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <Header name={globalData.name} />

      <div
        className={`fixed inset-x-4 bottom-4 z-50 transition-all duration-200 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 ${
          showFloatingActions
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between gap-2 rounded-[1.2rem] border border-black/10 bg-[rgba(252,251,248,0.94)] px-3 py-3 shadow-[0_14px_32px_-20px_rgba(0,0,0,0.28)] backdrop-blur-sm dark:border-white/10 dark:bg-[rgba(21,21,19,0.92)] sm:justify-center sm:gap-3">
          <button
            type="button"
            aria-label="Back to top"
            onClick={scrollToTop}
            className="icon-button"
          >
            {arrowUpIcon}
          </button>
          <button
            type="button"
            aria-label="Back to archive"
            onClick={goBackToTimeline}
            className="icon-button"
          >
            {archiveIcon}
          </button>
          <span className="shrink-0 text-[0.68rem] tracking-[0.18em] text-neutral-500 uppercase dark:text-white/40">
            {readProgress}% read
          </span>
        </div>
      </div>

      <article className="mx-auto w-full max-w-[760px] pb-8 pt-4 sm:pt-8">
        <div className="animate-fade-up">
          <button
            type="button"
            onClick={goBackToTimeline}
            aria-label="Back to archive"
            className="icon-button"
          >
            {archiveIcon}
          </button>

          {frontMatter.date && (
            <p className="section-kicker mt-7">{formatDisplayDateTime(frontMatter.date)}</p>
          )}

          <h1 className="mt-5 text-[clamp(2.15rem,7vw,4.1rem)] leading-[0.98] text-neutral-950 dark:text-white">
            {frontMatter.title}
          </h1>

          {frontMatter.summary && (
            <p className="mt-6 max-w-[40rem] text-[15px] leading-8 text-neutral-600 dark:text-white/60 sm:text-lg">
              {frontMatter.summary}
            </p>
          )}

          {frontMatter.tags?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {frontMatter.tags.map((tag) => (
                <Link
                  key={`${frontMatter.slug}-${tag}`}
                  href={`/tags/${tagToSlug(tag)}`}
                  className="tech-pill hover:border-black/14 hover:text-neutral-900 dark:hover:border-white/16 dark:hover:text-white"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

        </div>

        {frontMatter.cover && (
          <div className="animate-fade-up mt-10 overflow-hidden rounded-[1rem] border border-black/8 dark:border-white/10">
            <img
              src={frontMatter.cover}
              alt={frontMatter.title}
              className="block aspect-[16/9] w-full object-cover"
            />
          </div>
        )}

        <main className="animate-fade-up mt-10 border-t border-black/8 pt-8 dark:border-white/10 sm:pt-10">
          <article
            className="prose prose-neutral max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </main>
      </article>

      <Footer copyrightText={globalData.footerText} />
      <GradientBackground variant="large" className="fixed top-0 opacity-80" />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-70"
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
  const paths = getPosts().map((post) => ({
    params: { slug: post.slug },
  }));

  return {
    paths,
    fallback: false,
  };
};
