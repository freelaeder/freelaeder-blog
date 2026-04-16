import { useEffect, useRef } from 'react';

const MIN_DESKTOP_WIDTH = 1120;
const MAX_CLUSTERS = 3;
const MAX_DEPTH = 9;
const MIN_LENGTH = 8;
const MAX_BRANCHES = 420;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const mulberry32 = (seed) => {
  let current = seed >>> 0;

  return () => {
    current |= 0;
    current = (current + 0x6d2b79f5) | 0;
    let result = Math.imul(current ^ (current >>> 15), 1 | current);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const pickUniquePreset = (pool, usedIds, random) => {
  const available = pool.filter((preset) => !usedIds.has(preset.id));

  if (available.length === 0) {
    return null;
  }

  const index = Math.floor(random() * available.length);
  return available[index];
};

const getPointOnQuadratic = (branch, progress) => {
  const inverse = 1 - progress;
  const x =
    inverse * inverse * branch.startX +
    2 * inverse * progress * branch.controlX +
    progress * progress * branch.endX;
  const y =
    inverse * inverse * branch.startY +
    2 * inverse * progress * branch.controlY +
    progress * progress * branch.endY;
  const wobbleEnvelope = Math.sin(progress * Math.PI);
  const wobbleOffset =
    wobbleEnvelope *
    Math.sin(progress * branch.wobbleFrequency + branch.wobblePhase) *
    branch.wobbleAmplitude;

  return {
    x: x + Math.cos(branch.normalAngle) * wobbleOffset,
    y: y + Math.sin(branch.normalAngle) * wobbleOffset,
  };
};

const createBranch = ({
  x,
  y,
  angle,
  length,
  width,
  depth,
  alpha,
  random,
  startAt = 0,
  durationMs,
  isPrimary = false,
  allowTiny = false,
}) => {
  const curveMultiplier = depth === 0 ? 1.95 : depth === 1 ? 1.55 : 1.08;
  const bendStrength =
    length *
    (0.06 + random() * 0.12) *
    curveMultiplier *
    (random() > 0.5 ? 1 : -1);
  const controlAngle = angle + Math.PI / 2;
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  const normalAngle = angle + Math.PI / 2;
  const wobbleAmplitude =
    length *
    (depth === 0 ? 0.022 : depth === 1 ? 0.014 : 0.008) *
    (0.8 + random() * 0.5);

  return {
    startX: x,
    startY: y,
    endX,
    endY,
    controlX:
      x +
      Math.cos(angle) * length * (0.38 + random() * 0.18) +
      Math.cos(controlAngle) * bendStrength,
    controlY:
      y +
      Math.sin(angle) * length * (0.38 + random() * 0.18) +
      Math.sin(controlAngle) * bendStrength,
    length,
    width,
    depth,
    alpha,
    normalAngle,
    wobbleAmplitude,
    wobbleFrequency: (1.8 + random() * 1.6) * Math.PI,
    wobblePhase: random() * Math.PI * 2,
    progress: 0,
    elapsedMs: 0,
    durationMs:
      durationMs ||
      clamp(
        length *
          (isPrimary ? 18 : depth === 0 ? 15 : depth <= 2 ? 11 : depth <= 4 ? 8 : 6),
        isPrimary ? 3000 : depth === 0 ? 800 : 350,
        isPrimary ? 5000 : depth === 0 ? 2200 : 1600
      ),
    spawned: false,
    startAt,
    isPrimary,
    allowTiny,
    random,
  };
};

const drawBranchSegment = (
  ctx,
  branch,
  fromProgress,
  toProgress,
  palette,
  getVisibility
) => {
  const segmentLength = Math.max(toProgress - fromProgress, 0.01);
  const steps = Math.max(2, Math.ceil(segmentLength * 26));
  const midpoint = fromProgress + (toProgress - fromProgress) * 0.5;
  const widthBoost = branch.isPrimary ? 1.22 : 1;
  const mainWidth = Math.max(
    0.11,
    branch.width * widthBoost * (1 - midpoint * 0.45)
  );
  const samplePoint = getPointOnQuadratic(branch, midpoint);
  const visibility = getVisibility(samplePoint.x, samplePoint.y);

  if (visibility <= 0.015) {
    return;
  }

  ctx.save();
  ctx.beginPath();

  for (let step = 0; step <= steps; step += 1) {
    const progress = fromProgress + (segmentLength * step) / steps;
    const point = getPointOnQuadratic(branch, progress);

    if (step === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.haze(branch.alpha * visibility);
  ctx.lineWidth = mainWidth * 2.3;
  ctx.stroke();

  ctx.beginPath();

  for (let step = 0; step <= steps; step += 1) {
    const progress = fromProgress + (segmentLength * step) / steps;
    const point = getPointOnQuadratic(branch, progress);

    if (step === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }

  ctx.shadowBlur = palette.shadowBlur;
  ctx.shadowColor = palette.shadow(branch.alpha * visibility);
  ctx.strokeStyle = palette.core(branch.alpha * visibility);
  ctx.lineWidth = mainWidth;
  ctx.stroke();
  ctx.restore();
};

const spawnChildren = (branch, random, budget, currentTimeMs) => {
  if (
    branch.depth >= MAX_DEPTH ||
    branch.length <= MIN_LENGTH ||
    budget.count >= MAX_BRANCHES
  ) {
    return [];
  }

  const tip = getPointOnQuadratic(branch, 1);
  const baseAngle = Math.atan2(
    branch.endY - branch.startY,
    branch.endX - branch.startX
  );
  const children = [];
  const continuationChance = Math.max(0.48, 0.95 - branch.depth * 0.07);

  if (random() < continuationChance) {
    children.push(
      createBranch({
        x: tip.x,
        y: tip.y,
        angle: baseAngle + (random() - 0.5) * 0.22,
        length: branch.length * (0.76 + random() * 0.12),
        width: branch.width * (0.78 + random() * 0.08),
        depth: branch.depth + 1,
        alpha: branch.alpha * 0.96,
        random,
        startAt: currentTimeMs + 160 + random() * 220 + branch.depth * 40,
      })
    );
  }

  let twigCount = 0;

  if (branch.depth <= 1) {
    twigCount = 2 + (random() > 0.55 ? 1 : 0);
  } else if (branch.depth <= 4) {
    twigCount = 1 + (random() > 0.2 ? 1 : 0) + (random() > 0.86 ? 1 : 0);
  } else if (branch.depth <= 6) {
    // 增加中层树枝密度
    twigCount = 1 + (random() > 0.3 ? 1 : 0) + (random() > 0.7 ? 1 : 0);
  } else if (random() > 0.3) {
    // 增加末梢树枝密度
    twigCount = 1 + (random() > 0.6 ? 1 : 0) + (random() > 0.85 ? 1 : 0);
  }

  for (let index = 0; index < twigCount; index += 1) {
    const direction = index % 2 === 0 ? -1 : 1;
    const angleOffset =
      direction * (0.18 + random() * 0.46) + (random() - 0.5) * 0.14;
    const anchor = getPointOnQuadratic(branch, 0.34 + random() * 0.5);

    children.push(
      createBranch({
        x: anchor.x,
        y: anchor.y,
        angle: baseAngle + angleOffset,
        length: branch.length * (0.48 + random() * 0.22),
        width: branch.width * (0.58 + random() * 0.12),
        depth: branch.depth + 1,
        alpha: branch.alpha * 0.9,
        random,
        startAt:
          currentTimeMs + 240 + index * 140 + random() * 180 + branch.depth * 35,
      })
    );
  }

  if (branch.depth >= 5 && branch.length > MIN_LENGTH * 1.15) {
    const tipTwigCount =
      3 + (random() > 0.35 ? 1 : 0) + (random() > 0.65 ? 1 : 0) + (random() > 0.85 ? 1 : 0);

    for (let index = 0; index < tipTwigCount; index += 1) {
      const direction = index % 2 === 0 ? -1 : 1;
      const tipAngleOffset =
        direction * (0.14 + random() * 0.26) + (random() - 0.5) * 0.1;
      const tipAnchor = getPointOnQuadratic(branch, 0.74 + random() * 0.2);

      children.push(
        createBranch({
          x: tipAnchor.x,
          y: tipAnchor.y,
          angle: baseAngle + tipAngleOffset,
          length: branch.length * (0.16 + random() * 0.14),
          width: branch.width * (0.18 + random() * 0.07),
          depth: branch.depth + 1,
          alpha: branch.alpha * 0.82,
          random,
          startAt: currentTimeMs + 320 + index * 110 + random() * 160,
          durationMs: clamp(branch.length * (3.4 + random() * 1.6), 180, 520),
          allowTiny: true,
        })
      );
    }
  }

  const filteredChildren = children.filter(
    (child) =>
      child.allowTiny
        ? child.length > MIN_LENGTH * 0.24
        : child.length > MIN_LENGTH * 0.72
  );

  budget.count += filteredChildren.length;
  return filteredChildren;
};

const createClusterRoots = (preset, width, height, random) => {
  const shortestSide = Math.min(width, height);
  const baseLength = Math.min(
    width * preset.lengthFactor,
    shortestSide * preset.maxLengthScale
  );
  const roots = [
    createBranch({
      x: width * preset.x,
      y: height * preset.y,
      angle: preset.angle + (random() - 0.5) * preset.angleJitter,
      length: baseLength * (0.94 + random() * 0.18),
      width: preset.width * (0.92 + random() * 0.18),
      depth: 0,
      alpha: preset.alpha,
      random,
      startAt: preset.startAt + random() * 80,
      durationMs: preset.isPrimary ? 2600 + random() * 420 : undefined,
      isPrimary: preset.isPrimary,
    }),
  ];

  if (random() < preset.companionChance) {
    roots.push(
      createBranch({
        x: width * (preset.x + preset.companionXOffset),
        y: height * (preset.y + preset.companionYOffset),
        angle:
          preset.angle +
          preset.companionAngleOffset +
          (random() - 0.5) * preset.angleJitter,
        length: baseLength * (0.48 + random() * 0.18),
        width: preset.width * 0.52,
        depth: 1,
        alpha: preset.alpha * 0.86,
        random,
        startAt: preset.startAt + 240 + random() * 180,
      })
    );
  }

  return roots;
};

const CLUSTER_PRESETS = [
  {
    id: 'left-lower',
    x: -0.045,
    y: 0.68,
    angle: -0.2,
    angleJitter: 0.2,
    lengthFactor: 0.22,
    maxLengthScale: 0.38,
    width: 0.85,
    alpha: 1,
    isPrimary: true,
    startAt: 120,
    companionChance: 0.92,
    companionXOffset: -0.008,
    companionYOffset: -0.06,
    companionAngleOffset: -0.34,
  },
  {
    id: 'left-middle',
    x: -0.032,
    y: 0.48,
    angle: 0.02,
    angleJitter: 0.18,
    lengthFactor: 0.18,
    maxLengthScale: 0.32,
    width: 0.7,
    alpha: 0.86,
    startAt: 3200,
    companionChance: 0.74,
    companionXOffset: -0.006,
    companionYOffset: 0.045,
    companionAngleOffset: 0.28,
  },
  {
    id: 'left-upper',
    x: -0.02,
    y: 0.22,
    angle: 0.48,
    angleJitter: 0.24,
    lengthFactor: 0.13,
    maxLengthScale: 0.24,
    width: 0.48,
    alpha: 0.7,
    startAt: 6000,
    companionChance: 0.42,
    companionXOffset: -0.004,
    companionYOffset: 0.04,
    companionAngleOffset: 0.24,
  },
  {
    id: 'right-upper',
    x: 1.024,
    y: 0.18,
    angle: Math.PI - 0.34,
    angleJitter: 0.16,
    lengthFactor: 0.13,
    maxLengthScale: 0.24,
    width: 0.48,
    alpha: 0.76,
    isPrimary: true,
    startAt: 1800,
    companionChance: 0.72,
    companionXOffset: 0.006,
    companionYOffset: 0.04,
    companionAngleOffset: 0.24,
  },
  {
    id: 'right-middle',
    x: 1.028,
    y: 0.42,
    angle: Math.PI - 0.12,
    angleJitter: 0.18,
    lengthFactor: 0.18,
    maxLengthScale: 0.32,
    width: 0.7,
    alpha: 0.66,
    isPrimary: true,
    startAt: 4700,
    companionChance: 0.62,
    companionXOffset: 0.006,
    companionYOffset: 0.03,
    companionAngleOffset: 0.22,
  },
  {
    id: 'right-lower',
    x: 1.022,
    y: 0.63,
    angle: Math.PI + 0.08,
    angleJitter: 0.18,
    lengthFactor: 0.22,
    maxLengthScale: 0.38,
    width: 0.85,
    alpha: 0.52,
    isPrimary: true,
    startAt: 7600,
    companionChance: 0.38,
    companionXOffset: 0.004,
    companionYOffset: -0.04,
    companionAngleOffset: -0.24,
  },
];

export default function GrowingTreeCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return undefined;
    }

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrameId = 0;
    let resizeTimeoutId = 0;
    let growingBranches = [];
    let pendingBranches = [];
    let budget = { count: 0 };
    let lastTimestamp = 0;
    let currentTimeMs = 0;
    let primaryGrowthDone = false;
    let initialRenderDone = false;
    const MAX_PARALLEL_GROWTH = 5;

    const getStrokePalette = () => {
      const isDark = document.documentElement.classList.contains('dark');

      if (isDark) {
        return {
          core: (alpha = 1) => `rgba(248, 243, 236, ${0.23 * alpha})`,
          haze: (alpha = 1) => `rgba(255, 255, 255, ${0.075 * alpha})`,
          shadow: (alpha = 1) => `rgba(255, 248, 238, ${0.14 * alpha})`,
          shadowBlur: 3.1,
          mixBlendMode: 'screen',
          opacity: '1',
        };
      }

      return {
        core: (alpha = 1) => `rgba(28, 22, 18, ${0.145 * alpha})`,
        haze: (alpha = 1) => `rgba(44, 34, 26, ${0.048 * alpha})`,
        shadow: (alpha = 1) => `rgba(24, 18, 14, ${0.072 * alpha})`,
        shadowBlur: 2.1,
        mixBlendMode: 'multiply',
        opacity: '1',
      };
    };

    const getVisibility = (x, y) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const xRatio = x / width;
      const yRatio = y / height;
      const leftVisibility =
        xRatio <= 0.24
          ? 1
          : xRatio <= 0.46
            ? 1 - (xRatio - 0.24) / 0.22
            : 0;
      const rightVisibility =
        xRatio >= 0.9
          ? 1
          : xRatio >= 0.72
            ? (xRatio - 0.72) / 0.18
            : 0;
      const edgeVisibility = Math.max(leftVisibility, rightVisibility);
      const verticalFade =
        yRatio < 0.08
          ? yRatio / 0.08
          : yRatio > 0.94
            ? (1 - yRatio) / 0.06
            : 1;

      return clamp(edgeVisibility * clamp(verticalFade, 0, 1), 0, 1);
    };

    const buildInitialBranches = (width, height, random) => {
      const usedIds = new Set();
      const clusters = [];
      const leftPresets = CLUSTER_PRESETS.filter((preset) =>
        ['left-lower', 'left-middle', 'left-upper'].includes(preset.id)
      );
      const rightPresets = CLUSTER_PRESETS.filter((preset) =>
        ['right-upper', 'right-middle', 'right-lower'].includes(preset.id)
      );
      const clusterCount = Math.min(MAX_CLUSTERS, 2 + (random() > 0.7 ? 1 : 0));

      // 随机选择从左侧还是右侧开始
      const startFromLeft = random() > 0.5;
      const primaryPool = startFromLeft ? leftPresets : rightPresets;
      const secondaryPool = startFromLeft ? rightPresets : leftPresets;

      // 选择主要的起始树枝
      const firstPreset = pickUniquePreset(primaryPool, usedIds, random);

      if (firstPreset) {
        usedIds.add(firstPreset.id);
        clusters.push(firstPreset);
      }

      // 从另一侧选择次要树枝
      const secondPreset = pickUniquePreset(secondaryPool, usedIds, random);

      if (secondPreset && clusters.length < clusterCount) {
        usedIds.add(secondPreset.id);
        clusters.push(secondPreset);
      }

      // 如果还需要更多，从所有剩余的选择
      while (clusters.length < clusterCount) {
        const preset = pickUniquePreset(CLUSTER_PRESETS, usedIds, random);

        if (!preset) {
          break;
        }

        usedIds.add(preset.id);
        clusters.push(preset);
      }

      return clusters
        .sort((firstPreset, secondPreset) => firstPreset.startAt - secondPreset.startAt)
        .flatMap((preset) =>
        createClusterRoots(preset, width, height, random)
        );
    };

    const stopAnimation = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    const enqueueBranches = (branches) => {
      pendingBranches.push(...branches);
      pendingBranches.sort((firstBranch, secondBranch) => firstBranch.startAt - secondBranch.startAt);
    };

    const drawFrame = (timestamp) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      const deltaMs = Math.min(timestamp - lastTimestamp, 48);
      lastTimestamp = timestamp;
      currentTimeMs += deltaMs;
      const palette = getStrokePalette();
      const nextGrowingBranches = [];

      while (
        pendingBranches.length > 0 &&
        pendingBranches[0].startAt <= currentTimeMs &&
        (primaryGrowthDone || pendingBranches[0].isPrimary) &&
        growingBranches.length + nextGrowingBranches.length < MAX_PARALLEL_GROWTH
      ) {
        nextGrowingBranches.push(pendingBranches.shift());
      }

      growingBranches.forEach((branch) => {
        const previousProgress = branch.progress;
        branch.elapsedMs = Math.min(branch.durationMs, branch.elapsedMs + deltaMs);

        // 使用缓动函数：开始慢，后面加快（ease-in）
        const linearProgress = branch.elapsedMs / branch.durationMs;
        branch.progress = Math.min(1, linearProgress * linearProgress);

        drawBranchSegment(
          context,
          branch,
          previousProgress,
          branch.progress,
          palette,
          getVisibility
        );

        if (branch.progress < 1) {
          nextGrowingBranches.push(branch);
          return;
        }

        if (!branch.spawned) {
          branch.spawned = true;

          if (branch.isPrimary) {
            primaryGrowthDone = true;
          }

          enqueueBranches(
            spawnChildren(branch, branch.random, budget, currentTimeMs)
          );
        }
      });

      growingBranches = nextGrowingBranches;

      if (growingBranches.length > 0 || pendingBranches.length > 0) {
        animationFrameId = window.requestAnimationFrame(drawFrame);
      }
    };

    const paintFinalTree = () => {
      const pending = [...pendingBranches];
      const palette = getStrokePalette();

      while (pending.length > 0) {
        const branch = pending.shift();

        drawBranchSegment(context, branch, 0, 1, palette, getVisibility);
        pending.push(...spawnChildren(branch, branch.random, budget, branch.startAt));
      }
    };

    const renderTree = () => {
      stopAnimation();
      lastTimestamp = 0;
      currentTimeMs = 0;
      primaryGrowthDone = false;
      budget = { count: 0 };
      growingBranches = [];
      pendingBranches = [];

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const shouldRender = viewportWidth >= MIN_DESKTOP_WIDTH;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(viewportWidth * dpr);
      canvas.height = Math.floor(viewportHeight * dpr);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, viewportWidth, viewportHeight);

      if (!shouldRender) {
        canvas.style.opacity = '0';
        return;
      }

      const palette = getStrokePalette();
      canvas.style.mixBlendMode = palette.mixBlendMode;
      canvas.style.opacity = palette.opacity;

      const seed = (Math.random() * 0xffffffff) >>> 0;
      const random = mulberry32(seed);
      pendingBranches = buildInitialBranches(viewportWidth, viewportHeight, random);
      budget.count = pendingBranches.length;

      // 强制启用动画效果，忽略 prefers-reduced-motion
      // if (reduceMotionQuery.matches) {
      //   paintFinalTree();
      //   return;
      // }

      animationFrameId = window.requestAnimationFrame(drawFrame);
    };

    const scheduleRender = () => {
      window.clearTimeout(resizeTimeoutId);
      resizeTimeoutId = window.setTimeout(renderTree, 100);
    };

    // 延迟初始渲染，等待页面主要内容加载完成
    const initRender = () => {
      if (initialRenderDone) return;
      initialRenderDone = true;
      renderTree();
    };

    // 使用 requestIdleCallback 在浏览器空闲时渲染，如果不支持则延迟 500ms
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(initRender, { timeout: 1000 });
    } else {
      setTimeout(initRender, 500);
    }

    const classObserver = new MutationObserver(() => {
      scheduleRender();
    });

    classObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const handleReduceMotionChange = () => {
      if (initialRenderDone) {
        scheduleRender();
      }
    };

    reduceMotionQuery.addEventListener('change', handleReduceMotionChange);
    window.addEventListener('resize', () => {
      if (initialRenderDone) {
        scheduleRender();
      }
    });

    return () => {
      stopAnimation();
      window.clearTimeout(resizeTimeoutId);
      reduceMotionQuery.removeEventListener('change', handleReduceMotionChange);
      window.removeEventListener('resize', scheduleRender);
      classObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-1 opacity-100 transition-opacity duration-700 xl:block"
      style={{
        filter: 'blur(0.12px)',
      }}
    />
  );
}
