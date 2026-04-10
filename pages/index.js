import Link from 'next/link';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_POSTS_PAGE_SIZE,
  getPostSummaries,
} from '../utils/mdx-utils';

import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout, { GradientBackground } from '../components/Layout';
import ArrowIcon from '../components/ArrowIcon';
import { getGlobalData } from '../utils/global-data';
import SEO from '../components/SEO';
import {
  formatDisplayDate,
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

const mergeUniquePosts = (currentPosts, nextPosts) => {
  const seenSlugs = new Set(currentPosts.map((post) => post.slug));
  const mergedPosts = [...currentPosts];

  nextPosts.forEach((post) => {
    if (!seenSlugs.has(post.slug)) {
      seenSlugs.add(post.slug);
      mergedPosts.push(post);
    }
  });

  return mergedPosts;
};

const waitForNextPaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

const HOME_TIMELINE_STATE_KEY = 'home-timeline-state';
const HOME_TIMELINE_RETURN_KEY = 'home-timeline-return';
const HOME_TIMELINE_RETURN_SLUG_KEY = 'home-timeline-return-slug';

export default function Index({
  initialPosts,
  globalData,
  totalPosts,
  latestPostDate,
  oldestPostDate,
  pageSize,
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [activeSlug, setActiveSlug] = useState(initialPosts[0]?.slug || '');
  const [isTimelineScrolled, setIsTimelineScrolled] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(initialPosts.length < totalPosts);
  const [loadMoreError, setLoadMoreError] = useState('');
  const isRestoringTimelineRef = useRef(false);
  const isTimelineStateReadyRef = useRef(false);
  const isLoadingMorePostsRef = useRef(false);
  const hasMorePostsRef = useRef(initialPosts.length < totalPosts);
  const postsRef = useRef(initialPosts);
  const activeSlugRef = useRef(initialPosts[0]?.slug || '');
  const loadMoreTriggerRef = useRef(null);

  const previewText = (summary = '') =>
    summary.length > 126 ? `${summary.slice(0, 126).trim()}...` : summary;

  const yearGroups = useMemo(() => getYearGroupsByLatest(posts), [posts]);
  const postMap = useMemo(
    () => new Map(posts.map((post) => [post.slug, post])),
    [posts]
  );
  const activePost = postMap.get(activeSlug) || posts[0];
  const activeYear = activePost ? getDateParts(activePost.data.date).year : '';

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    activeSlugRef.current = activeSlug;
  }, [activeSlug]);

  useEffect(() => {
    hasMorePostsRef.current = hasMorePosts;
  }, [hasMorePosts]);

  useEffect(() => {
    if (!activeSlug && posts[0]?.slug) {
      setActiveSlug(posts[0].slug);
      return;
    }

    if (activeSlug && !postMap.has(activeSlug) && posts[0]?.slug) {
      setActiveSlug(posts[0].slug);
    }
  }, [activeSlug, postMap, posts]);

  const getSavedTimelineState = () => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      return JSON.parse(sessionStorage.getItem(HOME_TIMELINE_STATE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const loadMorePosts = useCallback(
    async ({ minimumCount = 0, targetSlug = '' } = {}) => {
      let shouldLoadNextPage = minimumCount <= 0 && !targetSlug;

      const needsMorePosts = () => {
        const needsCount = minimumCount > 0 && postsRef.current.length < minimumCount;
        const needsTargetSlug =
          Boolean(targetSlug) &&
          !postsRef.current.some((post) => post.slug === targetSlug);

        return needsCount || needsTargetSlug;
      };

      while ((shouldLoadNextPage || needsMorePosts()) && hasMorePostsRef.current) {
        if (isLoadingMorePostsRef.current) {
          await new Promise((resolve) => window.setTimeout(resolve, 80));
          continue;
        }

        const nextPage = Math.floor(postsRef.current.length / pageSize) + 1;
        isLoadingMorePostsRef.current = true;
        setIsLoadingMorePosts(true);
        setLoadMoreError('');

        try {
          const response = await fetch(`/generated/post-pages/${nextPage}.json`);

          if (!response.ok) {
            throw new Error(`Failed to load posts: ${response.status}`);
          }

          const payload = await response.json();
          const nextPosts = Array.isArray(payload.posts) ? payload.posts : [];
          const nextHasMore =
            typeof payload.hasMore === 'boolean'
              ? payload.hasMore
              : postsRef.current.length + nextPosts.length < (payload.total || totalPosts);

          setPosts((currentPosts) => {
            const mergedPosts = mergeUniquePosts(currentPosts, nextPosts);
            postsRef.current = mergedPosts;
            return mergedPosts;
          });
          hasMorePostsRef.current = nextHasMore;
          setHasMorePosts(nextHasMore);

          if (nextPosts.length === 0) {
            break;
          }

          shouldLoadNextPage = false;
        } catch {
          setLoadMoreError('加载更多文章失败了，可以点一下重试。');
          break;
        } finally {
          isLoadingMorePostsRef.current = false;
          setIsLoadingMorePosts(false);
        }
      }

      return postsRef.current;
    },
    [pageSize, totalPosts]
  );

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
    const previousState = getSavedTimelineState();

    sessionStorage.setItem(
      HOME_TIMELINE_STATE_KEY,
      JSON.stringify({
        ...previousState,
        activeSlug: activeSlugRef.current,
        contentScrollTop: scrollContainer?.scrollTop ?? 0,
        timelineScrollTop: timelineRail?.scrollTop ?? 0,
        loadedCount: postsRef.current.length,
        ...nextState,
      })
    );
  };

  const scrollToPost = async (slug, behavior = 'smooth') => {
    let scrollContainer = document.getElementById('page-scroll-container');
    let targetPost = document.getElementById(`post-${slug}`);

    if (!targetPost && hasMorePostsRef.current) {
      await loadMorePosts({ targetSlug: slug });
      await waitForNextPaint();
      scrollContainer = document.getElementById('page-scroll-container');
      targetPost = document.getElementById(`post-${slug}`);
    }

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

  const maybeLoadMoreOnScroll = useCallback((scrollContainer) => {
    if (
      !scrollContainer ||
      !hasMorePostsRef.current ||
      isLoadingMorePostsRef.current
    ) {
      return;
    }

    const distanceToBottom =
      scrollContainer.scrollHeight -
      (scrollContainer.scrollTop + scrollContainer.clientHeight);

    if (distanceToBottom <= 320) {
      loadMorePosts();
    }
  }, [loadMorePosts]);

  useEffect(() => {
    let isCancelled = false;

    const restoreHomeTimelineState = async () => {
      const shouldRestore =
        sessionStorage.getItem(HOME_TIMELINE_RETURN_KEY) === '1';
      const returnSlug = sessionStorage.getItem(HOME_TIMELINE_RETURN_SLUG_KEY);
      const rawState = sessionStorage.getItem(HOME_TIMELINE_STATE_KEY);
      const savedState = getSavedTimelineState();

      if (shouldRestore && rawState) {
        const targetSlug = returnSlug || savedState.activeSlug || '';
        const requestedLoadedCount = Math.max(
          Number(savedState.loadedCount) || 0,
          targetSlug ? pageSize : 0
        );

        if (
          requestedLoadedCount > postsRef.current.length ||
          (targetSlug &&
            !postsRef.current.some((post) => post.slug === targetSlug))
        ) {
          await loadMorePosts({
            minimumCount: requestedLoadedCount,
            targetSlug,
          });
        }
      }

      if (isCancelled) {
        return;
      }

      await waitForNextPaint();

      if (isCancelled) {
        return;
      }

      const timelineRail = document.getElementById('timeline-rail');
      const scrollContainer = document.getElementById('page-scroll-container');
      const postElements = postsRef.current
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
        } = savedState;
        const targetSlug = returnSlug || savedSlug;

        isRestoringTimelineRef.current = true;
        isTimelineStateReadyRef.current = true;
        sessionStorage.removeItem(HOME_TIMELINE_RETURN_KEY);
        sessionStorage.removeItem(HOME_TIMELINE_RETURN_SLUG_KEY);

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

    restoreHomeTimelineState();

    return () => {
      isCancelled = true;
    };
  }, [loadMorePosts, pageSize]);

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
      maybeLoadMoreOnScroll(scrollContainer);
    };

    handleContentScroll();
    scrollContainer.addEventListener('scroll', handleContentScroll, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener('scroll', handleContentScroll);
    };
  }, [maybeLoadMoreOnScroll]);

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
      maybeLoadMoreOnScroll(timelineRail);
    };

    handleTimelineScroll();
    timelineRail.addEventListener('scroll', handleTimelineScroll, {
      passive: true,
    });

    return () => {
      timelineRail.removeEventListener('scroll', handleTimelineScroll);
    };
  }, [maybeLoadMoreOnScroll]);

  useEffect(() => {
    const scrollContainer = document.getElementById('page-scroll-container');
    const loadMoreTrigger = loadMoreTriggerRef.current;

    if (!scrollContainer || !loadMoreTrigger || !hasMorePosts) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        loadMorePosts();
      },
      {
        root: scrollContainer,
        rootMargin: '0px 0px 420px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(loadMoreTrigger);

    return () => {
      observer.disconnect();
    };
  }, [hasMorePosts, loadMorePosts, posts.length]);

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
                  <p className="mt-3 text-3xl">{totalPosts}</p>
                </div>
                <div className="stat-tile">
                  <p className="text-[11px] tracking-[0.3em] uppercase opacity-45">
                    Latest
                  </p>
                  <p className="mt-3 text-lg">
                    {formatDisplayDate(latestPostDate)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.2rem] border border-black/8 bg-white/[0.4] px-4 py-3.5 text-sm leading-7 opacity-72 dark:border-white/10 dark:bg-white/[0.03] sm:mt-8 sm:rounded-[1.35rem] sm:py-4">
                <p>
                  {formatDisplayDate(latestPostDate)} to{' '}
                  {formatDisplayDate(oldestPostDate)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] opacity-55">
                  Loaded {posts.length} / {totalPosts}
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
                      className="group grid items-start gap-3 py-4 transition-colors sm:gap-4 sm:py-[1.125rem] md:grid-cols-[98px_minmax(0,1fr)_28px] md:gap-3.5 md:py-[1.375rem]"
                    >
                      <div
                        className={`flex flex-col gap-2 pt-0.5 text-sm font-semibold tracking-[0.14em] uppercase transition-colors duration-300 md:pt-1 ${
                          activeSlug === post.slug
                            ? 'text-primary opacity-95'
                            : 'opacity-48'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 md:block">
                          <p>{formatTimelineDate(post.data.date)}</p>
                          <p className="text-[11px] tracking-[0.2em] opacity-65 md:mt-1">
                            {getDateParts(post.data.date).time || '00:00'}
                          </p>
                        </div>
                        {post.data.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 md:pt-0.5">
                            {post.data.tags.slice(0, 3).map((tag) => (
                              <span
                                key={`${post.slug}-${tag}`}
                                className={`rounded-full px-2 py-0.5 text-[9px] tracking-[0.16em] uppercase sm:px-2.5 sm:text-[10px] ${
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

                      <div className="min-w-0">
                        <h4
                          className={`text-[1.35rem] leading-tight transition-all duration-300 group-hover:translate-x-1 sm:text-[1.55rem] md:text-[1.85rem] ${
                            activeSlug === post.slug ? 'text-primary' : ''
                          }`}
                        >
                          {post.data.title}
                        </h4>
                        {post.data.summary && (
                          <p
                            className={`mt-2 max-w-2xl text-[15px] leading-6 break-words line-clamp-2 sm:mt-2.5 sm:text-base sm:leading-7 ${
                              activeSlug === post.slug ? 'opacity-80' : 'opacity-62'
                            }`}
                          >
                            {previewText(post.data.summary)}
                          </p>
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

          <div className="pt-4 sm:pt-6">
            <div ref={loadMoreTriggerRef} className="h-px w-full" />
            {(hasMorePosts || isLoadingMorePosts || loadMoreError) && (
              <div className="glass-panel rounded-[1.4rem] px-4 py-4 sm:px-5 sm:py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="section-kicker !text-[10px] !opacity-58">
                      Progressive loading
                    </p>
                    <p className="mt-2 text-sm opacity-72 sm:text-[15px]">
                      {isLoadingMorePosts
                        ? '正在加载更多文章...'
                        : hasMorePosts
                          ? '继续下滑会自动补更多内容。'
                          : '文章已经全部加载完成。'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-black/8 bg-white/60 px-3 py-1 text-[11px] tracking-[0.14em] uppercase opacity-72 dark:border-white/10 dark:bg-white/8">
                      {posts.length} / {totalPosts}
                    </span>
                    {loadMoreError && (
                      <button
                        type="button"
                        onClick={() => loadMorePosts()}
                        className="rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase dark:border-white/10 dark:bg-white/8"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
                          onClick={async (event) => {
                            event.preventDefault();
                            setActiveSlug(post.slug);
                            await scrollToPost(post.slug);
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
  const allPosts = sortPostsByLatest(getPostSummaries());
  const globalData = getGlobalData();

  return {
    props: {
      initialPosts: allPosts.slice(0, DEFAULT_POSTS_PAGE_SIZE),
      globalData,
      totalPosts: allPosts.length,
      latestPostDate: allPosts[0]?.data.date || '',
      oldestPostDate: allPosts[allPosts.length - 1]?.data.date || '',
      pageSize: DEFAULT_POSTS_PAGE_SIZE,
    },
  };
}
