import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

const getKey = (url) => `scroll-position:${url}`;
const getScrollContainer = () =>
  document.getElementById('page-scroll-container');

export default function ScrollRestoration() {
  const router = useRouter();
  const shouldRestoreRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) {
      return undefined;
    }

    window.history.scrollRestoration = 'manual';

    const saveScrollPosition = (url = router.asPath) => {
      const scrollContainer = getScrollContainer();
      const position = scrollContainer
        ? { x: scrollContainer.scrollLeft, y: scrollContainer.scrollTop }
        : { x: window.scrollX, y: window.scrollY };

      sessionStorage.setItem(
        getKey(url),
        JSON.stringify(position)
      );
    };

    const restoreScrollPosition = (url = router.asPath) => {
      const rawValue = sessionStorage.getItem(getKey(url));
      const scrollContainer = getScrollContainer();

      const scrollToPosition = (x, y) => {
        if (scrollContainer) {
          scrollContainer.scrollTo(x, y);
          return;
        }

        window.scrollTo(x, y);
      };

      if (!rawValue) {
        scrollToPosition(0, 0);
        return;
      }

      try {
        const { x, y } = JSON.parse(rawValue);
        window.requestAnimationFrame(() => {
          scrollToPosition(x, y);
        });
      } catch {
        scrollToPosition(0, 0);
      }
    };

    const handleBeforeUnload = () => saveScrollPosition();
    const handleRouteChangeStart = () => saveScrollPosition();
    const handleRouteChangeComplete = (url) => {
      if (shouldRestoreRef.current) {
        shouldRestoreRef.current = false;
        restoreScrollPosition(url);
        return;
      }

      const scrollContainer = getScrollContainer();

      if (scrollContainer) {
        scrollContainer.scrollTo(0, 0);
        return;
      }

      window.scrollTo(0, 0);
    };

    restoreScrollPosition(router.asPath);

    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.beforePopState(() => {
      shouldRestoreRef.current = true;
      return true;
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.beforePopState(() => true);
    };
  }, [router]);

  return null;
}
