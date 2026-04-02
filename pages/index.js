import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { getPostSummaries } from '../utils/mdx-utils';

import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout, { GradientBackground } from '../components/Layout';
import ArrowIcon from '../components/ArrowIcon';
import { getGlobalData } from '../utils/global-data';
import SEO from '../components/SEO';
import { formatDisplayDate, formatTimelineDate, getDateParts } from '../utils/date-utils';

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

  const syncHeaderCompactState = (nextState = {}) => {
    const timelineRail = document.getElementById('timeline-rail');
    const scrollContainer = document.getElementById('page-scroll-container');
    const contentScrollTop =
      nextState.contentScrollTop ?? scrollContainer?.scrollTop ?? 0;
    const timelineScrollTop =
      nextState.timelineScrollTop ?? timelineRail?.scrollTop ?? 0;

    window.dispatchEvent(
      new CustomEvent('header-compact-state', {
        detail: { isScrolled: contentScrollTop > 48 || timelineScrollTop > 48 },
      })
    );
  };

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
        syncHeaderCompactState({ contentScrollTop, timelineScrollTop });
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
    const scrollContainer = document.getElementById('page-scroll-container');

    if (!scrollContainer) {
      return undefined;
    }

    const handleContentScroll = () => {
      if (isTimelineStateReadyRef.current) {
        saveHomeTimelineState({ contentScrollTop: scrollContainer.scrollTop });
      }

      syncHeaderCompactState({ contentScrollTop: scrollContainer.scrollTop });
    };

    handleContentScroll();
    scrollContainer.addEventListener('scroll', handleContentScroll, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener('scroll', handleContentScroll);
    };
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
      const timelineScrollTop = timelineRail.scrollTop;
      const nextScrolledState = timelineScrollTop > 48;
      setIsTimelineScrolled(nextScrolledState);

      if (isTimelineStateReadyRef.current) {
        saveHomeTimelineState({ timelineScrollTop });
      }

      syncHeaderCompactState({ timelineScrollTop });
    };

    handleTimelineScroll();
    timelineRail.addEventListener('scroll', handleTimelineScroll, {
      passive: true,
    });

    return () => {
      timelineRail.removeEventListener('scroll', handleTimelineScroll);
    };
  }, []);

  return (
    <Layout>
      <SEO title={globalData.name} description={globalData.blogDescription} />
      <Header name={globalData.name} />
      <main className="grid items-start gap-10 pt-4 lg:grid-cols-[minmax(280px,0.94fr)_minmax(0,1.5fr)] lg:gap-12 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.38fr)_minmax(360px,0.98fr)] xl:gap-12">
        <aside className="lg:sticky lg:top-20">
          <div className="glass-panel rounded-[2rem] px-7 py-8">
            <div className="relative">
              <p className="section-kicker">Personal archive</p>
              <h1 className="mt-5 max-w-sm text-[3rem] leading-[0.92] md:text-[3.7rem] lg:text-[4.1rem]">
                {globalData.blogTitle}
              </h1>
              <p className="mt-6 max-w-sm text-base leading-8 opacity-70 md:text-lg">
                {globalData.blogDescription}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="tech-pill">
                  <span className="pulse-glow h-2 w-2 rounded-full bg-[linear-gradient(135deg,var(--theme-gradient-1),var(--theme-gradient-3))]" />
                  Quiet signal
                </span>
                <Link href="/tags" className="tech-pill">
                  Explore tags
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <div className="stat-tile">
                  <p className="text-[11px] tracking-[0.3em] uppercase opacity-45">
                    Articles
                  </p>
                  <p className="mt-3 text-3xl">{posts.length}</p>
                </div>
                <div className="stat-tile">
                  <p className="text-[11px] tracking-[0.3em] uppercase opacity-45">
                    Latest
                  </p>
                  <p className="mt-3 text-lg">
                    {formatDisplayDate(latestPost.data.date)}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[1.4rem] border border-black/10 bg-white/[0.38] px-4 py-4 text-sm leading-7 opacity-72 dark:border-white/10 dark:bg-white/[0.03]">
                <p>
                  {formatDisplayDate(latestPost.data.date)} to{' '}
                  {formatDisplayDate(oldestPost.data.date)}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="w-full min-w-0 lg:px-2 xl:px-4">
          <ol className="space-y-4">
            {posts.map((post, index) => {
              const { year } = getDateParts(post.data.date);
              const previousYear =
                index > 0 ? getDateParts(posts[index - 1].data.date).year : null;
              const showYearMarker = year !== previousYear;

              return (
                <Fragment key={post.slug}>
                  {showYearMarker && (
                    <li className="pt-8 first:pt-0">
                      <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/10">
                        <span className="section-kicker">Year</span>
                        <h3 className="text-2xl md:text-3xl">{year}</h3>
                      </div>
                    </li>
                  )}

                  <li
                    id={`post-${post.slug}`}
                    style={{ animationDelay: `${Math.min(index * 45, 420)}ms` }}
                    className={`story-card animate-fade-up scroll-mt-28 rounded-[1.85rem] border transition-all duration-300 ${
                      activeSlug === post.slug
                        ? 'border-primary/[0.26] bg-white/70 px-5 shadow-[0_30px_70px_-38px_rgba(77,141,255,0.34)] backdrop-blur-[20px] dark:border-primary/20 dark:bg-[rgba(10,18,30,0.74)] dark:shadow-[0_30px_70px_-34px_rgba(2,6,23,0.72)]'
                        : 'border-black/10 bg-white/[0.28] px-5 backdrop-blur-[18px] hover:border-primary/[0.18] hover:bg-white/[0.44] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]'
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
                      className="group grid items-start gap-5 py-7 transition-colors md:grid-cols-[128px_minmax(0,1fr)_28px]"
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
                          className={`text-[1.85rem] leading-tight transition-all duration-300 group-hover:translate-x-1 md:text-[2rem] ${
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
                                className={`rounded-full px-3 py-1 text-[11px] tracking-[0.2em] uppercase ${
                                  activeSlug === post.slug
                                    ? 'border border-primary/15 bg-primary/10 text-primary dark:bg-primary/15'
                                    : 'border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10'
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

        <aside className="hidden xl:sticky xl:top-20 xl:block xl:self-start">
          <div className="glass-panel rounded-[2rem]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[rgba(248,251,255,0.94)] via-[rgba(248,251,255,0.76)] to-transparent dark:from-[rgba(8,14,24,0.96)] dark:via-[rgba(8,14,24,0.72)] dark:to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[4.5rem] bg-gradient-to-t from-[rgba(248,251,255,0.94)] via-[rgba(248,251,255,0.76)] to-transparent dark:from-[rgba(8,14,24,0.96)] dark:via-[rgba(8,14,24,0.72)] dark:to-transparent" />
            <div className="pointer-events-none absolute inset-y-6 left-1/2 z-[1] w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(77,141,255,0.32),rgba(77,141,255,0.12),rgba(77,141,255,0.04))]" />
            <div className="timeline-bob pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/[0.72] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] opacity-78 shadow-[0_14px_28px_rgba(77,141,255,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
              <span className="block h-4 w-px bg-black/20 dark:bg-white/24" />
              Scroll
            </div>
            <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-white/50 bg-white/[0.66] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] opacity-78 shadow-[0_10px_24px_rgba(77,141,255,0.1)] backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:shadow-[0_12px_24px_rgba(0,0,0,0.16)]">
              Archive map
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
              className={`absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/[0.72] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] shadow-[0_10px_24px_rgba(77,141,255,0.14)] backdrop-blur-md transition-all duration-300 dark:border-white/10 dark:bg-black/28 dark:shadow-[0_12px_24px_rgba(0,0,0,0.2)] ${
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
              className="max-h-[calc(100vh-8rem)] space-y-10 overflow-y-auto overscroll-contain px-4 pt-16 pb-12"
            >
            {yearGroups.map(([year, yearPosts]) => (
              <section key={year} className="relative">
                <div className="relative mx-auto flex w-fit items-center justify-center px-4">
                  <span
                    className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ${
                      activeYear === year
                        ? 'scale-110 border-primary/45 bg-primary/55 shadow-[0_0_0_6px_rgba(77,141,255,0.14)]'
                        : 'border-black/12 bg-[rgba(248,251,255,0.96)] dark:border-white/16 dark:bg-[#0f1318]'
                    }`}
                  />
                  <h3
                    className={`relative rounded-full border px-4 py-1 text-[10px] font-semibold tracking-[0.36em] uppercase transition-all duration-300 ${
                      activeYear === year
                        ? 'border-primary/28 bg-primary/10 text-primary shadow-[0_10px_24px_rgba(77,141,255,0.12)]'
                        : 'border-black/10 bg-white/50 opacity-72 dark:border-white/10 dark:bg-white/8'
                    }`}
                  >
                    {year}
                  </h3>
                </div>

                <div className="mt-5 space-y-4">
                  {yearPosts.map((post, index) => {
                    const isLeftBranch = index % 2 === 0;
                    const timeLabel = getDateParts(post.data.date).time || '00:00';

                    return (
                      <a
                        key={`timeline-${post.slug}`}
                        id={`timeline-${post.slug}`}
                        href={`#post-${post.slug}`}
                        aria-current={activeSlug === post.slug ? 'true' : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          setActiveSlug(post.slug);
                          scrollToPost(post.slug);
                        }}
                        className={`group relative block min-h-[84px] transition-all duration-300 ${
                          activeSlug === post.slug ? 'z-10' : 'z-[1]'
                        }`}
                      >
                        <span
                          className={`absolute left-1/2 top-[42px] h-px w-8 -translate-y-1/2 transition-colors duration-300 ${
                            isLeftBranch ? '-translate-x-full' : ''
                          } ${
                            activeSlug === post.slug
                              ? 'bg-primary/50 dark:bg-primary/58'
                              : 'bg-black/10 dark:bg-white/12'
                          }`}
                        />
                        <span
                          className={`absolute left-1/2 top-[42px] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 group-hover:scale-110 ${
                            activeSlug === post.slug
                              ? 'border-primary/45 bg-primary/60 shadow-[0_0_0_5px_rgba(77,141,255,0.12)]'
                              : 'border-black/12 bg-[rgba(248,251,255,0.96)] dark:border-white/20 dark:bg-[#10141a]'
                          }`}
                        />
                        <div
                          className={`w-[calc(50%-1.3rem)] ${
                            isLeftBranch
                              ? 'pr-6 text-right'
                              : 'ml-auto pl-6 text-left'
                          }`}
                        >
                          <div
                            className={`rounded-[1.2rem] border px-4 py-3 transition-all duration-300 ${
                              activeSlug === post.slug
                                ? 'border-primary/28 bg-white/[0.78] shadow-[0_18px_32px_rgba(77,141,255,0.14)] dark:border-primary/24 dark:bg-white/12'
                                : 'border-white/45 bg-white/[0.46] hover:bg-white/[0.64] dark:border-white/8 dark:bg-white/6 dark:hover:bg-white/10'
                            }`}
                          >
                            <p
                              className={`text-[10px] font-semibold tracking-[0.28em] uppercase transition-colors duration-300 ${
                                activeSlug === post.slug
                                  ? 'text-primary opacity-92'
                                  : 'opacity-46'
                              }`}
                            >
                              {formatTimelineDate(post.data.date)}
                              <span className="mx-1.5 opacity-28">/</span>
                              {timeLabel}
                            </p>
                            <p
                              className={`mt-2 text-[13px] leading-5 transition-all duration-300 line-clamp-2 ${
                                activeSlug === post.slug
                                  ? 'font-medium text-primary opacity-100'
                                  : 'opacity-74 group-hover:opacity-100'
                              }`}
                            >
                              {post.data.title}
                            </p>
                          </div>
                        </div>
                      </a>
                    );
                  })}
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
        className="fixed top-4 opacity-[0.26] dark:opacity-[0.44]"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-[0.16] dark:opacity-[0.14]"
      />
    </Layout>
  );
}

export function getStaticProps() {
  const posts = sortPostsByLatest(getPostSummaries());
  const globalData = getGlobalData();

  return { props: { posts, globalData } };
}
