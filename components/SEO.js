import Head from 'next/head';

export default function SEO({ title, description, image }) {
  return (
    <Head>
      <title>{title}</title>
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
    </Head>
  );
}
