export default function CustomImage({ src, alt, title, ...otherProps }) {
  return (
    <figure className="my-8 overflow-hidden border border-black/10 rounded-3xl bg-white/70 dark:border-white/10 dark:bg-white/5">
      <img
        className="block w-full h-auto"
        src={src}
        alt={alt || ''}
        title={title}
        loading="lazy"
        {...otherProps}
      />
      {title && (
        <figcaption className="px-4 py-3 text-sm opacity-70">
          {title}
        </figcaption>
      )}
    </figure>
  );
}
