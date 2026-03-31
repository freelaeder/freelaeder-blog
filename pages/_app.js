import '../styles/globals.css';
import 'prismjs/themes/prism-tomorrow.css';
import ScrollRestoration from '../components/ScrollRestoration';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <span className="theme-bejamas" />
      <ScrollRestoration />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
