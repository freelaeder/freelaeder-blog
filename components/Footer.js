export default function Footer({ copyrightText }) {
  return (
    <footer className="flex flex-col items-center py-16">
      <p className="mb-3 font-bold uppercase dark:text-white opacity-60">
        {copyrightText}
      </p>
    </footer>
  );
}
