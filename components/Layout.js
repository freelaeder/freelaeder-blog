import classNames from 'classnames';
import { useEffect } from 'react';
import GrowingTreeCanvas from './GrowingTreeCanvas';
import ScrollToTopButton from './ScrollToTopButton';
import styles from './Layout.module.css';

export function GradientBackground({ variant, className }) {
  const classes = classNames(
    {
      [styles.colorBackground]: variant === 'large',
      [styles.colorBackgroundBottom]: variant === 'small',
    },
    className
  );

  return <div aria-hidden="true" className={classes} />;
}

export default function Layout({ children, contentClassName = '' }) {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (mediaQuery.matches) {
      document.documentElement.classList.add('dark');
    }

    const handleThemeChange = (event) => {
      if (localStorage.getItem('theme')) {
        return;
      }

      document.documentElement.classList.toggle('dark', event.matches);
    };

    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  return (
    <div
      id="page-scroll-container"
      className="relative h-[100dvh] overflow-y-auto overflow-x-hidden"
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="site-background" />
        <div className="site-noise" />
      </div>
      <GrowingTreeCanvas />
      <div
        className={`relative z-10 mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-5 pb-16 pt-2 sm:px-8 sm:pb-24 lg:px-10 ${contentClassName}`}
      >
        {children}
      </div>
      <ScrollToTopButton />
    </div>
  );
}
