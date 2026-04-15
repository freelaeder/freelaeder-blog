import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout, { GradientBackground } from '../components/Layout';
import SEO from '../components/SEO';
import styles from '../styles/Projects.module.css';
import { featuredProjects } from '../utils/featured-projects';
import { getGlobalData } from '../utils/global-data';

function ProjectFeature({ project }) {
  return (
    <article className={`${styles.projectSheet} glass-panel rounded-[2rem]`}>
      <div className={`${styles.projectFrame} px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8`}>
        <div
          className={`${styles.eyebrowRow} flex flex-col gap-4 border-b border-black/8 pb-6 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between`}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="section-kicker">{project.eyebrow}</span>
            <span className="rounded-full border border-black/8 bg-white/[0.62] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-82 dark:border-white/10 dark:bg-white/[0.05]">
              {project.year}
            </span>
            <span className="rounded-full border border-black/8 bg-white/[0.62] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-82 dark:border-white/10 dark:bg-white/[0.05]">
              {project.category}
            </span>
          </div>

          <div className={styles.actionRow}>
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="project-link"
            >
              Visit live site
            </a>
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryLink}
            >
              Repository
            </a>
          </div>
        </div>

        <div className="mt-6 min-w-0">
          <h2 className="max-w-3xl text-[2rem] leading-[0.96] sm:text-[2.55rem] lg:text-[3rem]">
            {project.title}
          </h2>
          <p className="mt-4 max-w-2xl text-[14px] leading-7 opacity-72 sm:text-[15px]">
            {project.description}
          </p>
        </div>

        <div className={`${styles.compactCard} mt-6`}>
          <div className={styles.metaRow}>
            {project.metrics.map((metric) => (
              <span key={metric.label} className={styles.metaPill}>
                <span className={styles.metaPillLabel}>{metric.label}</span>
                <span>{metric.value}</span>
              </span>
            ))}
          </div>

          <p className={styles.summaryText}>{project.summary}</p>

          <div className={styles.inlineBlock}>
            <p className={styles.blockLabel}>Features</p>
            <div className={styles.featurePills}>
              {project.featureTags.map((feature) => (
                <span key={feature} className={styles.featurePill}>
                  {feature}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.inlineBlock}>
            <p className={styles.blockLabel}>Stack</p>
            <div className={styles.stackPills}>
              {project.stack.map((item) => (
                <span key={item} className="project-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <p className={styles.footnote}>
            {project.role} {project.note}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function Projects({ globalData }) {
  const hasProjects = featuredProjects.length > 0;

  return (
    <Layout contentClassName="max-w-[1360px]">
      <SEO
        title={`Projects | ${globalData.name}`}
        description="A curated selection of web work and production-facing frontend builds."
      />
      <Header name={globalData.name} />
      <main className="pb-14 pt-4 sm:pt-6 md:pb-20">
        <section className="mx-auto max-w-[860px]">
          {hasProjects ? (
            <div className="space-y-6">
              {featuredProjects.map((project, index) => (
                <ProjectFeature key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <article className="glass-panel rounded-[2rem] px-6 py-10 text-center sm:px-8 sm:py-12">
              <p className="section-kicker">Projects</p>
              <h2 className="mt-4 text-[2rem] leading-[1.02] sm:text-[2.4rem]">
                Featured work is being refreshed.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 opacity-72 sm:text-[15px]">
                旧项目数据已经下线，新的案例整理完成后会在这里更新。
              </p>
            </article>
          )}
        </section>
      </main>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="fixed top-4 opacity-[0.22] dark:opacity-[0.38]"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-[0.14] dark:opacity-[0.12]"
      />
    </Layout>
  );
}

export function getStaticProps() {
  const globalData = getGlobalData();

  return { props: { globalData } };
}
