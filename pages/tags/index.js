import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Layout, { GradientBackground } from '../../components/Layout';
import SEO from '../../components/SEO';
import { getGlobalData } from '../../utils/global-data';
import { getAllTags } from '../../utils/tag-utils';

export default function TagsPage({ globalData, tags }) {
  return (
    <Layout>
      <SEO
        title={`Tags - ${globalData.name}`}
        description={globalData.blogDescription}
      />
      <Header name={globalData.name} />
      <main className="w-full max-w-5xl px-2 mx-auto md:px-0">
        <h1 className="mb-4 text-3xl text-center lg:text-5xl">Tags</h1>
        <div className="flex flex-wrap justify-center gap-3">
          {tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/tags/${tag.slug}`}
              className="px-4 py-2 rounded-full border border-black/10 bg-white/50 dark:border-white/10 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10"
            >
              {tag.name} · {tag.count}
            </Link>
          ))}
        </div>
      </main>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="fixed top-20 opacity-40 dark:opacity-60"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-20 dark:opacity-10"
      />
    </Layout>
  );
}

export function getStaticProps() {
  return {
    props: {
      globalData: getGlobalData(),
      tags: getAllTags(),
    },
  };
}
