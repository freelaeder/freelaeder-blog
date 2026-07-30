import fs from 'fs';
import Link from 'next/link';
import path from 'path';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SEO from '../components/SEO';
import { getGlobalData } from '../utils/global-data';
import styles from '../styles/PuppyGrowth.module.css';

const growthGroupTemplates = [
  {
    id: 'tiny-days',
    chapter: 'Chapter 01',
    title: '奶呼呼的初见',
    period: '0—3 个月',
    maxAgeDays: 3 * 30,
    accent: '#ff7e8c',
    angle: '-4deg',
    top: '58px',
    mobileTop: '76px',
    images: [
      {
        id: 'first-day',
        src: '/images/puppy-growth/01-first-day.svg',
        age: '第 1 周',
        title: '第一次见面',
        note: '小小一团，从今天开始一起长大。',
      },
      {
        id: 'sleepy',
        src: '/images/puppy-growth/02-sleepy.svg',
        age: '第 2 周',
        title: '睡成一朵云',
        note: '柔软的午后，连梦都是奶香味。',
      },
      {
        id: 'first-walk',
        src: '/images/puppy-growth/03-first-walk.svg',
        age: '第 2 月',
        title: '第一次小冒险',
        note: '四只小爪子，开始认识更大的世界。',
      },
    ],
  },
  {
    id: 'brave-days',
    chapter: 'Chapter 02',
    title: '好奇心大爆发',
    period: '3—12 个月',
    maxAgeDays: 12 * 30,
    accent: '#5fc9b4',
    angle: '4deg',
    top: '320px',
    mobileTop: '366px',
    images: [
      {
        id: 'muddy-paws',
        src: '/images/puppy-growth/04-muddy-paws.svg',
        age: '第 3 月',
        title: '泥爪印收藏家',
        note: '快乐的证据，是一路留下的小脚印。',
      },
      {
        id: 'new-friend',
        src: '/images/puppy-growth/05-new-friend.svg',
        age: '第 5 月',
        title: '交到新朋友',
        note: '两条摇个不停的尾巴，成了好搭档。',
      },
      {
        id: 'beach-day',
        src: '/images/puppy-growth/06-beach-day.svg',
        age: '第 6 月',
        title: '海风吹乱耳朵',
        note: '第一次看海，也第一次追着浪花跑。',
      },
    ],
  },
  {
    id: 'sunny-days',
    chapter: 'Chapter 03',
    title: '长成阳光少年',
    period: '1 岁以后',
    maxAgeDays: 100 * 12 * 30,
    accent: '#7b78e8',
    angle: '-3deg',
    top: '582px',
    mobileTop: '656px',
    images: [
      {
        id: 'birthday',
        src: '/images/puppy-growth/07-birthday.svg',
        age: '第 1 年',
        title: '一岁生日快乐',
        note: '吹不灭蜡烛没关系，快乐已经满格。',
      },
      {
        id: 'camping',
        src: '/images/puppy-growth/08-camping.svg',
        age: '第 1 年',
        title: '星星下的露营',
        note: '一起守着帐篷，也一起守着好梦。',
      },
      {
        id: 'sunshine',
        src: '/images/puppy-growth/09-sunshine.svg',
        age: '未完待续',
        title: '继续向着阳光',
        note: '日子还长，下一张照片正在路上。',
      },
    ],
  },
];

const entryDirections = [
  { x: '-90px', y: '-62px', rotate: '-5deg' },
  { x: '94px', y: '-54px', rotate: '5deg' },
  { x: '88px', y: '64px', rotate: '-4deg' },
  { x: '-92px', y: '58px', rotate: '4deg' },
];

const visibleOffsets = [-1, 0, 1];
const supportedVideoPattern = /\.(?:m4v|mov|mp4|ogv|webm)$/i;
const supportedMediaPattern = /\.(?:avif|gif|jpe?g|jfif|m4v|mov|mp4|ogv|png|svg|webm|webp)$/i;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const defaultAgeBaseline = {
  date: '2026-07-04',
  months: 1,
  days: 12,
};

const wrapIndex = (value, length) => ((value % length) + length) % length;

const getNextPosition = (groups, groupIndex, imageIndexes, step) => {
  const nextImageIndexes = [...imageIndexes];
  const currentImageIndex = nextImageIndexes[groupIndex] || 0;
  const currentGroup = groups[groupIndex];

  if (step > 0 && currentImageIndex < currentGroup.images.length - 1) {
    nextImageIndexes[groupIndex] = currentImageIndex + 1;
    return { groupIndex, imageIndexes: nextImageIndexes };
  }

  if (step < 0 && currentImageIndex > 0) {
    nextImageIndexes[groupIndex] = currentImageIndex - 1;
    return { groupIndex, imageIndexes: nextImageIndexes };
  }

  const nextGroupIndex = wrapIndex(groupIndex + step, groups.length);
  nextImageIndexes[nextGroupIndex] =
    step > 0 ? 0 : groups[nextGroupIndex].images.length - 1;

  return { groupIndex: nextGroupIndex, imageIndexes: nextImageIndexes };
};

const toUtcDate = (value) => {
  if (typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
};

const calculatePuppyAge = (date = new Date(), baseline = defaultAgeBaseline) => {
  const today = toUtcDate(date);
  const baselineDate = toUtcDate(baseline.date);
  const elapsedDays = Math.max(
    0,
    Math.round((today - baselineDate) / DAY_IN_MS)
  );
  const totalAgeDays = baseline.months * 30 + baseline.days + elapsedDays;
  const months = Math.floor(totalAgeDays / 30);
  const days = totalAgeDays % 30;

  return {
    months,
    days,
    daysToNextMonth: days === 0 ? 30 : 30 - days,
    isMonthBirthday: days === 0,
    totalAgeDays,
  };
};

const formatPuppyAge = ({ months, days }) => {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return [
      `${years}岁`,
      remainingMonths > 0 ? `${remainingMonths}个月` : '',
      days > 0 ? `${days}天` : '',
    ].filter(Boolean).join('');
  }

  return `${months}个月${days > 0 ? `${days}天` : ''}`;
};

function ArrowIcon({ direction = 'right' }) {
  return (
    <svg
      aria-hidden="true"
      className={direction === 'left' ? styles.flipIcon : undefined}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PlayIcon({ paused }) {
  return paused ? (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m8 6 10 6-10 6V6Z" fill="currentColor" />
    </svg>
  ) : (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M8.5 6.5v11M15.5 6.5v11" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

function ExpandIcon({ compressed }) {
  return compressed ? (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  ) : (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PawMark() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <ellipse cx="16" cy="21" fill="currentColor" rx="7" ry="6" />
      <circle cx="7" cy="15" fill="currentColor" r="3" />
      <circle cx="13" cy="9" fill="currentColor" r="3" />
      <circle cx="20" cy="9" fill="currentColor" r="3" />
      <circle cx="25" cy="15" fill="currentColor" r="3" />
    </svg>
  );
}

function GalleryMedia({
  isActive = false,
  isPlaying = false,
  item,
  onEnded,
  showControls = false,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (item.type !== 'video' || !isActive || !videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play().catch(() => undefined);
    } else {
      videoRef.current.pause();
    }
  }, [isActive, isPlaying, item.src, item.type]);

  if (item.type === 'video') {
    return (
      <video
        ref={isActive ? videoRef : undefined}
        src={item.src}
        aria-label={`${item.age}，${item.title}`}
        autoPlay={isActive && isPlaying}
        controls={isActive && showControls}
        muted
        playsInline
        preload={isActive ? 'auto' : 'metadata'}
        onEnded={isActive ? onEnded : undefined}
      />
    );
  }

  return (
    <img
      src={item.src}
      alt={`${item.age}，${item.title}`}
      loading={isActive ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

function CarouselLane({
  group,
  groupIndex,
  currentIndex,
  isSpotlight,
  directionStep,
  isPlaying,
  onMediaEnded,
  onSelect,
}) {
  const direction = entryDirections[directionStep];

  return (
    <section
      aria-label={`${group.title}轮播图`}
      className={styles.lane}
      style={{
        '--lane-angle': group.angle,
        '--lane-top': group.top,
        '--lane-mobile-top': group.mobileTop,
        '--group-accent': group.accent,
      }}
    >
      <div className={styles.laneLabel}>
        <span>{group.chapter}</span>
        <strong>{group.title}</strong>
        <small>{group.period}</small>
      </div>

      <div className={styles.rail}>
        <div className={styles.cardRow}>
          {visibleOffsets.map((offset) => {
            const imageIndex = wrapIndex(currentIndex + offset, group.images.length);
            const image = group.images[imageIndex];
            const isFocused = isSpotlight && offset === 0;

            return (
              <button
                key={`${image.id}-${offset}-${isFocused ? directionStep : 'rest'}`}
                type="button"
                aria-label={`查看${image.age}：${image.title}`}
                aria-pressed={isFocused}
                className={styles.photoCard}
                data-center={offset === 0}
                data-focused={isFocused}
                onClick={() => onSelect(groupIndex, imageIndex)}
                style={
                  isFocused
                    ? {
                        '--entry-x': direction.x,
                        '--entry-y': direction.y,
                        '--entry-rotate': direction.rotate,
                      }
                    : undefined
                }
              >
                <GalleryMedia
                  item={image}
                  isActive={isFocused}
                  isPlaying={isPlaying}
                  onEnded={onMediaEnded}
                />
                {image.type === 'video' ? (
                  <i className={styles.mediaTypeBadge}>Video</i>
                ) : null}
                <span className={styles.ageBadge}>{image.age}</span>
                <span className={styles.photoCopy}>
                  <strong>{image.title}</strong>
                  <small>{image.note}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FullscreenThumbnail({ item, onSelect }) {
  return (
    <button
      type="button"
      className={styles.fullscreenThumbnail}
      onClick={() => onSelect(item.groupIndex, item.imageIndex)}
      aria-label={`切换到${item.image.title}`}
    >
      <GalleryMedia item={item.image} />
      {item.image.type === 'video' ? (
        <i className={styles.mediaTypeBadge}>Video</i>
      ) : null}
      <span>
        <small>{item.group.chapter}</small>
        <strong>{item.image.title}</strong>
      </span>
    </button>
  );
}

function FullscreenShowcase({
  activeGroup,
  activeImage,
  activeSequenceIndex,
  directionStep,
  groups,
  isPlaying,
  onAdvance,
  onSelect,
  onTogglePlay,
  sequence,
}) {
  const getSequenceItem = (offset) =>
    sequence[wrapIndex(activeSequenceIndex + offset, sequence.length)];
  const previousItems = [-3, -2, -1].map(getSequenceItem);
  const nextItems = [1, 2, 3].map(getSequenceItem);

  return (
    <div className={styles.fullscreenShowcase}>
      <aside className={styles.fullscreenSide} aria-label="上一组成长图片">
        <p className={styles.fullscreenSideLabel}>Previous</p>
        <div
          key={`previous-${activeImage.id}`}
          className={`${styles.fullscreenThumbnailStack} ${styles.thumbnailStackUp}`}
        >
          {previousItems.map((item, index) => (
            <FullscreenThumbnail
              key={`previous-${item.image.id}-${index}`}
              item={item}
              onSelect={onSelect}
            />
          ))}
        </div>
      </aside>

      <section className={styles.fullscreenCenter} aria-label="当前大图">
        <div
          key={`${activeImage.id}-${directionStep}`}
          className={styles.fullscreenHeroVisual}
          data-media-type={activeImage.type}
        >
          <GalleryMedia
            item={activeImage}
            isActive
            isPlaying={isPlaying}
            onEnded={() => onAdvance(1)}
            showControls
          />
          <span className={styles.fullscreenGroupBadge}>{activeGroup.title}</span>
          <div className={styles.fullscreenImageCopy}>
            <p>{activeImage.age}</p>
            <h2>{activeImage.title}</h2>
            <span>{activeImage.note}</span>
          </div>
          <span className={styles.fullscreenCounter}>
            {String(activeSequenceIndex + 1).padStart(2, '0')}
            <i />
            {String(sequence.length).padStart(2, '0')}
          </span>
        </div>

        <div className={styles.fullscreenControlBar}>
          <button type="button" onClick={() => onAdvance(-1)} aria-label="上一张图片" title="上一张 (←)">
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            className={styles.fullscreenPlayButton}
            onClick={onTogglePlay}
            aria-label={isPlaying ? '暂停自动播放' : '继续自动播放'}
            title={isPlaying ? '暂停 (空格)' : '播放 (空格)'}
          >
            <PlayIcon paused={!isPlaying} />
          </button>
          <button type="button" onClick={() => onAdvance(1)} aria-label="下一张图片" title="下一张 (→)">
            <ArrowIcon />
          </button>
          <span className={styles.fullscreenControlDivider} aria-hidden="true" />
          <div className={styles.fullscreenGroupProgress} aria-label={`当前第 ${activeGroup.groupIndex + 1} 组，共 ${groups.length} 组`}>
            {groups.map((group, groupIndex) => (
              <span
                key={group.id}
                className={groupIndex === activeGroup.groupIndex ? styles.fullscreenActiveGroup : undefined}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className={styles.fullscreenSide} aria-label="接下来的成长图片">
        <p className={styles.fullscreenSideLabel}>Up next</p>
        <div
          key={`next-${activeImage.id}`}
          className={`${styles.fullscreenThumbnailStack} ${styles.thumbnailStackDown}`}
        >
          {nextItems.map((item, index) => (
            <FullscreenThumbnail
              key={`next-${item.image.id}-${index}`}
              item={item}
              onSelect={onSelect}
            />
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function PuppyGrowth({ ageBaseline, globalData, groups }) {
  const galleryRef = useRef(null);
  const [laneIndexes, setLaneIndexes] = useState(() => groups.map(() => 0));
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [directionStep, setDirectionStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isFallbackFullscreen, setIsFallbackFullscreen] = useState(false);
  const [puppyAge, setPuppyAge] = useState(null);
  const isFullscreen = isNativeFullscreen || isFallbackFullscreen;

  const activeImage = useMemo(() => {
    const group = groups[activeGroupIndex];
    return group.images[laneIndexes[activeGroupIndex]];
  }, [activeGroupIndex, groups, laneIndexes]);

  const totalImages = useMemo(
    () => groups.reduce((total, group) => total + group.images.length, 0),
    [groups]
  );

  const gallerySequence = useMemo(
    () =>
      groups.flatMap((group, groupIndex) =>
        group.images.map((image, imageIndex) => ({
          group: { ...group, groupIndex },
          groupIndex,
          image,
          imageIndex,
        }))
      ),
    [groups]
  );

  const activeSequenceIndex = useMemo(
    () =>
      gallerySequence.findIndex(
        (item) =>
          item.groupIndex === activeGroupIndex &&
          item.imageIndex === laneIndexes[activeGroupIndex]
      ),
    [activeGroupIndex, gallerySequence, laneIndexes]
  );

  const advance = useCallback((step) => {
    const nextPosition = getNextPosition(
      groups,
      activeGroupIndex,
      laneIndexes,
      step
    );
    setLaneIndexes(nextPosition.imageIndexes);
    setActiveGroupIndex(nextPosition.groupIndex);
    setDirectionStep((currentDirection) =>
      wrapIndex(currentDirection + step, entryDirections.length)
    );
  }, [activeGroupIndex, groups, laneIndexes]);

  const toggleFullscreen = useCallback(async () => {
    if (isFallbackFullscreen) {
      setIsFallbackFullscreen(false);
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (galleryRef.current?.requestFullscreen) {
        await galleryRef.current?.requestFullscreen();
        if (document.fullscreenElement !== galleryRef.current) {
          setIsFallbackFullscreen(true);
        }
      } else {
        setIsFallbackFullscreen(true);
      }
    } catch {
      setIsFallbackFullscreen(true);
    }
  }, [isFallbackFullscreen]);

  useEffect(() => {
    const nextPosition = getNextPosition(
      groups,
      activeGroupIndex,
      laneIndexes,
      1
    );
    const nextImage =
      groups[nextPosition.groupIndex].images[
        nextPosition.imageIndexes[nextPosition.groupIndex]
      ];

    if (nextImage.type === 'video') {
      const preloadVideo = document.createElement('video');
      preloadVideo.preload = 'metadata';
      preloadVideo.src = nextImage.src;
      return () => {
        preloadVideo.removeAttribute('src');
        preloadVideo.load();
      };
    }

    const preloadImage = new window.Image();
    preloadImage.decoding = 'async';
    preloadImage.src = nextImage.src;
    return undefined;
  }, [activeGroupIndex, groups, laneIndexes]);

  useEffect(() => {
    const refreshAge = () => setPuppyAge(calculatePuppyAge(new Date(), ageBaseline));
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAge();
      }
    };

    refreshAge();
    const timer = window.setInterval(refreshAge, 60 * 1000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ageBaseline]);

  useEffect(() => {
    if (!isPlaying || activeImage.type === 'video') {
      return undefined;
    }

    const timer = window.setInterval(() => advance(1), 3800);
    return () => window.clearInterval(timer);
  }, [activeImage.type, advance, isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isGalleryFullscreen = document.fullscreenElement === galleryRef.current;
      setIsNativeFullscreen(isGalleryFullscreen);
      if (isGalleryFullscreen) {
        setIsFallbackFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        advance(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        advance(1);
      } else if (event.key === ' ') {
        event.preventDefault();
        setIsPlaying((current) => !current);
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFullscreen();
      } else if (event.key === 'Escape' && isFallbackFullscreen) {
        event.preventDefault();
        setIsFallbackFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advance, isFallbackFullscreen, toggleFullscreen]);

  const handleSelect = (groupIndex, imageIndex) => {
    setLaneIndexes((currentIndexes) =>
      currentIndexes.map((currentIndex, index) =>
        index === groupIndex ? imageIndex : currentIndex
      )
    );
    setActiveGroupIndex(groupIndex);
    setDirectionStep((currentDirection) =>
      wrapIndex(currentDirection + 1, entryDirections.length)
    );
  };

  return (
    <div id="page-scroll-container" className={styles.page}>
      <SEO
        title={`小狗成长日记 | ${globalData.name}`}
        description="用明亮卡通的多组轮播图，记录小狗从幼崽到长大的每一个瞬间。"
        image={groups[0].images[0].src}
      />

      <div className={styles.ambient} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="返回博客首页">
            <span className={styles.brandMark}><PawMark /></span>
            <span>Puppy Days</span>
          </Link>
          <nav aria-label="页面导航" className={styles.navigation}>
            <Link href="/countdown">事件倒计时</Link>
            <Link href="/">返回博客</Link>
          </nav>
        </header>

        <main>
          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}>A little life, a big story</p>
              <h1>小狗成长<br /><em>放映中</em></h1>
              <p className={styles.intro}>
                把那些一闪而过的可爱瞬间，装进会转动的成长胶卷。每一岁、每一步，都值得被大大地看见。
              </p>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.ageCard} aria-live="polite">
                <div className={styles.ageCardHeader}>
                  <span className={styles.liveDot} aria-hidden="true" />
                  <span>Today · 实时年龄</span>
                </div>
                {puppyAge ? (
                  <>
                    <p className={styles.ageValue}>
                      <strong>{puppyAge.months}</strong><span>个月</span>
                      <strong>{puppyAge.days}</strong><span>天</span>
                    </p>
                    <p className={styles.ageMilestone}>
                      {puppyAge.isMonthBirthday
                        ? `今天刚满 ${puppyAge.months} 个月`
                        : `再过 ${puppyAge.daysToNextMonth} 天就是 ${puppyAge.months + 1} 个月`}
                    </p>
                  </>
                ) : (
                  <p className={styles.agePlaceholder}>正在计算今天的年龄…</p>
                )}
              </div>

              <div className={styles.heroNote} aria-label="相册摘要">
                <span className={styles.noteNumber}>{String(totalImages).padStart(2, '0')}</span>
                <span>个成长瞬间</span>
                <i />
                <span>{groups.length} 组青春影像</span>
              </div>
            </div>
          </section>

          <section
            ref={galleryRef}
            className={`${styles.experience} ${
              isFallbackFullscreen ? styles.fallbackFullscreen : ''
            }`}
            aria-label="小狗成长全屏轮播相册"
          >
            <div className={styles.experienceToolbar}>
              <div className={styles.reelTitle}>
                <span className={styles.liveDot} aria-hidden="true" />
                <strong>Growth Reel</strong>
                <span>正在播放 · {activeImage.age}</span>
              </div>
              <button
                type="button"
                className={styles.fullscreenButton}
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? '退出全屏展示' : '进入全屏展示'}
                title={isFullscreen ? '退出全屏 (F)' : '全屏展示 (F)'}
              >
                <ExpandIcon compressed={isFullscreen} />
                <span>{isFullscreen ? '退出全屏' : '全屏展示'}</span>
              </button>
            </div>

            {isFullscreen ? (
              <FullscreenShowcase
                activeGroup={{ ...groups[activeGroupIndex], groupIndex: activeGroupIndex }}
                activeImage={activeImage}
                activeSequenceIndex={activeSequenceIndex}
                directionStep={directionStep}
                groups={groups}
                isPlaying={isPlaying}
                onAdvance={advance}
                onSelect={handleSelect}
                onTogglePlay={() => setIsPlaying((current) => !current)}
                sequence={gallerySequence}
              />
            ) : (
              <div className={styles.galleryCanvas} data-group-count={groups.length}>
                <span className={styles.sunDoodle} aria-hidden="true" />
                <span className={styles.starDoodle} aria-hidden="true" />
                <span className={styles.wavyDoodle} aria-hidden="true" />

                {groups.map((group, groupIndex) => (
                  <CarouselLane
                    key={group.id}
                    group={group}
                    groupIndex={groupIndex}
                    currentIndex={laneIndexes[groupIndex]}
                    isSpotlight={activeGroupIndex === groupIndex}
                    directionStep={directionStep}
                    isPlaying={isPlaying}
                    onMediaEnded={() => advance(1)}
                    onSelect={handleSelect}
                  />
                ))}

                <div className={styles.playbackDock}>
                  <button type="button" onClick={() => advance(-1)} aria-label="上一张图片" title="上一张 (←)">
                    <ArrowIcon direction="left" />
                  </button>
                  <button
                    type="button"
                    className={styles.playButton}
                    onClick={() => setIsPlaying((current) => !current)}
                    aria-label={isPlaying ? '暂停自动播放' : '继续自动播放'}
                    title={isPlaying ? '暂停 (空格)' : '播放 (空格)'}
                  >
                    <PlayIcon paused={!isPlaying} />
                  </button>
                  <button type="button" onClick={() => advance(1)} aria-label="下一张图片" title="下一张 (→)">
                    <ArrowIcon />
                  </button>
                  <span className={styles.dockDivider} aria-hidden="true" />
                  <div className={styles.progressDots} aria-label={`当前第 ${activeGroupIndex + 1} 组，共 ${groups.length} 组`}>
                    {groups.map((group, groupIndex) => (
                      <button
                        key={group.id}
                        type="button"
                        aria-label={`查看${group.title}`}
                        aria-current={activeGroupIndex === groupIndex ? 'true' : undefined}
                        className={activeGroupIndex === groupIndex ? styles.activeDot : undefined}
                        onClick={() => setActiveGroupIndex(groupIndex)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p className={styles.srOnly} aria-live="polite">
              正在高亮展示：{activeImage.age}，{activeImage.title}。{activeImage.note}
            </p>
          </section>

        </main>

        <footer className={styles.footer}>
          <span>{globalData.footerText}</span>
          <span>Made for wagging tails</span>
        </footer>
      </div>
    </div>
  );
}

export function getStaticProps() {
  const imageRoot = path.join(process.cwd(), 'public', 'images', 'puppy-growth');
  const ageRecordsPath = path.join(imageRoot, 'image-age-records.json');
  const naturalSort = new Intl.Collator('zh-CN', {
    numeric: true,
    sensitivity: 'base',
  });
  const ageRecords = fs.existsSync(ageRecordsPath)
    ? JSON.parse(fs.readFileSync(ageRecordsPath, 'utf8'))
    : { baseline: defaultAgeBaseline, records: [] };
  const ageBaseline = ageRecords.baseline || defaultAgeBaseline;
  const normalizedRecords = Array.isArray(ageRecords.records)
    ? ageRecords.records.map((record) => ({
        ...record,
        file: String(record.file || '').replace(/\\/g, '/'),
      }))
    : [];
  const recordsByFile = new Map(
    normalizedRecords.map((record) => [record.file.toLocaleLowerCase(), record])
  );
  const recordsBySequence = new Map(
    normalizedRecords.map((record) => [Number(record.sequence), record])
  );
  const knownImageCopy = new Map(
    growthGroupTemplates.flatMap((group) =>
      group.images.map((image) => [path.basename(image.src), image])
    )
  );
  const readImageFiles = (directory, relativeDirectory = '') => {
    if (!fs.existsSync(directory)) return [];

    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const relativePath = [relativeDirectory, entry.name].filter(Boolean).join('/');
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return readImageFiles(absolutePath, relativePath);
      }

      return entry.isFile() && supportedMediaPattern.test(entry.name)
        ? [relativePath]
        : [];
    });
  };
  const getNumericStem = (fileName) => {
    const stem = path.parse(fileName).name;
    return /^\d+$/.test(stem) ? Number(stem) : null;
  };
  const imageFiles = readImageFiles(imageRoot).sort((firstFile, secondFile) => {
    const firstRecord =
      recordsByFile.get(firstFile.toLocaleLowerCase()) ||
      recordsBySequence.get(getNumericStem(firstFile));
    const secondRecord =
      recordsByFile.get(secondFile.toLocaleLowerCase()) ||
      recordsBySequence.get(getNumericStem(secondFile));

    if (firstRecord && secondRecord) {
      return firstRecord.sequence - secondRecord.sequence;
    }
    if (firstRecord) return -1;
    if (secondRecord) return 1;
    return naturalSort.compare(firstFile, secondFile);
  });
  const scannedImages = imageFiles.map((fileName, imageIndex) => {
    const numericStem = getNumericStem(fileName);
    const record =
      recordsByFile.get(fileName.toLocaleLowerCase()) ||
      recordsBySequence.get(numericStem);
    const sequence = Number(record?.sequence) || numericStem || imageIndex + 1;
    const capturedOn = record?.capturedOn || null;
    const puppyAge = capturedOn
      ? calculatePuppyAge(capturedOn, ageBaseline)
      : null;
    const ageText = puppyAge
      ? record?.age || formatPuppyAge(puppyAge)
      : '日期待记录';
    const baseName = path.basename(fileName);
    const mediaType = supportedVideoPattern.test(baseName) ? 'video' : 'image';
    const knownCopy = knownImageCopy.get(baseName);
    const fileStem = path.parse(baseName).name;
    const readableName = fileStem
      .replace(/^\d+[-_.\s]*/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    const encodedPath = fileName
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return {
      id: `growth-${sequence}-${fileStem}`,
      src: `/images/puppy-growth/${encodedPath}`,
      type: mediaType,
      age: `${ageText} · ${String(sequence).padStart(2, '0')}`,
      title:
        record?.title ||
        knownCopy?.title ||
        readableName ||
        `${mediaType === 'video' ? '视频瞬间' : '成长瞬间'} ${sequence}`,
      note:
        record?.note ||
        knownCopy?.note ||
        (capturedOn
          ? `记录于 ${capturedOn.replace(/-/g, '.')}，那天 ${ageText}。`
          : '尚未记录拍摄日期。'),
      sequence,
      totalAgeDays: puppyAge?.totalAgeDays || 0,
    };
  });
  const scannedGroups = growthGroupTemplates
    .map((group) => ({
      ...group,
      images: scannedImages
        .filter((image) => {
          const groupIndex = growthGroupTemplates.findIndex(
            (template) => image.totalAgeDays < template.maxAgeDays
          );
          return growthGroupTemplates[groupIndex]?.id === group.id;
        })
        .map(({ totalAgeDays, ...image }) => image),
    }))
    .filter((group) => group.images.length > 0);
  const groups = scannedGroups.length > 0 ? scannedGroups : growthGroupTemplates;

  return {
    props: {
      ageBaseline,
      globalData: getGlobalData(),
      groups,
    },
  };
}
