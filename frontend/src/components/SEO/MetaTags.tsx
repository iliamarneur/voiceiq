import { Helmet } from 'react-helmet-async';

interface HreflangAlternate {
  lang: string;
  href: string;
}

interface MetaTagsProps {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  ogImage?: string;
  hreflangAlternates?: HreflangAlternate[];
  noindex?: boolean;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
  };
}

const SITE_NAME = 'ClearRecap';
const DEFAULT_OG_IMAGE = 'https://clearrecap.com/og-image.png';

/**
 * Manages <head> meta tags for SEO, Open Graph, Twitter Cards, hreflang and canonical.
 */
export default function MetaTags({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage,
  hreflangAlternates,
  noindex = false,
  article,
}: MetaTagsProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const image = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      {/* Base */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fr_FR" />

      {/* Article-specific OG */}
      {article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {article?.modifiedTime && (
        <meta property="article:modified_time" content={article.modifiedTime} />
      )}
      {article?.author && <meta property="article:author" content={article.author} />}
      {article?.section && <meta property="article:section" content={article.section} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* hreflang alternates */}
      {hreflangAlternates?.map(({ lang, href }) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={href} />
      ))}
    </Helmet>
  );
}
