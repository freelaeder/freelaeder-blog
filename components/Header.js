import Link from 'next/link';
import { useEffect, useState } from 'react';

const sunIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    fill="none"
    viewBox="0 0 25 24"
  >
    <g
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12.5 17a5 5 0 100-10 5 5 0 000 10zM12.5 1v2M12.5 21v2M4.72 4.22l1.42 1.42M18.86 18.36l1.42 1.42M1.5 12h2M21.5 12h2M4.72 19.78l1.42-1.42M18.86 5.64l1.42-1.42"></path>
    </g>
  </svg>
);

const moonIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="17"
    height="17"
    fill="none"
    viewBox="0 0 21 20"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19.5 10.79A9 9 0 119.71 1a7 7 0 009.79 9.79v0z"
    ></path>
  </svg>
);

function ThemeSwitcher({ theme, onThemeChange }) {
  const getButtonClassName = (targetTheme) =>
    `flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
      theme === targetTheme
        ? 'bg-black text-white shadow-[0_12px_28px_rgba(29,27,24,0.16)] dark:bg-white dark:text-slate-950'
        : 'text-slate-700/68 hover:bg-black/5 hover:text-slate-950 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white'
    }`;

  return (
    <div className="flex items-center gap-1 rounded-full border border-black/8 bg-white/[0.55] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md dark:border-white/10 dark:bg-white/8 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <button
        type="button"
        aria-label="Use Light Mode"
        onClick={() => onThemeChange('light')}
        className={getButtonClassName('light')}
      >
        {sunIcon}
      </button>
      <button
        type="button"
        aria-label="Use Dark Mode"
        onClick={() => onThemeChange('dark')}
        className={getButtonClassName('dark')}
      >
        {moonIcon}
      </button>
    </div>
  );
}

const getResolvedTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export default function Header({ name }) {
  const [theme, setTheme] = useState('light');
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    setTheme(getResolvedTheme());

    const htmlElement = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(htmlElement.classList.contains('dark') ? 'dark' : 'light');
    });

    observer.observe(htmlElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleCompactStateChange = (event) => {
      setIsCompact(Boolean(event.detail?.isScrolled));
    };

    window.addEventListener('header-compact-state', handleCompactStateChange);

    return () => {
      window.removeEventListener('header-compact-state', handleCompactStateChange);
    };
  }, []);

  const handleThemeChange = (nextTheme) => {
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('theme', nextTheme);
    setTheme(nextTheme);
  };

  return (
    <header className="sticky top-0 z-40 w-full py-3 md:py-4">
      <div className="relative h-[68px] md:h-[72px]">
        <div
          className={`absolute inset-0 transition-all duration-300 ${
            isCompact
              ? 'pointer-events-none -translate-x-14 translate-y-[-10px] scale-[0.86] opacity-0'
              : 'translate-y-0 scale-100 opacity-100'
          }`}
        >
          <div className="glass-panel flex items-center justify-between rounded-[1.6rem] px-3 py-3 sm:px-4 md:rounded-[2rem] md:px-5">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2.5 text-[11px] font-semibold tracking-[0.22em] uppercase dark:text-white sm:gap-3 sm:text-sm"
            >
              <span className="pulse-glow block h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,var(--theme-gradient-1),var(--theme-gradient-2))] sm:h-3 sm:w-3" />
              <span className="truncate">{name}</span>
              <span className="tech-pill hidden px-3 py-1 md:inline-flex">
                Archive
              </span>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <nav className="flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] opacity-72 sm:text-[11px]">
                <Link
                  href="/"
                  className="rounded-full px-2.5 py-2 hover:bg-black/5 dark:hover:bg-white/10 sm:px-3"
                >
                  Home
                </Link>
                <Link
                  href="/tags"
                  className="rounded-full px-2.5 py-2 hover:bg-black/5 dark:hover:bg-white/10 sm:px-3"
                >
                  Tags
                </Link>
              </nav>
              <ThemeSwitcher theme={theme} onThemeChange={handleThemeChange} />
            </div>
          </div>
        </div>

        <div
          className={`absolute left-0 top-0 transition-all duration-300 ${
            isCompact
              ? 'translate-x-0 translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none translate-x-14 translate-y-3 scale-75 opacity-0'
          }`}
        >
          <div className="glass-panel flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full md:h-14 md:w-14">
            <span className="pulse-glow block h-3 w-3 rounded-full bg-[linear-gradient(135deg,var(--theme-gradient-1),var(--theme-gradient-2))] md:h-3.5 md:w-3.5" />
          </div>
        </div>
      </div>
    </header>
  );
}
