import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, BookOpen, Loader2 } from 'lucide-react';
import axios from 'axios';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates, PAGE_META } from '../components/SEO';

interface Article {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishDate: string;
  readingTime: string;
  author?: string;
}

interface Category {
  id: string;
  name: string;
  count: number;
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

const TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'souverainete', label: 'Souveraineté' },
  { id: 'medical', label: 'Médical' },
  { id: 'juridique', label: 'Juridique' },
  { id: 'business', label: 'Business' },
  { id: 'education', label: 'Éducation' },
  { id: 'technique', label: 'Technique' },
  { id: 'comparatif', label: 'Comparatif' },
  { id: 'grand-public', label: 'Grand Public' },
];

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

function BlogList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/blog/articles'),
      axios.get('/api/blog/categories').catch(() => ({ data: [] })),
    ])
      .then(([articlesRes]) => {
        setArticles(articlesRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === 'all'
    ? articles
    : articles.filter(a => a.category === activeTab);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog' },
    ],
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blog ClearRecap',
    description: PAGE_META.blog.description,
    url: getCanonical('/blog'),
    isPartOf: { '@type': 'WebSite', name: 'ClearRecap', url: 'https://clearrecap.com/' },
    ...(articles.length > 0 && {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: articles.length,
        itemListElement: articles.slice(0, 10).map((a, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://clearrecap.com/blog/${a.slug}`,
          name: a.title,
        })),
      },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* SEO */}
      <MetaTags
        title={PAGE_META.blog.title}
        description={PAGE_META.blog.description}
        canonical={getCanonical('/blog')}
        hreflangAlternates={getHreflangAlternates('/blog')}
      />
      <StructuredData data={[breadcrumbSchema, collectionSchema]} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/" className="text-slate-400 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Blog ClearRecap
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Guides, analyses et bonnes pratiques autour de la transcription et du traitement audio.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="ml-2 text-slate-500 text-sm">Chargement des articles...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Aucun article dans cette catégorie.</p>
        </div>
      )}

      {/* Articles grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article, i) => {
            const colors = CATEGORY_COLORS[article.category] || { bg: 'bg-slate-100', text: 'text-slate-700' };
            return (
              <motion.div
                key={article.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/blog/${article.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-indigo-200 transition-all group h-full flex flex-col"
                >
                  {/* Category badge */}
                  <span className={`inline-block self-start px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} mb-3`}>
                    {article.category}
                  </span>

                  {/* Title */}
                  <h2 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                    {article.title}
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                    {article.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-auto">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(article.publishDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {article.readingTime}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default BlogList;
