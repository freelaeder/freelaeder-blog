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
      <main className="grid items-start gap-7 pt-3 sm:gap-8 sm:pt-4 lg:grid-cols-[minmax(240px,0.92fr)_minmax(0,1.42fr)] lg:gap-10 xl:grid-cols-[minmax(250px,0.82fr)_minmax(0,1.3fr)_minmax(360px,0.98fr)] xl:gap-10 2xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.28fr)_minmax(380px,1fr)] 2xl:gap-12">
        <aside className="lg:sticky lg:top-20">
          <div className="glass-panel rounded-[1.75rem] px-5 py-6 sm:px-7 sm:py-8 md:rounded-[2rem]">
            <div className="relative">
              <p className="section-kicker">Personal archive</p>
              <h1 className="mt-4 max-w-sm text-[2.35rem] leading-[0.98] sm:mt-5 sm:text-[3rem] md:text-[3.4rem] lg:text-[3.8rem]">
                {globalData.blogTitle}
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-7 opacity-72 sm:text-base sm:leading-8 md:text-lg">
                {globalData.blogDescription}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-2.5 sm:mt-8 sm:gap-3">
                <span className="tech-pill">
                  <span className="pulse-glow h-2 w-2 rounded-full bg-[linear-gradient(135deg,var(--theme-gradient-1),var(--theme-gradient-3))]" />
                  Quiet signal
                </span>
                <Link href="/tags" className="tech-pill">
                  Explore tags
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4">
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

              <div className="mt-6 rounded-[1.2rem] border border-black/8 bg-white/[0.4] px-4 py-3.5 text-sm leading-7 opacity-72 dark:border-white/10 dark:bg-white/[0.03] sm:mt-8 sm:rounded-[1.35rem] sm:py-4">
                <p>
                  {formatDisplayDate(latestPost.data.date)} to{' '}
                  {formatDisplayDate(oldestPost.data.date)}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="w-full min-w-0 lg:px-2 xl:px-4">
          <ol className="space-y-3 sm:space-y-4">
            {posts.map((post, index) => {
              const { year } = getDateParts(post.data.date);
              const previousYear =
                index > 0 ? getDateParts(posts[index - 1].data.date).year : null;
              const showYearMarker = year !== previousYear;

              return (
                <Fragment key={post.slug}>
                  {showYearMarker && (
                    <li className="pt-6 first:pt-0 sm:pt-8">
                      <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-3.5 dark:border-white/10 sm:pb-4">
                        <span className="section-kicker">Year</span>
                        <h3 className="text-[1.7rem] sm:text-2xl md:text-3xl">{year}</h3>
                      </div>
                    </li>
                  )}

                  <li
                    id={`post-${post.slug}`}
                    style={{ animationDelay: `${Math.min(index * 45, 420)}ms` }}
                    className={`story-card animate-fade-up scroll-mt-28 rounded-[1.85rem] border transition-all duration-300 ${
                      activeSlug === post.slug
                        ? 'border-primary/20 bg-white/[0.82] px-4 shadow-[0_24px_52px_-34px_rgba(29,27,24,0.16)] backdrop-blur-[18px] dark:border-primary/18 dark:bg-[rgba(17,19,23,0.84)] dark:shadow-[0_24px_52px_-34px_rgba(0,0,0,0.48)] sm:px-5'
                        : 'border-black/8 bg-white/[0.56] px-4 backdrop-blur-[16px] hover:border-primary/14 hover:bg-white/[0.76] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] sm:px-5'
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
                      className="group grid items-start gap-4 py-5 transition-colors sm:gap-5 sm:py-6 md:grid-cols-[118px_minmax(0,1fr)_28px] md:py-7"
                    >
                      <div
                        className={`flex items-start justify-between gap-3 pt-0.5 text-sm font-semibold tracking-[0.14em] uppercase transition-colors duration-300 md:block md:pt-1 ${
                          activeSlug === post.slug
                            ? 'text-primary opacity-95'
                            : 'opacity-48'
                        }`}
                      >
                        <p>{formatTimelineDate(post.data.date)}</p>
                        <p className="text-[11px] tracking-[0.2em] opacity-65 md:mt-1">
                          {getDateParts(post.data.date).time || '00:00'}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <h4
                          className={`text-[1.35rem] leading-tight transition-all duration-300 group-hover:translate-x-1 sm:text-[1.55rem] md:text-[1.9rem] ${
                            activeSlug === post.slug ? 'text-primary' : ''
                          }`}
                        >
                          {post.data.title}
                        </h4>
                        {post.data.summary && (
                          <p
                            className={`mt-2.5 max-w-2xl text-[15px] leading-6 break-words line-clamp-2 sm:mt-3 sm:text-base sm:leading-7 ${
                              activeSlug === post.slug ? 'opacity-80' : 'opacity-62'
                            }`}
                          >
                            {previewText(post.data.summary)}
                          </p>
                        )}
                        {post.data.tags?.length > 0 && (
                          <div className="mt-3.5 flex flex-wrap gap-2 sm:mt-4">
                            {post.data.tags.slice(0, 3).map((tag) => (
                              <span
                                key={`${post.slug}-${tag}`}
                                className={`rounded-full px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase sm:px-3 sm:text-[11px] ${
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
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[rgba(250,247,243,0.96)] via-[rgba(250,247,243,0.76)] to-transparent dark:from-[rgba(17,19,23,0.98)] dark:via-[rgba(17,19,23,0.76)] dark:to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[4.5rem] bg-gradient-to-t from-[rgba(250,247,243,0.96)] via-[rgba(250,247,243,0.76)] to-transparent dark:from-[rgba(17,19,23,0.98)] dark:via-[rgba(17,19,23,0.76)] dark:to-transparent" />
            <div className="pointer-events-none absolute inset-y-6 left-1/2 z-[1] w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(157,100,72,0.18),rgba(157,100,72,0.08),rgba(157,100,72,0.02))]" />
            <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-white/50 bg-white/[0.66] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-78 shadow-[0_10px_24px_rgba(29,27,24,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:shadow-[0_12px_24px_rgba(0,0,0,0.16)]">
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
              className={`absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/[0.72] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-[0_10px_24px_rgba(29,27,24,0.1)] backdrop-blur-md transition-all duration-300 dark:border-white/10 dark:bg-black/28 dark:shadow-[0_12px_24px_rgba(0,0,0,0.2)] ${
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
              className="max-h-[calc(100vh-8rem)] space-y-10 overflow-y-auto overscroll-contain px-5 pt-16 pb-12"
            >
            {yearGroups.map(([year, yearPosts]) => (
              <section key={year} className="relative">
                <div className="relative mx-auto flex w-fit items-center justify-center px-4">
                  <span
                    className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ${
                      activeYear === year
                        ? 'scale-110 border-primary/45 bg-primary/55 shadow-[0_0_0_6px_rgba(157,100,72,0.12)]'
                        : 'border-black/12 bg-[rgba(248,251,255,0.96)] dark:border-white/16 dark:bg-[#0f1318]'
                    }`}
                  />
                  <h3
                    className={`relative rounded-full border px-4 py-1 text-[10px] font-semibold tracking-[0.24em] uppercase transition-all duration-300 ${
                      activeYear === year
                        ? 'border-primary/28 bg-primary/10 text-primary shadow-[0_10px_24px_rgba(157,100,72,0.1)]'
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
                        className={`group relative block min-h-[96px] transition-all duration-300 ${
                          activeSlug === post.slug ? 'z-10' : 'z-[1]'
                        }`}
                      >
                        <span
                          className={`absolute left-1/2 top-[48px] h-px w-6 -translate-y-1/2 transition-colors duration-300 ${
                            isLeftBranch ? '-translate-x-full' : ''
                          } ${
                            activeSlug === post.slug
                              ? 'bg-primary/42 dark:bg-primary/52'
                              : 'bg-black/10 dark:bg-white/12'
                          }`}
                        />
                        <span
                          className={`absolute left-1/2 top-[48px] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 group-hover:scale-110 ${
                            activeSlug === post.slug
                              ? 'border-primary/45 bg-primary/60 shadow-[0_0_0_5px_rgba(157,100,72,0.1)]'
                              : 'border-black/12 bg-[rgba(248,251,255,0.96)] dark:border-white/20 dark:bg-[#10141a]'
                          }`}
                        />
                        <div
                          className={`w-[calc(50%-0.85rem)] ${
                            isLeftBranch
                              ? 'pr-4 text-right'
                              : 'ml-auto pl-4 text-left'
                          }`}
                        >
                          <div
                            className={`overflow-hidden rounded-[1.2rem] border px-3.5 py-3 transition-all duration-300 ${
                              activeSlug === post.slug
                                ? 'border-primary/24 bg-white/[0.78] shadow-[0_16px_30px_rgba(29,27,24,0.1)] dark:border-primary/22 dark:bg-white/12'
                                : 'border-white/45 bg-white/[0.46] hover:bg-white/[0.64] dark:border-white/8 dark:bg-white/6 dark:hover:bg-white/10'
                            }`}
                          >
                            <p
                              className={`overflow-hidden text-[9px] font-semibold tracking-[0.12em] uppercase whitespace-nowrap transition-colors duration-300 ${
                                activeSlug === post.slug
                                  ? 'text-primary opacity-92'
                                  : 'opacity-46'
                              }`}
                            >
                              {formatTimelineDate(post.data.date)}
                              <span className="mx-1 opacity-28">/</span>
                              {timeLabel}
                            </p>
                            <p
                              className={`mt-2 break-words text-[12px] leading-[1.45] transition-all duration-300 line-clamp-3 ${
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
