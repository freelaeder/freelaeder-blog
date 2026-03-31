import Link from 'next/link';

const isExternalHref = (href = '') =>
  href.startsWith('http://') ||
  href.startsWith('https://') ||
  href.startsWith('mailto:') ||
  href.startsWith('tel:');

export default function CustomLink({ as, href = '', ...otherProps }) {
  if (!href || href.startsWith('#') || isExternalHref(href)) {
    return (
      <a
        href={href}
        {...(isExternalHref(href)
          ? { target: '_blank', rel: 'noreferrer' }
          : {})}
        {...otherProps}
      />
    );
  }

  return <Link as={as} href={href} {...otherProps} />;
}
