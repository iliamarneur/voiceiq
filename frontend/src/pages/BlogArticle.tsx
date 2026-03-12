import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock, Calendar, User, ChevronDown, ChevronUp, ChevronRight, Loader2, Zap, Tag } from 'lucide-react';
import axios from 'axios';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';

interface ArticleData {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishDate: string;
  date: string;
  readingTime: string;
  author: string;
  content: string;
  tags?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonical?: string;
  lastModified?: string;
  targetKeyword?: string;
  secondaryKeywords?: string[];
}

interface RelatedArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
}

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  souverainete: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  medical: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  juridique: { bg: 'bg-amber-100', text: 'text-amber-700' },
  business: { bg: 'bg-blue-100', text: 'text-blue-700' },
  education: { bg: 'bg-purple-100', text: 'text-purple-700' },
  technique: { bg: 'bg-slate-100', text: 'text-slate-700' },
  comparatif: { bg: 'bg-orange-100', text: 'text-orange-700' },
  'grand-public': { bg: 'bg-pink-100', text: 'text-pink-700' },
};

const CATEGORY_LABELS: Record<string, string> = {
  souverainete: 'Souveraineté',
  medical: 'Médical',
  juridique: 'Juridique',
  business: 'Business',
  education: 'Éducation',
  technique: 'Technique',
  comparatif: 'Comparatif',
  'grand-public': 'Grand Public',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Simple markdown to HTML converter */
function parseMarkdown(md: string): string {
  let html = md;

  // Remove JSON-LD comments from markdown content
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre class="bg-slate-800 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm my-4"><code class="language-${lang}">${code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded text-sm">$1</code>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-4 max-w-full" loading="lazy" />');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 hover:text-indigo-500 underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headings — add ids for TOC anchors
  html = html.replace(/^### (.+)$/gm, (_m, text) => {
    const id = slugify(text.replace(/<[^>]+>/g, ''));
    return `<h3 id="${id}" class="text-lg font-semibold text-slate-800 mt-8 mb-3">${text}</h3>`;
  });
  html = html.replace(/^## (.+)$/gm, (_m, text) => {
    const id = slugify(text.replace(/<[^>]+>/g, ''));
    return `<h2 id="${id}" class="text-xl font-bold text-slate-800 mt-10 mb-4">${text}</h2>`;
  });
  html = html.replace(/^# (.+)$/gm, (_m, text) => {
    const id = slugify(text.replace(/<[^>]+>/g, ''));
    return `<h1 id="${id}" class="text-2xl font-bold text-slate-800 mt-10 mb-4">${text}</h1>`;
  });

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-slate-200 my-8" />');

  // Tables
  html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    // Check if second row is separator (|---|---|)
    const isSep = (r: string) => /^\|[\s\-:|]+\|$/.test(r);
    const hasSep = rows.length >= 2 && isSep(rows[1]);
    const headerRow = rows[0];
    const dataRows = hasSep ? rows.slice(2) : rows.slice(1);
    const parseCells = (row: string) => row.split('|').slice(1, -1).map(c => c.trim());
    const headerCells = parseCells(headerRow);
    let table = '<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse border border-slate-200 rounded-lg">';
    table += '<thead><tr class="bg-slate-50">';
    headerCells.forEach(cell => {
      table += `<th class="px-4 py-2.5 text-left font-semibold text-slate-700 border border-slate-200">${cell}</th>`;
    });
    table += '</tr></thead><tbody>';
    dataRows.forEach((row, i) => {
      const cells = parseCells(row);
      const bg = i % 2 === 0 ? '' : ' class="bg-slate-50/50"';
      table += `<tr${bg}>`;
      cells.forEach(cell => {
        table += `<td class="px-4 py-2 text-slate-600 border border-slate-200">${cell}</td>`;
      });
      table += '</tr>';
    });
    table += '</tbody></table></div>';
    return table;
  });

  // Ordered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-600" value="$1">$2</li>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-600">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
    const tag = match.includes('list-decimal') ? 'ol' : 'ul';
    return `<${tag} class="my-4 space-y-1">${match}</${tag}>`;
  });

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-indigo-300 pl-4 py-1 my-4 text-slate-500 italic">$1</blockquote>');

  // Paragraphs (lines that aren't already wrapped in HTML tags)
  html = html
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return trimmed;
      return `<p class="text-slate-600 leading-relaxed mb-4">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return html;
}

/** Extract TOC entries from raw markdown */
function extractToc(md: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = md.split('\n');
  for (const line of lines) {
    const m2 = line.match(/^## (.+)$/);
    const m3 = line.match(/^### (.+)$/);
    if (m2) {
      const text = m2[1].replace(/\*\*/g, '').replace(/\*/g, '');
      entries.push({ id: slugify(text), text, level: 2 });
    } else if (m3) {
      const text = m3[1].replace(/\*\*/g, '').replace(/\*/g, '');
      entries.push({ id: slugify(text), text, level: 3 });
    }
  }
  return entries;
}

/* ─── Breadcrumbs Component ────────────────────────────── */

function Breadcrumbs({ category, title }: { category: string; title: string }) {
  const categoryLabel = CATEGORY_LABELS[category] || category;

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-slate-400 mb-6 flex-wrap">
      <Link to="/" className="hover:text-slate-600 transition-colors">Accueil</Link>
      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
      <Link to="/blog" className="hover:text-slate-600 transition-colors">Blog</Link>
      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
      <Link to={`/blog?category=${category}`} className="hover:text-slate-600 transition-colors">{categoryLabel}</Link>
      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
      <span className="text-slate-600 truncate max-w-[200px]">{title}</span>
    </nav>
  );
}

/* ─── Inline CTA Component ─────────────────────────────── */

function InlineCTA({ category }: { category: string }) {
  const ctaMap: Record<string, { headline: string; text: string; link: string; label: string }> = {
    medical: {
      headline: 'Transcription médicale 100% locale',
      text: 'Générez des notes SOAP structurées automatiquement. Vos données patient ne quittent jamais votre réseau.',
      link: '/transcription-medicale',
      label: 'Découvrir le profil Médical',
    },
    juridique: {
      headline: 'Transcription juridique confidentielle',
      text: 'Synthèse, obligations, échéances — extraites automatiquement. Secret professionnel garanti.',
      link: '/transcription-juridique',
      label: 'Découvrir le profil Juridique',
    },
    business: {
      headline: 'Comptes rendus de réunion automatiques',
      text: 'Actions, KPIs, risques détectés par l\'IA. Tout reste dans votre réseau.',
      link: '/transcription-reunion',
      label: 'Découvrir le profil Business',
    },
    education: {
      headline: 'Transformez vos cours en supports de révision',
      text: 'Quiz, fiches, carte mentale — générés automatiquement depuis vos enregistrements.',
      link: '/transcription-education',
      label: 'Découvrir le profil Éducation',
    },
  };

  const cta = ctaMap[category] || {
    headline: 'Essayez ClearRecap',
    text: 'Transcrivez votre premier fichier dès 3€ — sans abonnement, 100% local.',
    link: '/oneshot',
    label: 'Essayer maintenant',
  };

  return (
    <div className="my-10 p-6 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{cta.headline}</h3>
      <p className="text-sm text-slate-500 mb-4">{cta.text}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          to={cta.link}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {cta.label}
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/oneshot"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Transcrire un fichier — 3€
        </Link>
      </div>
    </div>
  );
}

/* ─── Related Articles ─────────────────────────────────── */

function RelatedArticles({ category, currentSlug }: { category: string; currentSlug: string }) {
  const [articles, setArticles] = useState<RelatedArticle[]>([]);

  useEffect(() => {
    axios
      .get(`/api/blog/articles?category=${category}`)
      .then(res => {
        const filtered = (res.data as RelatedArticle[])
          .filter(a => a.slug !== currentSlug)
          .slice(0, 3);
        setArticles(filtered);
      })
      .catch(() => {});
  }, [category, currentSlug]);

  if (articles.length === 0) return null;

  const colors = CATEGORY_COLORS[category] || { bg: 'bg-slate-100', text: 'text-slate-700' };

  return (
    <div className="mt-12 pt-8 border-t border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-5">Articles dans la même catégorie</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {articles.map(a => (
          <Link
            key={a.slug}
            to={`/blog/${a.slug}`}
            className="block p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} mb-2`}>
              {CATEGORY_LABELS[a.category] || a.category}
            </span>
            <h4 className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 text-sm">
              {a.title}
            </h4>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {a.readingTime}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */

function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    axios
      .get(`/api/blog/articles/${slug}`)
      .then(res => setArticle(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const contentHtml = useMemo(() => {
    if (!article?.content) return '';
    return parseMarkdown(article.content);
  }, [article?.content]);

  const toc = useMemo(() => {
    if (!article?.content) return [];
    return extractToc(article.content);
  }, [article?.content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        <span className="ml-2 text-slate-500 text-sm">Chargement...</span>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-500">Article introuvable.</p>
        <Link to="/blog" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
          Retour au blog
        </Link>
      </div>
    );
  }

  const colors = CATEGORY_COLORS[article.category] || { bg: 'bg-slate-100', text: 'text-slate-700' };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.ogTitle || article.title,
    description: article.ogDescription || article.description,
    image: article.ogImage || 'https://clearrecap.com/og-image.png',
    author: { '@type': 'Person', name: article.author || 'ClearRecap' },
    publisher: {
      '@type': 'Organization',
      name: 'ClearRecap',
      logo: { '@type': 'ImageObject', url: 'https://clearrecap.com/logo.png' },
    },
    datePublished: article.publishDate || article.date,
    dateModified: article.lastModified || article.publishDate || article.date,
    mainEntityOfPage: article.canonical || getCanonical(`/blog/${article.slug}`),
    articleSection: CATEGORY_LABELS[article.category] || article.category,
    keywords: article.tags?.join(', '),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://clearrecap.com/blog' },
      { '@type': 'ListItem', position: 3, name: CATEGORY_LABELS[article.category] || article.category, item: `https://clearrecap.com/blog?category=${article.category}` },
      { '@type': 'ListItem', position: 4, name: article.title, item: getCanonical(`/blog/${article.slug}`) },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      {/* SEO */}
      <MetaTags
        title={article.ogTitle || article.title}
        description={article.ogDescription || article.description}
        canonical={article.canonical || getCanonical(`/blog/${article.slug}`)}
        ogType="article"
        ogImage={article.ogImage}
        hreflangAlternates={getHreflangAlternates(`/blog/${article.slug}`)}
        article={{
          publishedTime: article.publishDate || article.date,
          modifiedTime: article.lastModified || article.publishDate || article.date,
          author: article.author || 'ClearRecap',
          section: article.category,
        }}
      />
      <StructuredData data={[articleSchema, breadcrumbSchema]} />

      {/* Breadcrumbs */}
      <Breadcrumbs category={article.category} title={article.title} />

      <div className="lg:flex lg:gap-10">
        {/* Main content */}
        <article className="flex-1 min-w-0">
          {/* Header */}
          <header className="mb-8">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} mb-3`}>
              {CATEGORY_LABELS[article.category] || article.category}
            </span>
            <h1 className="text-3xl font-bold text-slate-800 mb-4 leading-tight">
              {article.title}
            </h1>
            <p className="text-slate-500 text-base mb-4 leading-relaxed">
              {article.description}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {article.author && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {article.author}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(article.publishDate || article.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {article.readingTime}
              </span>
            </div>
            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Mobile TOC */}
          {toc.length > 0 && (
            <div className="lg:hidden mb-8 rounded-lg border border-slate-200 bg-slate-50">
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-slate-700"
              >
                Sommaire ({toc.length} sections)
                {tocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {tocOpen && (
                <nav className="px-4 pb-3 space-y-1" aria-label="Sommaire de l'article">
                  {toc.map(entry => (
                    <a
                      key={entry.id}
                      href={`#${entry.id}`}
                      onClick={() => setTocOpen(false)}
                      className={`block text-sm text-slate-500 hover:text-indigo-600 transition-colors ${
                        entry.level === 3 ? 'pl-4' : ''
                      }`}
                    >
                      {entry.text}
                    </a>
                  ))}
                </nav>
              )}
            </div>
          )}

          {/* Article body */}
          <div
            className="prose-custom max-w-3xl"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* Inline CTA */}
          <InlineCTA category={article.category} />

          {/* Related articles */}
          <RelatedArticles category={article.category} currentSlug={article.slug} />
        </article>

        {/* Desktop TOC sidebar */}
        {toc.length > 0 && (
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-8 space-y-1" aria-label="Sommaire de l'article">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Sommaire
              </p>
              {toc.map(entry => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  className={`block text-sm text-slate-500 hover:text-indigo-600 transition-colors py-0.5 ${
                    entry.level === 3 ? 'pl-3 text-xs' : ''
                  }`}
                >
                  {entry.text}
                </a>
              ))}

              {/* Sidebar CTA */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/oneshot"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Essayer ClearRecap — 3€
                </Link>
              </div>
            </nav>
          </aside>
        )}
      </div>
    </motion.div>
  );
}

export default BlogArticle;
