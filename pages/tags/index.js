import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Layout, { GradientBackground } from '../../components/Layout';
import SEO from '../../components/SEO';
import { getGlobalData } from '../../utils/global-data';
import { getAllTags } from '../../utils/tag-utils';

export default function TagsPage({ globalData, tags }) {
  return (
    <Layout contentClassName="max-w-[980px]">
      <SEO
        title={`Tags - ${globalData.name}`}
        description={globalData.blogDescription}
      />
      <Header name={globalData.name} />

      <main className="mx-auto w-full max-w-[780px] pb-8 pt-4 sm:pt-8">
        <section className="animate-fade-up text-center">
          <p className="section-kicker mx-auto w-fit">Topic archive</p>
          <h1 className="mt-5 text-[clamp(2.6rem,8vw,4.4rem)] leading-[0.94]">
            Tags
          </h1>
        </section>

        <section className="mt-14 border-t border-black/8 pt-8 dark:border-white/10 sm:mt-20 sm:pt-10">
          <div className="flex flex-wrap justify-center gap-2.5">
            {tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}`}
                className="tech-pill hover:border-black/14 hover:text-neutral-900 dark:hover:border-white/16 dark:hover:text-white"
              >
                {tag.name} ({tag.count})
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer copyrightText={globalData.footerText} />
      <GradientBackground variant="large" className="fixed top-0 opacity-80" />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-70"
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
