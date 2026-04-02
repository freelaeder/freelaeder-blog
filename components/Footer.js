export default function Footer({ copyrightText }) {
  return (
    <footer className="py-16">
      <div className="glass-panel flex flex-col items-center justify-between gap-3 rounded-[1.75rem] px-6 py-5 text-center md:flex-row md:text-left">
        <p className="font-semibold uppercase tracking-[0.22em] opacity-62">
          {copyrightText}
        </p>
        <span className="tech-pill px-3 py-1">Personal Signal</span>
      </div>
    </footer>
  );
}
