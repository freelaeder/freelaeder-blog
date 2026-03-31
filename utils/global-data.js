export const getGlobalData = () => {
  const name = process.env.BLOG_NAME
    ? decodeURI(process.env.BLOG_NAME)
    : 'freelaeder';
  const blogTitle = process.env.BLOG_TITLE
    ? decodeURI(process.env.BLOG_TITLE)
    : 'freelaeder';
  const blogDescription = process.env.BLOG_DESCRIPTION
    ? decodeURI(process.env.BLOG_DESCRIPTION)
    : '我打碎了夕阳，散做漫天的星光。';
  const footerText = process.env.BLOG_FOOTER_TEXT
    ? decodeURI(process.env.BLOG_FOOTER_TEXT)
    : 'Since 2020 · freelaeder';

  return {
    name,
    blogTitle,
    blogDescription,
    footerText,
  };
};
