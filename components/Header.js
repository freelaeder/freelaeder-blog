import Link from 'next/link';
import { useRouter } from 'next/router';
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
      strokeWidth="1.8"
    >
      <path d="M12.5 17a5 5 0 100-10 5 5 0 000 10zM12.5 1v2M12.5 21v2M4.72 4.22l1.42 1.42M18.86 18.36l1.42 1.42M1.5 12h2M21.5 12h2M4.72 19.78l1.42-1.42M18.86 5.64l1.42-1.42" />
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
      strokeWidth="1.8"
      d="M19.5 10.79A9 9 0 119.71 1a7 7 0 009.79 9.79v0z"
    />
  </svg>
);

const navItems = [
  { href: '/', label: 'Blog' },
  { href: '/projects', label: 'Projects' },
  { href: '/tags', label: 'Tags' },
];

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
  const router = useRouter();
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

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem('theme', nextTheme);
    setTheme(nextTheme);
  };

  return (
    <header
      className={`sticky top-0 z-40 -mx-5 px-5 py-4 backdrop-blur-sm transition-colors sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10 ${
        isCompact
          ? 'bg-[rgba(247,246,242,0.9)] dark:bg-[rgba(16,16,15,0.86)]'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between border-b border-black/8 pb-3 dark:border-white/10">
        <Link
          href="/"
          className="text-[0.8rem] font-semibold tracking-[0.26em] text-neutral-900 uppercase dark:text-white"
        >
          {name}
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <nav className="flex items-center gap-3 text-[0.72rem] tracking-[0.18em] text-neutral-500 uppercase sm:gap-5">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? router.pathname === item.href
                  : router.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-2 py-1.5 ${
                    isActive
                      ? 'bg-black/[0.05] text-neutral-950 dark:bg-white/[0.08] dark:text-white'
                      : 'hover:bg-black/[0.04] hover:text-neutral-900 dark:hover:bg-white/[0.06] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute inset-x-2 bottom-0 h-px origin-left bg-current transition-transform ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            aria-label={theme === 'dark' ? 'Use Light Mode' : 'Use Dark Mode'}
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-transparent text-neutral-600 hover:border-black/14 hover:bg-black/[0.04] hover:text-neutral-950 dark:border-white/10 dark:text-white/65 dark:hover:border-white/16 dark:hover:bg-white/[0.07] dark:hover:text-white"
          >
            {theme === 'dark' ? sunIcon : moonIcon}
          </button>
        </div>
      </div>
    </header>
  );
}
