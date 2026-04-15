import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import 'prismjs/themes/prism-tomorrow.css';
import RouteTransitionOverlay from '../components/RouteTransitionOverlay';
import ScrollRestoration from '../components/ScrollRestoration';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const timerRef = useRef(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  useEffect(() => {
    const handleRouteChangeStart = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setIsRouteLoading(true);
      }, 80);
    };

    const handleRouteChangeEnd = () => {
      window.clearTimeout(timerRef.current);
      setIsRouteLoading(false);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeEnd);
    router.events.on('routeChangeError', handleRouteChangeEnd);

    return () => {
      window.clearTimeout(timerRef.current);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeEnd);
      router.events.off('routeChangeError', handleRouteChangeEnd);
    };
  }, [router.events]);

  return (
    <>
      <span className="theme-bejamas" />
      <ScrollRestoration />
      <Component {...pageProps} />
      <RouteTransitionOverlay isVisible={isRouteLoading} />
    </>
  );
}

export default MyApp;
