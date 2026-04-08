export default function Footer({ copyrightText }) {
  return (
    <footer className="py-12 md:py-16">
      <div className="glass-panel flex flex-col items-center justify-between gap-4 rounded-[1.5rem] px-5 py-5 text-center md:flex-row md:px-6 md:text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-62">
          {copyrightText}
        </p>
        <span className="tech-pill px-3 py-1">Field Notes</span>
      </div>
    </footer>
  );
}
