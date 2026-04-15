export default function Footer({ copyrightText }) {
  return (
    <footer className="mt-auto pt-16">
      <div className="flex flex-col items-center justify-between gap-3 border-t border-black/8 py-6 text-center text-[0.72rem] tracking-[0.18em] text-neutral-500 uppercase dark:border-white/10 dark:text-white/45 sm:flex-row sm:text-left">
        <p>{copyrightText}</p>
        <p>Quiet archive</p>
      </div>
    </footer>
  );
}
