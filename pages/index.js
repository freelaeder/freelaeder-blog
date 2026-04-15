import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_POSTS_PAGE_SIZE,
  getPostSummaries,
} from '../utils/mdx-utils';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout, { GradientBackground } from '../components/Layout';
import { getGlobalData } from '../utils/global-data';
import SEO from '../components/SEO';
import {
  formatDisplayDate,
  getDateParts,
} from '../utils/date-utils';

const HOME_TIMELINE_STATE_KEY = 'home-timeline-state';
const HOME_TIMELINE_RETURN_KEY = 'home-timeline-return';
const HOME_TIMELINE_RETURN_SLUG_KEY = 'home-timeline-return-slug';

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

const previewText = (summary = '') =>
  summary.length > 120 ? `${summary.slice(0, 120).trim()}...` : summary;

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
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(initialPosts.length < totalPosts);
  const [loadMoreError, setLoadMoreError] = useState('');
  const isTimelineStateReadyRef = useRef(false);
  const isLoadingMorePostsRef = useRef(false);
  const hasMorePostsRef = useRef(initialPosts.length < totalPosts);
  const postsRef = useRef(initialPosts);
  const activeSlugRef = useRef(initialPosts[0]?.slug || '');
  const loadMoreTriggerRef = useRef(null);

  const yearGroups = useMemo(() => getYearGroupsByLatest(posts), [posts]);

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

    if (activeSlug && !posts.some((post) => post.slug === activeSlug) && posts[0]?.slug) {
      setActiveSlug(posts[0].slug);
    }
  }, [activeSlug, posts]);

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

  const saveHomeTimelineState = (nextState = {}) => {
    if (typeof window === 'undefined') {
      return;
    }

    const scrollContainer = document.getElementById('page-scroll-container');
    const previousState = getSavedTimelineState();

    sessionStorage.setItem(
      HOME_TIMELINE_STATE_KEY,
      JSON.stringify({
        ...previousState,
        activeSlug: activeSlugRef.current,
        contentScrollTop: scrollContainer?.scrollTop ?? 0,
        loadedCount: postsRef.current.length,
        ...nextState,
      })
    );
  };

  const syncHeaderCompactState = (scrollTop = 0) => {
    window.dispatchEvent(
      new CustomEvent('header-compact-state', {
        detail: { isScrolled: scrollTop > 36 },
      })
    );
  };

  const getVisibleSlug = (scrollContainer) => {
    if (!scrollContainer || postsRef.current.length === 0) {
      return '';
    }

    const focusLine = scrollContainer.scrollTop + 180;
    let nextSlug = postsRef.current[0]?.slug || '';

    for (const post of postsRef.current) {
      const postElement = document.getElementById(`post-${post.slug}`);

      if (!postElement) {
        continue;
      }

      if (postElement.offsetTop <= focusLine) {
        nextSlug = post.slug;
        continue;
      }

      break;
    }

    return nextSlug;
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

  const maybeLoadMoreOnScroll = useCallback(
    (scrollContainer) => {
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
    },
    [loadMorePosts]
  );

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

      const scrollContainer = document.getElementById('page-scroll-container');

      if (!scrollContainer || postsRef.current.length === 0) {
        return;
      }

      if (!shouldRestore || !rawState) {
        const nextSlug = getVisibleSlug(scrollContainer);
        isTimelineStateReadyRef.current = true;
        setActiveSlug(nextSlug || postsRef.current[0]?.slug || '');
        syncHeaderCompactState(scrollContainer.scrollTop);
        return;
      }

      const {
        activeSlug: savedSlug,
        contentScrollTop = 0,
      } = savedState;
      const targetSlug = returnSlug || savedSlug || postsRef.current[0]?.slug || '';

      isTimelineStateReadyRef.current = true;
      sessionStorage.removeItem(HOME_TIMELINE_RETURN_KEY);
      sessionStorage.removeItem(HOME_TIMELINE_RETURN_SLUG_KEY);
      setActiveSlug(targetSlug);
      scrollContainer.scrollTo({
        top: contentScrollTop,
        behavior: 'auto',
      });
      syncHeaderCompactState(contentScrollTop);
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
      const currentScrollTop = scrollContainer.scrollTop;

      if (isTimelineStateReadyRef.current) {
        saveHomeTimelineState({ contentScrollTop: currentScrollTop });
      }

      syncHeaderCompactState(currentScrollTop);
      maybeLoadMoreOnScroll(scrollContainer);

      const nextVisibleSlug = getVisibleSlug(scrollContainer);

      if (nextVisibleSlug && nextVisibleSlug !== activeSlugRef.current) {
        setActiveSlug(nextVisibleSlug);
      }
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
    <Layout contentClassName="max-w-[980px]">
      <SEO title={globalData.name} description={globalData.blogDescription} />
      <Header name={globalData.name} />

      <main className="mx-auto w-full max-w-[780px] pb-8 pt-4 sm:pt-8">
        <section className="animate-fade-up text-center">
          <p className="section-kicker mx-auto w-fit">Archive</p>
          <h1 className="mt-5 text-[clamp(2.9rem,8vw,5rem)] leading-[0.92]">
            {globalData.blogTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-[38rem] text-[15px] leading-8 text-neutral-600 dark:text-white/60 sm:text-lg">
            {globalData.blogDescription}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[0.68rem] tracking-[0.22em] text-neutral-500 uppercase dark:text-white/42 sm:gap-x-7">
            <span>{totalPosts} posts</span>
            <span>{formatDisplayDate(latestPostDate)} latest</span>
            <span>Since {getDateParts(oldestPostDate).year}</span>
          </div>
        </section>

        <div className="mt-14 space-y-16 sm:mt-20 sm:space-y-20">
          {yearGroups.map(([year, yearPosts]) => (
            <section key={year} className="relative">
              <div className="pointer-events-none absolute -left-1 -top-7 text-[clamp(4.5rem,18vw,8.5rem)] font-medium tracking-[-0.08em] text-black/[0.05] dark:text-white/[0.05]">
                {year}
              </div>

              <div className="relative border-t border-black/8 pt-7 dark:border-white/10 sm:pt-8">
                <ul className="divide-y divide-black/7 dark:divide-white/10">
                  {yearPosts.map((post, index) => {
                    const isActive = activeSlug === post.slug;
                    const firstTag = post.data.tags?.[0];

                    return (
                      <li
                        key={post.slug}
                        id={`post-${post.slug}`}
                        style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
                        className={`story-card animate-fade-up ${
                          isActive
                            ? 'bg-black/[0.04] shadow-[0_10px_26px_-22px_rgba(0,0,0,0.28)] dark:bg-white/[0.06] dark:shadow-[0_10px_26px_-22px_rgba(0,0,0,0.5)]'
                            : ''
                        }`}
                      >
                        <Link
                          as={`/posts/${post.slug}`}
                          href={`/posts/${post.slug}`}
                          onClick={() => {
                            setActiveSlug(post.slug);
                            saveHomeTimelineState({ activeSlug: post.slug });
                          }}
                          className="group grid gap-2 rounded-[1rem] px-3 py-5 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:py-6"
                        >
                          <div className="min-w-0">
                            <h2 className="text-[1.24rem] leading-[1.35] text-neutral-900 transition-colors group-hover:text-neutral-950 dark:text-white sm:text-[1.52rem] dark:group-hover:text-white">
                              {post.data.title}
                            </h2>
                            {post.data.summary && (
                              <p className="mt-2 max-w-[36rem] text-sm leading-7 text-neutral-500 transition-colors group-hover:text-neutral-700 dark:text-white/48 dark:group-hover:text-white/68">
                                {previewText(post.data.summary)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 text-[0.68rem] tracking-[0.18em] text-neutral-400 uppercase transition-colors group-hover:text-neutral-600 dark:text-white/35 sm:justify-end sm:pt-1 dark:group-hover:text-white/54">
                            {firstTag && (
                              <>
                                <span>{firstTag}</span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <time>{formatDisplayDate(post.data.date)}</time>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>

        {(hasMorePosts || isLoadingMorePosts || loadMoreError) && (
          <div className="mt-12 border-t border-black/8 pt-6 text-sm text-neutral-500 dark:border-white/10 dark:text-white/48">
            <div ref={loadMoreTriggerRef} className="h-px w-full" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                {isLoadingMorePosts
                  ? '正在加载更多文章...'
                  : loadMoreError
                    ? loadMoreError
                    : hasMorePosts
                      ? `已加载 ${posts.length} / ${totalPosts}`
                      : '文章已经全部加载完成。'}
              </p>

              {loadMoreError && (
                <button
                  type="button"
                  onClick={() => loadMorePosts()}
                  className="rounded-full border border-black/10 px-4 py-2 text-[0.68rem] tracking-[0.18em] uppercase hover:border-black/16 hover:text-neutral-900 dark:border-white/10 dark:hover:border-white/16 dark:hover:text-white"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
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
