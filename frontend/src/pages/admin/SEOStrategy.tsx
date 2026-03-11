import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, Clock, Circle, ChevronDown, ChevronRight,
  BarChart3, Target, TrendingUp, Globe, Shield, FileText,
  ExternalLink, Filter, ArrowUpRight,
} from 'lucide-react';
import seoData from '../../data/seo-checklist.json';

/* ─── Types ──────────────────────────────────────────────── */

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  description: string;
  status: 'done' | 'in-progress' | 'todo';
  page: string;
  priority: string;
  notes: string;
}

type TabId = 'checklist' | 'strategy' | 'keywords' | 'funnel';

/* ─── Constants ──────────────────────────────────────────── */

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'checklist', label: 'Checklist SEO', icon: CheckCircle2 },
  { id: 'strategy', label: 'Clusters & Stratégie', icon: Target },
  { id: 'keywords', label: 'Mots-clés', icon: Search },
  { id: 'funnel', label: 'Funnel Conversion', icon: TrendingUp },
];

const STATUS_CONFIG = {
  done: { label: 'Fait', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  'in-progress': { label: 'En cours', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  todo: { label: 'À faire', icon: Circle, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
};

const PRIORITY_COLORS: Record<string, string> = {
  haute: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  moyenne: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  basse: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const CLUSTERS = [
  {
    name: 'Médical',
    icon: '🏥',
    color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10',
    pillar: '/transcription-medicale',
    articles: ['transcription-medicale-ia-locale', 'note-soap-ia', 'rgpd-donnees-sante'],
    keywords: ['transcription médicale IA', 'note SOAP automatique', 'dictée médicale locale'],
  },
  {
    name: 'Juridique',
    icon: '⚖️',
    color: 'border-amber-400 bg-amber-50 dark:bg-amber-900/10',
    pillar: '/transcription-juridique',
    articles: ['transcription-juridique-souveraine', 'comparatif-transcription-juridique'],
    keywords: ['transcription juridique', 'compte-rendu audience', 'CLOUD Act transcription'],
  },
  {
    name: 'Business',
    icon: '💼',
    color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/10',
    pillar: '/transcription-reunion',
    articles: ['compte-rendu-reunion-ia', 'roi-transcription-entreprise'],
    keywords: ['transcription réunion IA', 'compte-rendu automatique', 'PV réunion automatisé'],
  },
  {
    name: 'Éducation',
    icon: '🎓',
    color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/10',
    pillar: '/transcription-education',
    articles: ['transcription-cours-etudiants', 'ia-education-locale'],
    keywords: ['transcription cours', 'fiche révision IA', 'quiz automatique cours'],
  },
  {
    name: 'Souveraineté',
    icon: '🛡️',
    color: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10',
    pillar: '/',
    articles: ['souverainete-numerique-ia', 'rgpd-transcription', 'cloud-act-risques'],
    keywords: ['IA souveraine', 'transcription locale RGPD', 'alternative cloud souverain'],
  },
  {
    name: 'Technique',
    icon: '⚙️',
    color: 'border-slate-400 bg-slate-50 dark:bg-slate-800',
    pillar: '/comparatif/transcription-cloud-vs-locale',
    articles: ['whisper-local-docker', 'faster-whisper-benchmark', 'ollama-analyse-locale'],
    keywords: ['faster-whisper Docker', 'Whisper local GPU', 'transcription on-premise'],
  },
];

const KEYWORDS_TABLE = [
  { keyword: 'transcription audio IA', volume: '2 400', difficulty: 'Élevée', intent: 'Transactionnel', cluster: 'Global', page: '/' },
  { keyword: 'transcription médicale IA', volume: '880', difficulty: 'Moyenne', intent: 'Transactionnel', cluster: 'Médical', page: '/transcription-medicale' },
  { keyword: 'transcription réunion automatique', volume: '1 300', difficulty: 'Moyenne', intent: 'Transactionnel', cluster: 'Business', page: '/transcription-reunion' },
  { keyword: 'transcription locale RGPD', volume: '480', difficulty: 'Faible', intent: 'Informationnel', cluster: 'Souveraineté', page: '/blog/*' },
  { keyword: 'alternative HappyScribe', volume: '590', difficulty: 'Faible', intent: 'Comparatif', cluster: 'Comparatif', page: '/comparatif/clearrecap-vs-happyscribe' },
  { keyword: 'alternative Otter.ai francais', volume: '320', difficulty: 'Faible', intent: 'Comparatif', cluster: 'Comparatif', page: '/comparatif/clearrecap-vs-otter-ai' },
  { keyword: 'transcription juridique audience', volume: '390', difficulty: 'Faible', intent: 'Transactionnel', cluster: 'Juridique', page: '/transcription-juridique' },
  { keyword: 'note SOAP automatique', volume: '210', difficulty: 'Faible', intent: 'Transactionnel', cluster: 'Médical', page: '/transcription-medicale' },
  { keyword: 'cloud vs on-premise transcription', volume: '260', difficulty: 'Faible', intent: 'Informationnel', cluster: 'Technique', page: '/comparatif/transcription-cloud-vs-locale' },
  { keyword: 'calculateur TCO transcription', volume: '90', difficulty: 'Faible', intent: 'Transactionnel', cluster: 'Business', page: '/calculateur-tco' },
  { keyword: 'transcription cours étudiants', volume: '720', difficulty: 'Moyenne', intent: 'Transactionnel', cluster: 'Éducation', page: '/transcription-education' },
  { keyword: 'faster-whisper Docker GPU', volume: '170', difficulty: 'Faible', intent: 'Informationnel', cluster: 'Technique', page: '/blog/*' },
];

const FUNNEL_STAGES = [
  {
    name: 'Acquisition',
    color: 'bg-indigo-500',
    width: 'w-full',
    metrics: '100%',
    actions: [
      'SEO : 4 landing verticales + 3 comparatifs + 30 articles blog',
      'Hreflang : fr-FR, fr-BE, fr-CH, fr-CA',
      'Schema : SoftwareApplication, FAQPage, Article, Organization',
    ],
  },
  {
    name: 'Activation',
    color: 'bg-blue-500',
    width: 'w-5/6',
    metrics: '~60%',
    actions: [
      'One-shot à 3€ — premier essai sans engagement',
      'ROI Calculator interactif',
      'TCO Calculator Cloud vs On-Premise',
    ],
  },
  {
    name: 'Conversion',
    color: 'bg-purple-500',
    width: 'w-4/6',
    metrics: '~25%',
    actions: [
      'Pricing optimisé avec toggle annuel (-20%)',
      'CTA sticky dans la navbar',
      'Social proof + Trust badges',
    ],
  },
  {
    name: 'Rétention',
    color: 'bg-emerald-500',
    width: 'w-3/6',
    metrics: '~80%',
    actions: [
      'Dashboard avec suivi d\'usage en temps réel',
      'Templates personnalisés par profil métier',
      'Dictionnaires et préréglages sauvegardés',
    ],
  },
  {
    name: 'Expansion',
    color: 'bg-amber-500',
    width: 'w-2/6',
    metrics: '~15%',
    actions: [
      'Upgrade Basic → Pro → Team',
      'Packs minutes supplémentaires',
      'Programme partenaires / affiliation (prévu)',
    ],
  },
];

const CERTIFICATIONS = [
  { name: 'RGPD', status: 'aligned', detail: '100% local, aucun transfert de données' },
  { name: 'HDS 2.0', status: 'ready', detail: 'Architecture compatible, certification à obtenir' },
  { name: 'SecNumCloud 3.2', status: 'ready', detail: 'Déploiement on-premise éligible' },
  { name: 'CLOUD Act', status: 'aligned', detail: 'Non soumis — aucun hébergeur US' },
  { name: 'IA Responsable', status: 'aligned', detail: 'Modèles open-source, traitement local' },
];

/* ─── Main Component ─────────────────────────────────────── */

export default function SEOStrategy() {
  const [activeTab, setActiveTab] = useState<TabId>('checklist');
  const checklist = seoData.seo_checklist as ChecklistItem[];

  const stats = useMemo(() => {
    const total = checklist.length;
    const done = checklist.filter(t => t.status === 'done').length;
    const inProgress = checklist.filter(t => t.status === 'in-progress').length;
    const todo = checklist.filter(t => t.status === 'todo').length;
    const progress = Math.round((done / total) * 100);
    return { total, done, inProgress, todo, progress };
  }, [checklist]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6 text-indigo-500" /> SEO & Stratégie de Conversion
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Suivi de l'implémentation SEO, GEO et CRO de ClearRecap
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="col-span-2 lg:col-span-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-2">Progression globale</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.progress}%</p>
          <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
        <MiniStat label="Total" value={stats.total} color="text-slate-700 dark:text-slate-200" />
        <MiniStat label="Fait" value={stats.done} color="text-emerald-600" />
        <MiniStat label="En cours" value={stats.inProgress} color="text-blue-600" />
        <MiniStat label="À faire" value={stats.todo} color="text-slate-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'checklist' && <ChecklistTab key="checklist" checklist={checklist} />}
        {activeTab === 'strategy' && <StrategyTab key="strategy" />}
        {activeTab === 'keywords' && <KeywordsTab key="keywords" />}
        {activeTab === 'funnel' && <FunnelTab key="funnel" />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Checklist Tab ──────────────────────────────────────── */

function ChecklistTab({ checklist }: { checklist: ChecklistItem[] }) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = [...new Set(checklist.map(t => t.category))];
    return ['all', ...cats.sort()];
  }, [checklist]);

  const filtered = useMemo(() => {
    return checklist.filter(t => {
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      return true;
    });
  }, [checklist, filterCategory, filterStatus]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filtered]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'Toutes les catégories' : c}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          {(['all', 'done', 'in-progress', 'todo'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'Tous' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped table */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              {category}
              <span className="text-xs text-slate-400 font-normal">
                ({items.filter(i => i.status === 'done').length}/{items.length})
              </span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {items.map(item => {
              const cfg = STATUS_CONFIG[item.status];
              const StatusIcon = cfg.icon;
              const isExpanded = expandedId === item.id;

              return (
                <div key={item.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isExpanded ? cfg.bg : ''}`}
                  >
                    <StatusIcon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.task}</p>
                      <p className="text-xs text-slate-400 truncate">{item.description}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${PRIORITY_COLORS[item.priority] || ''}`}>
                      {item.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    }
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-5 py-3 text-sm space-y-1 ${cfg.bg}`}>
                          <p><span className="text-slate-500">Page :</span> <span className="font-medium">{item.page}</span></p>
                          {item.notes && <p><span className="text-slate-500">Notes :</span> {item.notes}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          Aucune tâche ne correspond aux filtres sélectionnés.
        </div>
      )}
    </motion.div>
  );
}

/* ─── Strategy Tab ───────────────────────────────────────── */

function StrategyTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Content Clusters */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" /> Clusters de contenu
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CLUSTERS.map(cluster => (
            <div
              key={cluster.name}
              className={`rounded-xl border-2 p-5 ${cluster.color}`}
            >
              <h3 className="font-bold text-lg mb-1">
                {cluster.icon} {cluster.name}
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Page pilier : <span className="font-medium text-slate-700 dark:text-slate-300">{cluster.pillar}</span>
              </p>

              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Articles satellites</p>
                <div className="flex flex-wrap gap-1">
                  {cluster.articles.map(a => (
                    <span key={a} className="text-xs bg-white/60 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Mots-clés cibles</p>
                <div className="flex flex-wrap gap-1">
                  {cluster.keywords.map(k => (
                    <span key={k} className="text-xs bg-indigo-100/60 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" /> Alignement certifications
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {CERTIFICATIONS.map(cert => (
            <div
              key={cert.name}
              className={`rounded-xl border p-4 ${
                cert.status === 'aligned'
                  ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {cert.status === 'aligned'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <Clock className="w-4 h-4 text-amber-500" />
                }
                <span className="font-bold text-sm">{cert.name}</span>
              </div>
              <p className="text-xs text-slate-500">{cert.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Geographic Targeting */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" /> Ciblage géographique
        </h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Pôle</th>
                <th className="px-4 py-3 font-medium text-slate-500">Secteur clé</th>
                <th className="px-4 py-3 font-medium text-slate-500">URL prévue</th>
                <th className="px-4 py-3 font-medium text-slate-500">Statut</th>
              </tr>
            </thead>
            <tbody>
              {[
                { pole: 'Paris & Île-de-France', sector: 'La Défense, cabinets, institutions', url: '/transcription-paris-ile-de-france' },
                { pole: 'Lyon & Auvergne-Rhône-Alpes', sector: 'Santé (Biopôle), industrie', url: '/transcription-lyon-auvergne-rhone-alpes' },
                { pole: 'Toulouse / Aerospace Valley', sector: 'Aéronautique, défense', url: '/transcription-toulouse-aerospace' },
                { pole: 'Lille / Euratechnologies', sector: 'Numérique, legaltech', url: '/transcription-lille-euratechnologies' },
                { pole: 'Sophia Antipolis', sector: 'R&D, startups IA, télécoms', url: '/transcription-sophia-antipolis' },
              ].map(geo => (
                <tr key={geo.pole} className="border-t border-slate-100 dark:border-slate-700/50">
                  <td className="px-4 py-3 font-medium">{geo.pole}</td>
                  <td className="px-4 py-3 text-slate-500">{geo.sector}</td>
                  <td className="px-4 py-3 text-xs font-mono text-indigo-600 dark:text-indigo-400">{geo.url}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      Phase 7
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Keywords Tab ───────────────────────────────────────── */

function KeywordsTab() {
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'cluster'>('volume');

  const sorted = useMemo(() => {
    return [...KEYWORDS_TABLE].sort((a, b) => {
      if (sortBy === 'volume') {
        return parseInt(b.volume.replace(/\s/g, '')) - parseInt(a.volume.replace(/\s/g, ''));
      }
      if (sortBy === 'difficulty') {
        const order = { 'Faible': 0, 'Moyenne': 1, 'Élevée': 2 };
        return (order[a.difficulty as keyof typeof order] ?? 0) - (order[b.difficulty as keyof typeof order] ?? 0);
      }
      return a.cluster.localeCompare(b.cluster);
    });
  }, [sortBy]);

  const DIFFICULTY_COLORS: Record<string, string> = {
    'Faible': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Moyenne': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Élevée': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const INTENT_COLORS: Record<string, string> = {
    'Transactionnel': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Informationnel': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Comparatif': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-500" /> Mots-clés cibles
        </h2>
        <div className="flex gap-1">
          {(['volume', 'difficulty', 'cluster'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {s === 'volume' ? 'Volume' : s === 'difficulty' ? 'Difficulté' : 'Cluster'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Mot-clé</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Volume</th>
                <th className="px-4 py-3 font-medium text-slate-500">Difficulté</th>
                <th className="px-4 py-3 font-medium text-slate-500">Intention</th>
                <th className="px-4 py-3 font-medium text-slate-500">Cluster</th>
                <th className="px-4 py-3 font-medium text-slate-500">Page cible</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(kw => (
                <tr key={kw.keyword} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium">{kw.keyword}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{kw.volume}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLORS[kw.difficulty] || ''}`}>
                      {kw.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${INTENT_COLORS[kw.intent] || ''}`}>
                      {kw.intent}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{kw.cluster}</td>
                  <td className="px-4 py-3 text-xs font-mono text-indigo-600 dark:text-indigo-400">{kw.page}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Funnel Tab ─────────────────────────────────────────── */

function FunnelTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <h2 className="text-lg font-bold flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-indigo-500" /> Funnel de conversion
      </h2>

      <div className="space-y-4">
        {FUNNEL_STAGES.map((stage, i) => (
          <div key={stage.name} className="flex items-start gap-4">
            {/* Funnel bar */}
            <div className="flex-1">
              <div className={`${stage.width} transition-all`}>
                <div className={`${stage.color} rounded-xl px-5 py-4 text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{stage.name}</h3>
                    <span className="text-sm opacity-80">{stage.metrics}</span>
                  </div>
                  <ul className="space-y-1">
                    {stage.actions.map((action, j) => (
                      <li key={j} className="text-sm opacity-90 flex items-start gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Certifications summary */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" /> Confiance & conformité
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {CERTIFICATIONS.map(c => (
            <div key={c.name} className="flex items-center gap-2 text-sm">
              {c.status === 'aligned'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                : <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              }
              <span className="font-medium">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Shared ─────────────────────────────────────────────── */

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
