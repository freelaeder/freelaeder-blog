import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { getPostSummaries } from '../utils/mdx-utils';

import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout, { GradientBackground } from '../components/Layout';
import ArrowIcon from '../components/ArrowIcon';
import { getGlobalData } from '../utils/global-data';
import SEO from '../components/SEO';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatTimelineDate,
  getDateParts,
} from '../utils/date-utils';

const getTimestamp = (dateValue = '') => {
  const normalized = `${dateValue}`.replace(' ', 'T');
  const value = new Date(normalized).getTime();

  return Number.isNaN(value) ? 0 : value;
};

const sortPostsByLatest = (posts) =>
  [...posts].sort((firstPost, secondPost) => {
    return getTimestamp(secondPost.data.date) - getTimestamp(firstPost.data.date);
  });

const groupPostsByYear = (posts) =>
  posts.reduce((groups, post) => {
    const { year } = getDateParts(post.data.date);

    if (!groups[year]) {
      groups[year] = [];
    }

    groups[year].push(post);
    return groups;
  }, {});

const getYearGroupsByLatest = (posts) =>
  Object.entries(groupPostsByYear(posts)).sort(
    ([firstYear], [secondYear]) => Number(secondYear) - Number(firstYear)
  );

const HOME_TIMELINE_STATE_KEY = 'home-timeline-state';
const HOME_TIMELINE_RETURN_KEY = 'home-timeline-return';
const HOME_TIMELINE_RETURN_SLUG_KEY = 'home-timeline-return-slug';

export default function Index({ posts, globalData }) {
  const [activeSlug, setActiveSlug] = useState(posts[0]?.slug || '');
  const [isTimelineScrolled, setIsTimelineScrolled] = useState(false);
  const isRestoringTimelineRef = useRef(false);
  const isTimelineStateReadyRef = useRef(false);

  const previewText = (summary = '') =>
    summary.length > 126 ? `${summary.slice(0, 126).trim()}...` : summary;

  const latestPost = posts[0];
  const oldestPost = posts[posts.length - 1];
  const yearGroups = getYearGroupsByLatest(posts);
  const postMap = useMemo(
    () => new Map(posts.map((post) => [post.slug, post])),
    [posts]
  );
  const activePost = postMap.get(activeSlug);
  const activeYear = activePost ? getDateParts(activePost.data.date).year : '';

  const isTimelineRailVisible = () => {
    const timelineRail = document.getElementById('timeline-rail');

    if (!timelineRail) {
      return false;
    }

    const timelineRailStyles = window.getComputedStyle(timelineRail);

    return (
      timelineRailStyles.display !== 'none' &&
      timelineRailStyles.visibility !== 'hidden' &&
      timelineRail.offsetParent !== null
    );
  };

  const getTimelineScrollTopForSlug = (slug) => {
    const timelineRail = document.getElementById('timeline-rail');
    const timelineItem = document.getElementById(`timeline-${slug}`);

    if (!timelineRail || !timelineItem) {
      return 0;
    }

    const timelineRailRect = timelineRail.getBoundingClientRect();
    const timelineItemRect = timelineItem.getBoundingClientRect();

    return Math.max(
      0,
      timelineRail.scrollTop +
        (timelineItemRect.top - timelineRailRect.top) -
        timelineRail.clientHeight / 2 +
        timelineItem.clientHeight / 2
    );
  };

  const saveHomeTimelineState = (nextState = {}) => {
    if (typeof window === 'undefined') {
      return;
    }

    const timelineRail = document.getElementById('timeline-rail');
    const scrollContainer = document.getElementById('page-scroll-container');
    const previousState = JSON.parse(
      sessionStorage.getItem(HOME_TIMELINE_STATE_KEY) || '{}'
    );

    sessionStorage.setItem(
      HOME_TIMELINE_STATE_KEY,
      JSON.stringify({
        ...previousState,
        activeSlug,
        contentScrollTop: scrollContainer?.scrollTop ?? 0,
        timelineScrollTop: timelineRail?.scrollTop ?? 0,
        ...nextState,
      })
    );
  };

  const scrollToPost = (slug, behavior = 'smooth') => {
    const scrollContainer = document.getElementById('page-scroll-container');
    const targetPost = document.getElementById(`post-${slug}`);

    if (!scrollContainer || !targetPost) {
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = targetPost.getBoundingClientRect();
    const topInset = 108;
    const bottomInset = 72;
    const isAboveViewport = targetRect.top < containerRect.top + topInset;
    const isBelowViewport =
      targetRect.bottom > containerRect.bottom - bottomInset;

    if (!isAboveViewport && !isBelowViewport) {
      saveHomeTimelineState({ activeSlug: slug });
      return;
    }

    let nextScrollTop = scrollContainer.scrollTop;

    if (isAboveViewport) {
      nextScrollTop += targetRect.top - containerRect.top - topInset;
    } else if (isBelowViewport) {
      nextScrollTop +=
        targetRect.bottom - containerRect.bottom + bottomInset;
    }

    scrollContainer.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior,
    });

    saveHomeTimelineState({ activeSlug: slug });
  };

  useEffect(() => {
    const scrollContainer = document.getElementById('page-scroll-container');
    if (!scrollContainer) {
      return undefined;
    }

    const preventDirectScroll = (event) => {
      if (!isTimelineRailVisible()) {
        return;
      }

      if (event.target.closest('#timeline-rail')) {
        return;
      }

      event.preventDefault();
    };
    scrollContainer.addEventListener('wheel', preventDirectScroll, {
      passive: false,
    });
    scrollContainer.addEventListener('touchmove', preventDirectScroll, {
      passive: false,
    });

    return () => {
      scrollContainer.removeEventListener('wheel', preventDirectScroll);
      scrollContainer.removeEventListener('touchmove', preventDirectScroll);
    };
  }, [posts]);

  useEffect(() => {
    const restoreHomeTimelineState = () => {
      const shouldRestore =
        sessionStorage.getItem(HOME_TIMELINE_RETURN_KEY) === '1';
      const returnSlug = sessionStorage.getItem(HOME_TIMELINE_RETURN_SLUG_KEY);
      const rawState = sessionStorage.getItem(HOME_TIMELINE_STATE_KEY);
      const timelineRail = document.getElementById('timeline-rail');
      const scrollContainer = document.getElementById('page-scroll-container');
      const postElements = posts
        .map((post) => document.getElementById(`post-${post.slug}`))
        .filter(Boolean);

      if (!timelineRail || !scrollContainer || postElements.length === 0) {
        return;
      }

      if (!shouldRestore || !rawState) {
        const currentScrollTop = scrollContainer.scrollTop;
        const focusLine = currentScrollTop + 180;
        let nextActivePost = postElements[0];

        for (const postElement of postElements) {
          if (postElement.offsetTop <= focusLine) {
            nextActivePost = postElement;
            continue;
          }

          break;
        }

        const nextSlug = nextActivePost.id.replace('post-', '');
        isTimelineStateReadyRef.current = true;
        setActiveSlug((currentSlug) =>
          currentSlug === nextSlug ? currentSlug : nextSlug
        );
        return;
      }

      try {
        const {
          activeSlug: savedSlug,
          timelineScrollTop = 0,
          contentScrollTop = 0,
        } = JSON.parse(rawState);

        isRestoringTimelineRef.current = true;
        isTimelineStateReadyRef.current = true;
        sessionStorage.removeItem(HOME_TIMELINE_RETURN_KEY);
        sessionStorage.removeItem(HOME_TIMELINE_RETURN_SLUG_KEY);

        const targetSlug = returnSlug || savedSlug;

        if (targetSlug) {
          setActiveSlug(targetSlug);
        }

        scrollContainer.scrollTo({
          top: contentScrollTop,
          behavior: 'auto',
        });

        timelineRail.scrollTo({
          top: timelineScrollTop,
          behavior: 'auto',
        });

        setIsTimelineScrolled(timelineScrollTop > 48);
        window.dispatchEvent(
          new CustomEvent('header-compact-state', {
            detail: { isScrolled: timelineScrollTop > 48 },
          })
        );
      } catch {
        isRestoringTimelineRef.current = false;
        isTimelineStateReadyRef.current = true;
        sessionStorage.removeItem(HOME_TIMELINE_RETURN_KEY);
        sessionStorage.removeItem(HOME_TIMELINE_RETURN_SLUG_KEY);
      }
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        restoreHomeTimelineState();
      });
    });
  }, []);

  useEffect(() => {
    if (!activeSlug || !isTimelineStateReadyRef.current) {
      return;
    }

    saveHomeTimelineState({ activeSlug });

    const activeTimelineItem = document.getElementById(`timeline-${activeSlug}`);
    const timelineRail = document.getElementById('timeline-rail');

    if (!activeTimelineItem || !timelineRail) {
      return;
    }

    if (isRestoringTimelineRef.current) {
      isRestoringTimelineRef.current = false;
      return;
    }

    const timelineRailRect = timelineRail.getBoundingClientRect();
    const activeItemRect = activeTimelineItem.getBoundingClientRect();
    const nextScrollTop =
      timelineRail.scrollTop +
      (activeItemRect.top - timelineRailRect.top) -
      timelineRail.clientHeight / 2 +
      activeTimelineItem.clientHeight / 2;

    timelineRail.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: 'smooth',
    });
  }, [activeSlug]);

  useEffect(() => {
    const timelineRail = document.getElementById('timeline-rail');

    if (!timelineRail) {
      return undefined;
    }

    const handleTimelineScroll = () => {
      const nextScrolledState = timelineRail.scrollTop > 48;
      setIsTimelineScrolled(nextScrolledState);

      if (isTimelineStateReadyRef.current) {
        saveHomeTimelineState({ timelineScrollTop: timelineRail.scrollTop });
      }

      window.dispatchEvent(
        new CustomEvent('header-compact-state', {
          detail: { isScrolled: nextScrolledState },
        })
      );
    };

    timelineRail.addEventListener('scroll', handleTimelineScroll, {
      passive: true,
    });

    return () => {
      window.dispatchEvent(
        new CustomEvent('header-compact-state', {
          detail: { isScrolled: false },
        })
      );
      timelineRail.removeEventListener('scroll', handleTimelineScroll);
    };
  }, []);

  return (
    <Layout>
      <SEO title={globalData.name} description={globalData.blogDescription} />
      <Header name={globalData.name} />
      <main className="grid items-start gap-14 pt-6 lg:grid-cols-[minmax(240px,0.92fr)_minmax(0,1.5fr)] lg:gap-16 xl:grid-cols-[minmax(240px,0.92fr)_minmax(0,1.5fr)_minmax(270px,0.82fr)] xl:gap-20">
        <aside className="lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-white/30 px-7 py-8 shadow-[0_18px_70px_rgba(230,198,168,0.18)] backdrop-blur-[24px] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
            <div className="relative">
              <p className="text-[11px] font-semibold tracking-[0.4em] uppercase opacity-45">
                Notebook
              </p>
              <h1 className="mt-5 max-w-sm text-[2.85rem] leading-none md:text-[3.45rem] lg:text-[3.85rem]">
                {globalData.blogTitle}
              </h1>
              <p className="max-w-xs mt-6 text-base leading-8 opacity-68 md:text-lg">
                {globalData.blogDescription}
              </p>

              <div className="grid grid-cols-2 gap-6 pt-8 mt-10 border-t border-black/10 dark:border-white/10">
                <div>
                  <p className="text-[11px] tracking-[0.3em] uppercase opacity-45">
                    Articles
                  </p>
                  <p className="mt-2 text-3xl">{posts.length}</p>
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.3em] uppercase opacity-45">
                    Latest
                  </p>
                  <p className="mt-2 text-lg">
                    {formatDisplayDate(latestPost.data.date)}
                  </p>
                </div>
              </div>

              <div className="pt-8 mt-10 space-y-3 text-sm leading-7 border-t border-black/10 dark:border-white/10">
                <p className="opacity-52">
                  {formatDisplayDate(latestPost.data.date)} to{' '}
                  {formatDisplayDate(oldestPost.data.date)}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="w-full min-w-0 lg:px-2 xl:px-4">
          <ol>
            {posts.map((post, index) => {
              const { year } = getDateParts(post.data.date);
              const previousYear =
                index > 0 ? getDateParts(posts[index - 1].data.date).year : null;
              const showYearMarker = year !== previousYear;

              return (
                <Fragment key={post.slug}>
                  {showYearMarker && (
                    <li className="pt-8 first:pt-2">
                      <div className="flex items-center gap-4 pb-4 border-b border-black/10 dark:border-white/10">
                        <span className="text-[11px] font-semibold tracking-[0.38em] uppercase opacity-35">
                          Year
                        </span>
                        <h3 className="text-2xl md:text-3xl">{year}</h3>
                      </div>
                    </li>
                  )}

                  <li
                    id={`post-${post.slug}`}
                    className={`scroll-mt-28 rounded-[1.6rem] border-b transition-all duration-300 ${
                      activeSlug === post.slug
                        ? 'border-primary/30 bg-white/34 px-5 shadow-[0_16px_44px_rgba(233,197,166,0.2)] backdrop-blur-[18px] dark:border-primary/25 dark:bg-white/8 dark:shadow-[0_16px_40px_rgba(0,0,0,0.2)]'
                        : 'border-black/10 dark:border-white/10'
                    }`}
                  >
                    <Link
                      as={`/posts/${post.slug}`}
                      href={`/posts/${post.slug}`}
                      onClick={() => {
                        setActiveSlug(post.slug);
                        saveHomeTimelineState({
                          activeSlug: post.slug,
                          timelineScrollTop: getTimelineScrollTopForSlug(post.slug),
                        });
                      }}
                      className="group grid items-start gap-5 py-7 transition-colors md:grid-cols-[118px_minmax(0,1fr)_28px]"
                    >
                      <div
                        className={`pt-1 text-sm font-semibold tracking-[0.16em] uppercase transition-colors duration-300 ${
                          activeSlug === post.slug
                            ? 'text-primary opacity-95'
                            : 'opacity-48'
                        }`}
                      >
                        <p>{formatTimelineDate(post.data.date)}</p>
                        <p className="mt-1 text-[11px] tracking-[0.22em] opacity-65">
                          {getDateParts(post.data.date).time || '00:00'}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <h4
                          className={`text-[1.9rem] leading-tight transition-all duration-300 group-hover:translate-x-1 ${
                            activeSlug === post.slug ? 'text-primary' : ''
                          }`}
                        >
                          {post.data.title}
                        </h4>
                        {post.data.summary && (
                          <p
                            className={`max-w-2xl mt-3 text-base leading-7 break-words line-clamp-2 ${
                              activeSlug === post.slug ? 'opacity-80' : 'opacity-62'
                            }`}
                          >
                            {previewText(post.data.summary)}
                          </p>
                        )}
                        {post.data.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {post.data.tags.slice(0, 3).map((tag) => (
                              <span
                                key={`${post.slug}-${tag}`}
                                className={`px-3 py-1 text-[11px] tracking-[0.2em] uppercase rounded-full ${
                                  activeSlug === post.slug
                                    ? 'bg-primary/10 text-primary dark:bg-primary/15'
                                    : 'bg-black/5 dark:bg-white/10'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <ArrowIcon
                        className={`hidden mt-2 transition-all duration-300 group-hover:translate-x-1 md:block ${
                          activeSlug === post.slug ? 'text-primary' : ''
                        }`}
                      />
                    </Link>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </section>

        <aside className="hidden xl:sticky xl:top-24 xl:block xl:self-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-white/28 shadow-[0_18px_70px_rgba(232,198,166,0.2)] backdrop-blur-[26px] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[rgba(252,248,244,0.95)] via-[rgba(252,248,244,0.74)] to-transparent dark:from-[rgba(16,18,24,0.96)] dark:via-[rgba(16,18,24,0.72)] dark:to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-18 bg-gradient-to-t from-[rgba(252,248,244,0.95)] via-[rgba(252,248,244,0.74)] to-transparent dark:from-[rgba(16,18,24,0.96)] dark:via-[rgba(16,18,24,0.72)] dark:to-transparent" />
            <div className="pointer-events-none absolute inset-y-6 left-6 w-px bg-white/35 dark:bg-white/8" />
            <div className="timeline-bob pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/62 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] opacity-75 shadow-[0_10px_26px_rgba(236,210,182,0.28)] backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
              <span className="block h-4 w-px bg-black/20 dark:bg-white/24" />
              Scroll
            </div>
            <button
              type="button"
              aria-label="Scroll timeline to top"
              onClick={() => {
                const timelineRail = document.getElementById('timeline-rail');

                if (!timelineRail) {
                  return;
                }

                timelineRail.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/68 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] shadow-[0_10px_24px_rgba(235,209,180,0.24)] backdrop-blur-md transition-all duration-300 dark:border-white/10 dark:bg-black/28 dark:shadow-[0_12px_24px_rgba(0,0,0,0.2)] ${
                isTimelineScrolled
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-2 opacity-0'
              }`}
            >
              Top
              <span className="text-xs leading-none">↑</span>
            </button>
            <div
              id="timeline-rail"
              className="max-h-[calc(100vh-8rem)] space-y-8 overflow-y-auto overscroll-contain px-5 pr-4 pt-14 pb-12"
            >
            {yearGroups.map(([year, yearPosts]) => (
              <section key={year} className="relative pl-6">
                <div
                  className={`absolute left-[11px] top-3 bottom-2 w-px transition-colors duration-300 ${
                    activeYear === year
                      ? 'bg-primary/45 dark:bg-primary/55'
                      : 'bg-black/10 dark:bg-white/10'
                  }`}
                />
                <div className="relative">
                  <span
                    className={`absolute left-[-20px] top-[7px] h-2.5 w-2.5 rounded-full border transition-all duration-300 ${
                      activeYear === year
                        ? 'scale-125 border-primary/50 bg-primary/55'
                        : 'border-black/15 bg-[rgba(248,244,238,0.95)] dark:border-white/20 dark:bg-[#0f1318]'
                    }`}
                  />
                  <h3
                    className={`text-xs font-semibold tracking-[0.34em] uppercase transition-colors duration-300 ${
                      activeYear === year ? 'text-primary opacity-100' : 'opacity-55'
                    }`}
                  >
                    {year}
                  </h3>
                </div>

                <div className="mt-4 space-y-3">
                  {yearPosts.map((post, index) => (
                    <a
                      key={`timeline-${post.slug}`}
                      id={`timeline-${post.slug}`}
                      href={`#post-${post.slug}`}
                      style={{ marginLeft: `${(index % 3) * 8}px` }}
                      onClick={(event) => {
                        event.preventDefault();
                        setActiveSlug(post.slug);
                        scrollToPost(post.slug);
                      }}
                      className={`group relative block pl-10 pr-2 transition-all duration-300 ${
                        activeSlug === post.slug ? 'translate-x-1' : ''
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-[15px] h-px w-6 transition-colors duration-300 ${
                          activeSlug === post.slug
                            ? 'bg-primary/45 dark:bg-primary/55'
                            : 'bg-black/12 dark:bg-white/12'
                        }`}
                      />
                      <span
                        className={`absolute left-[22px] top-[11px] h-2 w-2 rounded-full border transition-all duration-300 group-hover:scale-125 ${
                          activeSlug === post.slug
                            ? 'scale-125 border-primary/45 bg-primary/60'
                            : 'border-black/12 bg-[rgba(248,244,238,0.92)] dark:border-white/20 dark:bg-[#10141a]'
                        }`}
                      />
                      <p
                        className={`text-[10px] font-semibold tracking-[0.28em] uppercase transition-colors duration-300 ${
                          activeSlug === post.slug
                            ? 'text-primary opacity-90'
                            : 'opacity-42'
                        }`}
                      >
                        {formatTimelineDate(post.data.date)}
                      </p>
                      <p
                        className={`mt-1 text-sm leading-6 transition-all duration-300 line-clamp-1 ${
                          activeSlug === post.slug
                            ? 'font-medium text-primary opacity-100'
                            : 'opacity-68 group-hover:opacity-100'
                        }`}
                      >
                        {post.data.title}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            ))}
            </div>
          </div>
        </aside>
      </main>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="fixed top-10 opacity-20 dark:opacity-40"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-10 dark:opacity-10"
      />
    </Layout>
  );
}

export function getStaticProps() {
  const posts = sortPostsByLatest(getPostSummaries());
  const globalData = getGlobalData();

  return { props: { posts, globalData } };
}
