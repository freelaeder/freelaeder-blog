import { useEffect, useState } from 'react';

const getScrollContainer = () =>
  typeof document === 'undefined'
    ? null
    : document.getElementById('page-scroll-container');

const arrowUpIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 19V5M12 5l-5 5M12 5l5 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scrollContainer = getScrollContainer();

    if (!scrollContainer) {
      return undefined;
    }

    const handleScroll = () => {
      setIsVisible(scrollContainer.scrollTop > 280);
    };

    handleScroll();
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    const scrollContainer = getScrollContainer();

    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={scrollToTop}
      className={`icon-button fixed bottom-5 right-5 z-40 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.28)] transition-all ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      {arrowUpIcon}
    </button>
  );
}
