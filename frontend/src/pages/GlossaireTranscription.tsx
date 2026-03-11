import React, { useState, useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';

/* ─── Types ──────────────────────────────────────────────── */

interface GlossaryEntry {
  term: string;
  slug: string;
  definition: string;
  category: string;
  related?: string[];
  seeAlso?: string;
}

/* ─── Glossary Data ──────────────────────────────────────── */

const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'ASR (Automatic Speech Recognition)',
    slug: 'asr',
    definition: 'La reconnaissance automatique de la parole (ASR) est la technologie qui convertit un signal audio en texte. Les systèmes ASR modernes comme Whisper utilisent des réseaux de neurones (transformers) pour atteindre une précision supérieure à 95 % sur les langues courantes. ClearRecap utilise faster-whisper, une implémentation optimisée de Whisper, pour un traitement 100 % local.',
    category: 'Fondamentaux',
    related: ['whisper', 'faster-whisper', 'wer'],
  },
  {
    term: 'Diarisation',
    slug: 'diarisation',
    definition: 'La diarisation (ou speaker diarization) est le processus qui identifie « qui parle quand » dans un enregistrement audio multi-locuteurs. Elle segmente l\'audio en tours de parole attribués à chaque intervenant. ClearRecap intègre la diarisation automatique pour distinguer jusqu\'à 20 locuteurs simultanés dans une réunion ou une audience.',
    category: 'Fondamentaux',
    related: ['vad', 'segmentation'],
  },
  {
    term: 'Docker',
    slug: 'docker',
    definition: 'Docker est une plateforme de conteneurisation qui permet de packager une application et ses dépendances dans un conteneur isolé. ClearRecap utilise Docker pour son déploiement on-premise : un seul conteneur embarque l\'API FastAPI, faster-whisper et les modèles d\'analyse, garantissant une installation reproductible sur tout serveur Linux avec GPU NVIDIA.',
    category: 'Infrastructure',
    related: ['on-premise', 'gpu'],
  },
  {
    term: 'faster-whisper',
    slug: 'faster-whisper',
    definition: 'faster-whisper est une réimplémentation optimisée du modèle Whisper d\'OpenAI utilisant CTranslate2. Il offre une vitesse de transcription 4× supérieure à l\'implémentation originale avec une consommation mémoire réduite de 50 %, tout en conservant la même qualité de transcription. ClearRecap utilise faster-whisper comme moteur de transcription principal.',
    category: 'Moteurs IA',
    related: ['whisper', 'ctranslate2', 'gpu'],
  },
  {
    term: 'GPU (Graphics Processing Unit)',
    slug: 'gpu',
    definition: 'Un GPU est un processeur spécialisé dans le calcul parallèle, essentiel pour l\'inférence des modèles d\'IA. Pour la transcription audio, un GPU NVIDIA avec CUDA permet un traitement 10 à 50× plus rapide qu\'un CPU. ClearRecap recommande un GPU avec minimum 8 Go de VRAM (ex : RTX 3060) pour le modèle medium, 16 Go pour le modèle large-v3.',
    category: 'Infrastructure',
    related: ['faster-whisper', 'cuda'],
  },
  {
    term: 'Hallucination',
    slug: 'hallucination',
    definition: 'En IA, une hallucination désigne un contenu généré par un modèle qui semble plausible mais est factuellement incorrect ou inventé. Dans le contexte de la transcription, les hallucinations peuvent se manifester par des mots ou phrases ajoutés qui n\'existent pas dans l\'audio original. ClearRecap minimise ce risque en utilisant des modèles spécialisés et un post-traitement de validation.',
    category: 'Concepts IA',
    related: ['wer', 'whisper'],
  },
  {
    term: 'HDS (Hébergement de Données de Santé)',
    slug: 'hds',
    definition: 'La certification HDS (Hébergement de Données de Santé) est obligatoire en France pour tout hébergeur traitant des données de santé à caractère personnel (article L.1111-8 du Code de la santé publique). ClearRecap, déployé on-premise sur les serveurs du client, permet aux établissements de santé de conserver leurs données localement sans recourir à un hébergeur certifié HDS externe.',
    category: 'Conformité',
    related: ['rgpd', 'secnumcloud'],
  },
  {
    term: 'LLM (Large Language Model)',
    slug: 'llm',
    definition: 'Un grand modèle de langage (LLM) est un réseau de neurones entraîné sur de vastes corpus textuels, capable de comprendre et générer du texte. ClearRecap utilise Ollama pour exécuter des LLM localement (Qwen 2.5, Mistral Nemo) afin d\'analyser les transcriptions : résumé, extraction d\'actions, note SOAP, synthèse juridique — le tout sans envoyer de données à l\'extérieur.',
    category: 'Moteurs IA',
    related: ['ollama', 'whisper'],
  },
  {
    term: 'Ollama',
    slug: 'ollama',
    definition: 'Ollama est un outil open-source permettant d\'exécuter des LLM localement sur un serveur ou un poste de travail. Il supporte les modèles quantifiés (GGUF) pour une consommation mémoire optimisée. ClearRecap utilise Ollama pour toutes ses analyses post-transcription : les données restent sur l\'infrastructure du client, garantissant une confidentialité totale.',
    category: 'Moteurs IA',
    related: ['llm', 'gpu'],
  },
  {
    term: 'On-Premise',
    slug: 'on-premise',
    definition: 'Le déploiement on-premise (ou « sur site ») signifie que le logiciel est installé et exécuté sur les serveurs propres de l\'organisation, par opposition au cloud. ClearRecap est conçu pour un déploiement on-premise : aucune donnée ne quitte l\'infrastructure du client. C\'est l\'approche recommandée pour les organisations soumises au RGPD, à la certification HDS ou opérant dans des secteurs sensibles (défense, juridique, santé).',
    category: 'Infrastructure',
    related: ['docker', 'cloud-act'],
  },
  {
    term: 'CLOUD Act',
    slug: 'cloud-act',
    definition: 'Le CLOUD Act (Clarifying Lawful Overseas Use of Data Act, 2018) est une loi américaine qui autorise les autorités US à exiger l\'accès aux données stockées par des entreprises américaines, y compris sur des serveurs situés hors des États-Unis. Cela concerne les solutions cloud comme AWS, Azure, GCP. ClearRecap, déployé on-premise sans composant américain, n\'est pas soumis au CLOUD Act.',
    category: 'Conformité',
    related: ['rgpd', 'on-premise'],
  },
  {
    term: 'CTranslate2',
    slug: 'ctranslate2',
    definition: 'CTranslate2 est une bibliothèque C++ d\'inférence optimisée pour les modèles Transformer. Elle propose la quantification (INT8, FP16) et le batching pour accélérer l\'exécution. faster-whisper s\'appuie sur CTranslate2 pour offrir une transcription 4× plus rapide que l\'implémentation PyTorch originale de Whisper.',
    category: 'Moteurs IA',
    related: ['faster-whisper', 'gpu'],
  },
  {
    term: 'CUDA',
    slug: 'cuda',
    definition: 'CUDA (Compute Unified Device Architecture) est la plateforme de calcul parallèle de NVIDIA. Elle est nécessaire pour accélérer l\'inférence des modèles de transcription et d\'analyse sur GPU. ClearRecap requiert CUDA 11.8+ et les pilotes NVIDIA correspondants pour exploiter l\'accélération GPU.',
    category: 'Infrastructure',
    related: ['gpu', 'faster-whisper'],
  },
  {
    term: 'Note SOAP',
    slug: 'note-soap',
    definition: 'La note SOAP (Subjective, Objective, Assessment, Plan) est un format standardisé de documentation clinique utilisé par les professionnels de santé. ClearRecap génère automatiquement des notes SOAP à partir de transcriptions de consultations médicales grâce au profil d\'analyse « Médical », structurant les informations du patient en 4 sections normalisées.',
    category: 'Profils métier',
    related: ['llm', 'hds'],
  },
  {
    term: 'RGPD',
    slug: 'rgpd',
    definition: 'Le Règlement Général sur la Protection des Données (RGPD, 2018) est le cadre juridique européen régissant la collecte et le traitement des données personnelles. Les articles 44 à 49 encadrent les transferts hors UE. ClearRecap est nativement conforme au RGPD : traitement 100 % local, aucun transfert de données vers des serveurs tiers, pas de sous-traitant cloud.',
    category: 'Conformité',
    related: ['hds', 'cloud-act', 'on-premise'],
  },
  {
    term: 'SecNumCloud',
    slug: 'secnumcloud',
    definition: 'SecNumCloud est un référentiel de l\'ANSSI (Agence Nationale de la Sécurité des Systèmes d\'Information) qui qualifie les prestataires de services cloud de confiance. La version 3.2 renforce les exigences d\'immunité aux lois extraterritoriales. ClearRecap, en tant que solution on-premise, est compatible avec les exigences SecNumCloud car les données ne transitent par aucun cloud.',
    category: 'Conformité',
    related: ['rgpd', 'hds'],
  },
  {
    term: 'Segmentation',
    slug: 'segmentation',
    definition: 'La segmentation audio est le processus de découpage d\'un enregistrement en segments homogènes (parole, silence, musique, bruit). Elle précède la transcription et la diarisation. ClearRecap utilise la segmentation pour optimiser la qualité de transcription en ne traitant que les segments contenant de la parole.',
    category: 'Fondamentaux',
    related: ['vad', 'diarisation'],
  },
  {
    term: 'TCO (Total Cost of Ownership)',
    slug: 'tco',
    definition: 'Le coût total de possession (TCO) inclut tous les coûts directs et indirects liés à l\'utilisation d\'une solution sur une période donnée : licence, infrastructure, maintenance, formation, coûts cachés. Le calculateur TCO de ClearRecap compare le coût d\'une solution cloud (0,12 €/minute) avec le déploiement on-premise sur 1, 3 et 5 ans.',
    category: 'Business',
    related: ['on-premise'],
    seeAlso: '/calculateur-tco',
  },
  {
    term: 'VAD (Voice Activity Detection)',
    slug: 'vad',
    definition: 'La détection d\'activité vocale (VAD) est un algorithme qui détermine si un segment audio contient de la parole humaine ou non. Elle permet de filtrer les silences, la musique et le bruit ambiant avant la transcription, améliorant la précision et réduisant le temps de traitement. ClearRecap utilise Silero VAD pour un filtrage fiable et rapide.',
    category: 'Fondamentaux',
    related: ['segmentation', 'asr'],
  },
  {
    term: 'WER (Word Error Rate)',
    slug: 'wer',
    definition: 'Le taux d\'erreur par mot (WER) est la métrique standard pour évaluer la qualité d\'un système de transcription. Il mesure le pourcentage de mots incorrects (substitutions + insertions + suppressions) par rapport à la référence. Un WER de 5 % signifie 95 % de précision. Whisper large-v3, utilisé par ClearRecap, atteint un WER de 4-6 % sur le français.',
    category: 'Fondamentaux',
    related: ['asr', 'whisper'],
  },
  {
    term: 'Whisper',
    slug: 'whisper',
    definition: 'Whisper est un modèle de reconnaissance vocale open-source développé par OpenAI, entraîné sur 680 000 heures d\'audio multilingue. Il supporte la transcription et la traduction dans plus de 90 langues. ClearRecap utilise Whisper (via faster-whisper) en local, sans envoyer de données aux serveurs d\'OpenAI. Le modèle large-v3 offre la meilleure précision pour le français.',
    category: 'Moteurs IA',
    related: ['faster-whisper', 'asr', 'wer'],
  },
];

const CATEGORIES = [...new Set(GLOSSARY.map(g => g.category))].sort();

/* ─── Schemas ────────────────────────────────────────────── */

const definedTermListSchema = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'Glossaire de la transcription audio par IA',
  description: 'Définitions des termes techniques liés à la transcription automatique, au traitement audio par IA et à la conformité RGPD.',
  url: 'https://clearrecap.com/glossaire-transcription',
  hasDefinedTerm: GLOSSARY.map(entry => ({
    '@type': 'DefinedTerm',
    name: entry.term,
    description: entry.definition.slice(0, 200),
    inDefinedTermSet: 'https://clearrecap.com/glossaire-transcription',
  })),
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'Glossaire Transcription' },
  ],
};

/* ─── Components ─────────────────────────────────────────── */

function Reveal({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function GlossaireTranscription() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    return GLOSSARY.filter(entry => {
      const matchesSearch = !searchQuery ||
        entry.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.definition.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || entry.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title="Glossaire de la Transcription Audio par IA — ClearRecap"
        description="Définitions complètes des termes techniques de la transcription automatique : Whisper, faster-whisper, diarisation, VAD, WER, RGPD, CLOUD Act, Docker, GPU. Ressource de référence pour professionnels et décideurs."
        canonical={getCanonical('/glossaire-transcription')}
        hreflangAlternates={getHreflangAlternates('/glossaire-transcription')}
      />
      <StructuredData data={[definedTermListSchema, breadcrumbSchema]} />

      {/* Header */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-extrabold mb-4">
              Glossaire de la Transcription Audio par IA
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl">
              Ce glossaire définit les termes techniques essentiels de la transcription automatique,
              du traitement audio par intelligence artificielle et de la conformité réglementaire.
              {' '}<strong>{GLOSSARY.length} termes</strong> couvrant {CATEGORIES.length} catégories.
            </p>
            <p className="text-sm text-slate-400 mt-3">
              Dernière mise à jour : mars 2026 — ClearRecap v7
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="px-6 pb-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un terme (ex : Whisper, RGPD, diarisation…)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({GLOSSARY.length})
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Glossary entries */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Aucun terme ne correspond à votre recherche.</p>
            </div>
          )}
          {filtered.map((entry, i) => (
            <Reveal key={entry.slug} delay={i * 0.03}>
              <article
                id={entry.slug}
                className="rounded-xl border border-slate-200 bg-white p-6 hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-lg font-bold text-slate-800">{entry.term}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 flex-shrink-0">
                    {entry.category}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{entry.definition}</p>
                {(entry.related || entry.seeAlso) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    {entry.related && entry.related.length > 0 && (
                      <>
                        <span className="text-slate-400">Voir aussi :</span>
                        {entry.related.map(r => {
                          const target = GLOSSARY.find(g => g.slug === r);
                          return target ? (
                            <a
                              key={r}
                              href={`#${r}`}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {target.term.split(' (')[0]}
                            </a>
                          ) : null;
                        })}
                      </>
                    )}
                    {entry.seeAlso && (
                      <Link
                        to={entry.seeAlso}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Outil interactif
                      </Link>
                    )}
                  </div>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Testez la transcription IA locale
          </h2>
          <p className="text-indigo-100 mb-6">
            ClearRecap utilise ces technologies (Whisper, faster-whisper, Ollama) en local sur votre infrastructure.
            Aucune donnée ne quitte vos serveurs. Essai dès 3 €.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/oneshot"
              className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors"
            >
              Essayer — 3 €
            </Link>
            <Link
              to="/plans"
              className="px-6 py-3 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Voir les offres
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4">
          <Link to="/" className="hover:text-slate-600 transition-colors">Accueil</Link>
          <Link to="/blog" className="hover:text-slate-600 transition-colors">Blog</Link>
          <Link to="/faq" className="hover:text-slate-600 transition-colors">FAQ</Link>
          <Link to="/guide-rgpd-transcription" className="hover:text-slate-600 transition-colors">Guide RGPD</Link>
          <span>ClearRecap — Transcription et analyse audio 100 % locale</span>
        </div>
      </footer>
    </div>
  );
}
