import classNames from 'classnames';
import { useEffect, useRef } from 'react';
import styles from './Layout.module.css';

export function GradientBackground({ variant, className }) {
  const classes = classNames(
    {
      [styles.colorBackground]: variant === 'large',
      [styles.colorBackgroundBottom]: variant === 'small',
    },
    className
  );

  return <div className={classes} />;
}

export default function Layout({ children, contentClassName = '' }) {
  const backgroundRef = useRef(null);

  const setAppTheme = () => {
    const darkMode = localStorage.getItem('theme') === 'dark';
    const lightMode = localStorage.getItem('theme') === 'light';

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else if (lightMode) {
      document.documentElement.classList.remove('dark');
    }
    return;
  };

  const handleSystemThemeChange = () => {
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    darkQuery.onchange = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    };
  };

  useEffect(() => {
    setAppTheme();
  }, []);

  useEffect(() => {
    handleSystemThemeChange();
  }, []);

  useEffect(() => {
    const backgroundElement = backgroundRef.current;

    if (!backgroundElement) {
      return undefined;
    }

    if (!window.matchMedia('(pointer: fine)').matches) {
      backgroundElement.style.setProperty('--pointer-x', '50%');
      backgroundElement.style.setProperty('--pointer-y', '28%');
      backgroundElement.style.setProperty('--pointer-glow-opacity', '0');
      return undefined;
    }

    let frameId = 0;
    let currentX = 50;
    let currentY = 28;
    let currentOpacity = 0;
    let targetX = 50;
    let targetY = 28;
    let targetOpacity = 0;

    const renderPointerGlow = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      currentOpacity += (targetOpacity - currentOpacity) * 0.1;

      backgroundElement.style.setProperty('--pointer-x', `${currentX}%`);
      backgroundElement.style.setProperty('--pointer-y', `${currentY}%`);
      backgroundElement.style.setProperty(
        '--pointer-glow-opacity',
        `${Math.max(0, Math.min(currentOpacity, 1))}`
      );

      const isSettled =
        Math.abs(currentX - targetX) < 0.1 &&
        Math.abs(currentY - targetY) < 0.1 &&
        Math.abs(currentOpacity - targetOpacity) < 0.02;

      if (!isSettled) {
        frameId = window.requestAnimationFrame(renderPointerGlow);
      } else {
        frameId = 0;
      }
    };

    const queuePointerGlow = () => {
      if (!frameId) {
        frameId = window.requestAnimationFrame(renderPointerGlow);
      }
    };

    const handlePointerMove = (event) => {
      targetX = (event.clientX / window.innerWidth) * 100;
      targetY = (event.clientY / window.innerHeight) * 100;
      targetOpacity = 0.95;
      queuePointerGlow();
    };

    const handlePointerLeave = () => {
      targetOpacity = 0;
      queuePointerGlow();
    };

    backgroundElement.style.setProperty('--pointer-x', `${currentX}%`);
    backgroundElement.style.setProperty('--pointer-y', `${currentY}%`);
    backgroundElement.style.setProperty('--pointer-glow-opacity', '0');

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    window.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <div
      id="page-scroll-container"
      className="relative h-screen overflow-y-auto overflow-x-hidden"
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        <div ref={backgroundRef} className="site-background">
          <div className="site-grid" />
          <div className="site-scan" />
          <div className="site-interaction" />
          <div className="site-glow" />
        </div>
        <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(157,100,72,0.2),transparent)] md:inset-x-10" />
      </div>
      <div
        className={`relative z-10 mx-auto flex min-h-full w-full max-w-[1380px] flex-col px-4 pb-[4.5rem] md:px-8 md:pb-[5.5rem] lg:px-10 lg:pb-24 ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
