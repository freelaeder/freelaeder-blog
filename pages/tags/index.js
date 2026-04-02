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
      <main className="mx-auto w-full max-w-5xl px-2 md:px-0">
        <section className="glass-panel animate-fade-up rounded-[2rem] px-6 py-8 md:px-10 md:py-10">
          <p className="section-kicker mx-auto w-fit">Topic archive</p>
          <h1 className="mb-4 mt-5 text-center text-4xl lg:text-6xl">Tags</h1>
          <p className="mx-auto mb-10 max-w-2xl text-center leading-8 opacity-70">
            所有主题按标签聚合，方便你沿着同一条知识线继续深入。
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}`}
                className="rounded-full border border-black/10 bg-white/[0.52] px-4 py-2 text-sm tracking-[0.16em] backdrop-blur-sm hover:border-primary/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                {tag.name} · {tag.count}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="fixed top-12 opacity-[0.28] dark:opacity-[0.46]"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-[0.16] dark:opacity-[0.12]"
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
