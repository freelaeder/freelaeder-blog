import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout, { GradientBackground } from '../components/Layout';
import SEO from '../components/SEO';
import { featuredProjects } from '../utils/featured-projects';
import { getGlobalData } from '../utils/global-data';

function ProjectFeature({ project, index }) {
  return (
    <article
      className="animate-fade-up border-t border-black/8 pt-8 dark:border-white/10 sm:pt-10"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] tracking-[0.18em] text-neutral-500 uppercase dark:text-white/42">
          <span>{project.eyebrow}</span>
          <span aria-hidden="true">·</span>
          <span>{project.year}</span>
          <span aria-hidden="true">·</span>
          <span>{project.category}</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <a href={project.url} target="_blank" rel="noreferrer" className="project-link">
            Visit live site
          </a>
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="project-link"
          >
            Repository
          </a>
        </div>
      </div>

      <h2 className="mt-4 text-[2rem] leading-[0.98] text-neutral-950 dark:text-white sm:text-[2.8rem]">
        {project.title}
      </h2>
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.72rem] leading-6 tracking-[0.12em] text-neutral-500 uppercase dark:text-white/42">
        <span>{project.role}</span>
        <span aria-hidden="true">·</span>
        {project.metrics.map((metric) => (
          <span key={metric.label}>{metric.value}</span>
        ))}
        <span aria-hidden="true">·</span>
        {project.featureTags.map((feature) => (
          <span key={feature}>{feature}</span>
        ))}
        <span aria-hidden="true">·</span>
        {project.stack.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="mt-6 border-t border-black/8 dark:border-white/10" />

    </article>
  );
}

export default function Projects({ globalData }) {
  return (
    <Layout contentClassName="max-w-[980px]">
      <SEO
        title={`Projects | ${globalData.name}`}
        description="A curated selection of web work and production-facing frontend builds."
      />
      <Header name={globalData.name} />

      <main className="mx-auto w-full max-w-[780px] pb-8 pt-4 sm:pt-8">
        <section className="animate-fade-up text-center">
          <p className="section-kicker mx-auto w-fit">Selected work</p>
          <h1 className="mt-5 text-[clamp(2.6rem,8vw,4.6rem)] leading-[0.94]">
            Projects
          </h1>
        </section>

        <section className="mt-14 space-y-2 sm:mt-20">
          {featuredProjects.map((project, index) => (
            <ProjectFeature key={project.id} index={index} project={project} />
          ))}
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
  const globalData = getGlobalData();

  return { props: { globalData } };
}
