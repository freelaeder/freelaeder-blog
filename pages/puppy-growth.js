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
    period: '1—3 个月',
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
    period: '3—6 个月',
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
const supportedImagePattern = /\.(?:avif|gif|jpe?g|jfif|png|svg|webp)$/i;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const AGE_BASELINE_DATE = Date.UTC(2026, 6, 4);
const AGE_BASELINE_DAYS = 30 + 12;

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

const calculatePuppyAge = (date = new Date()) => {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const elapsedDays = Math.max(
    0,
    Math.round((today - AGE_BASELINE_DATE) / DAY_IN_MS)
  );
  const totalAgeDays = AGE_BASELINE_DAYS + elapsedDays;
  const months = Math.floor(totalAgeDays / 30);
  const days = totalAgeDays % 30;

  return {
    months,
    days,
    daysToNextMonth: days === 0 ? 30 : 30 - days,
    isMonthBirthday: days === 0,
  };
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

function CarouselLane({
  group,
  groupIndex,
  currentIndex,
  isSpotlight,
  directionStep,
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
                <img
                  src={image.src}
                  alt={`${image.age}，${image.title}`}
                  loading={isFocused ? 'eager' : 'lazy'}
                  decoding="async"
                />
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

export default function PuppyGrowth({ globalData, groups }) {
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
    const preloadImage = new window.Image();
    preloadImage.decoding = 'async';
    preloadImage.src = nextImage.src;
  }, [activeGroupIndex, groups, laneIndexes]);

  useEffect(() => {
    const refreshAge = () => setPuppyAge(calculatePuppyAge());
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
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(() => advance(1), 3800);
    return () => window.clearInterval(timer);
  }, [advance, isPlaying]);

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

            <div className={styles.galleryCanvas}>
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
                  onSelect={handleSelect}
                />
              ))}

              <div className={styles.playbackDock}>
                <button type="button" onClick={() => advance(-1)} aria-label="上一组图片" title="上一张 (←)">
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
                <button type="button" onClick={() => advance(1)} aria-label="下一组图片" title="下一张 (→)">
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
  const naturalSort = new Intl.Collator('zh-CN', {
    numeric: true,
    sensitivity: 'base',
  });
  const knownImageCopy = new Map(
    growthGroupTemplates.flatMap((group) =>
      group.images.map((image) => [path.basename(image.src), image])
    )
  );
  const readImageFiles = (directory) => {
    if (!fs.existsSync(directory)) {
      return [];
    }

    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && supportedImagePattern.test(entry.name))
      .map((entry) => entry.name)
      .sort((firstFile, secondFile) => naturalSort.compare(firstFile, secondFile));
  };
  const groupFolderFiles = growthGroupTemplates.map((_, groupIndex) => ({
    folder: `group-${groupIndex + 1}`,
    files: readImageFiles(path.join(imageRoot, `group-${groupIndex + 1}`)),
  }));
  const usesGroupFolders = groupFolderFiles.some((group) => group.files.length > 0);
  const rootFiles = usesGroupFolders ? [] : readImageFiles(imageRoot);
  const filesPerGroup = Math.ceil(rootFiles.length / growthGroupTemplates.length);
  const toGalleryImage = (fileName, folder, group, imageIndex) => {
    const knownCopy = knownImageCopy.get(fileName);
    const fileStem = path.parse(fileName).name;
    const readableName = fileStem
      .replace(/^\d+[-_.\s]*/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    const encodedPath = [folder, fileName]
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return {
      id: `${group.id}-${imageIndex}-${fileStem}`,
      src: `/images/puppy-growth/${encodedPath}`,
      age: knownCopy?.age || `${group.period} · ${String(imageIndex + 1).padStart(2, '0')}`,
      title: knownCopy?.title || readableName || `成长瞬间 ${imageIndex + 1}`,
      note: knownCopy?.note || `${group.title}的第 ${imageIndex + 1} 个成长瞬间。`,
    };
  };
  const scannedGroups = growthGroupTemplates
    .map((group, groupIndex) => {
      const folder = usesGroupFolders ? groupFolderFiles[groupIndex].folder : '';
      const files = usesGroupFolders
        ? groupFolderFiles[groupIndex].files
        : rootFiles.slice(groupIndex * filesPerGroup, (groupIndex + 1) * filesPerGroup);

      return {
        ...group,
        images: files.map((fileName, imageIndex) =>
          toGalleryImage(fileName, folder, group, imageIndex)
        ),
      };
    })
    .filter((group) => group.images.length > 0);
  const groups = scannedGroups.length > 0 ? scannedGroups : growthGroupTemplates;

  return {
    props: {
      globalData: getGlobalData(),
      groups,
    },
  };
}
