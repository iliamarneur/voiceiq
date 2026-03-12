import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Zap, HelpCircle } from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates, PAGE_META } from '../components/SEO';

/* ─── Data ───────────────────────────────────────────────── */

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  label: string;
  items: FAQItem[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: 'general',
    label: 'Général',
    items: [
      {
        question: 'Qu\'est-ce que ClearRecap ?',
        answer: 'ClearRecap est une plateforme de transcription et d\'analyse audio par IA qui fonctionne à 100% en local sur votre infrastructure. Elle transcrit vos fichiers audio et vidéo, puis génère automatiquement des analyses adaptées à votre métier : comptes rendus, notes SOAP, quiz, fiches de révision, et bien plus.',
      },
      {
        question: 'Quelles langues sont supportées ?',
        answer: 'ClearRecap supporte 12 langues : français, anglais, espagnol, allemand, italien, portugais, néerlandais, russe, chinois, japonais, coréen et arabe. La détection automatique de la langue est également disponible.',
      },
      {
        question: 'Quelle est la durée maximale des fichiers audio ?',
        answer: 'ClearRecap traite des fichiers audio et vidéo jusqu\'à 3 heures. Les fichiers plus longs peuvent être découpés en segments.',
      },
      {
        question: 'Quels formats de fichiers sont acceptés ?',
        answer: 'ClearRecap accepte les principaux formats audio (MP3, WAV, FLAC, OGG, M4A, AAC) et vidéo (MP4, AVI, MKV, MOV, WebM). Le fichier est traité localement sans upload vers un serveur distant.',
      },
    ],
  },
  {
    id: 'confidentialite',
    label: 'Confidentialité',
    items: [
      {
        question: 'Mes données sont-elles envoyées dans le cloud ?',
        answer: 'Non. ClearRecap fonctionne à 100% en local sur votre infrastructure. Aucune donnée audio, transcription ou analyse ne quitte votre réseau. C\'est la conformité RGPD par design.',
      },
      {
        question: 'ClearRecap est-il conforme au RGPD ?',
        answer: 'Oui. Le traitement 100% local élimine les problématiques de transfert international de données (articles 44-49 du RGPD). Aucun sous-traitant cloud n\'intervient dans le traitement de vos données.',
      },
      {
        question: 'Qu\'en est-il du CLOUD Act ?',
        answer: 'ClearRecap n\'est pas concerné par le CLOUD Act puisque aucune donnée ne transite par des serveurs américains ou hébergés par des entreprises US. Tout le traitement se fait sur votre infrastructure.',
      },
      {
        question: 'Peut-on utiliser ClearRecap pour des données de santé ?',
        answer: 'Le déploiement 100% local simplifie drastiquement la conformité pour les données de santé. Vos données audio médicales restent sur votre infrastructure, avec chiffrement et contrôle d\'accès granulaire. L\'installation on-premise s\'aligne avec les exigences HDS.',
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Tarifs',
    items: [
      {
        question: 'Peut-on utiliser ClearRecap sans abonnement ?',
        answer: 'Oui. Le mode one-shot permet de transcrire un fichier dès 3€ sans aucun engagement. 6 paliers sont disponibles de 3€ à 18€ selon la durée du fichier.',
      },
      {
        question: 'Quels sont les plans disponibles ?',
        answer: 'Trois plans d\'abonnement : Basic (19€/mois, 500 min), Pro (49€/mois, 3 000 min) et Équipe+ (99€/mois, 10 000 min). Chaque plan inclut toutes les analyses IA. Le plan Pro est recommandé pour les PME.',
      },
      {
        question: 'Y a-t-il une offre entreprise ?',
        answer: 'Oui. L\'offre on-premise permet d\'installer ClearRecap directement sur vos serveurs. Tarification sur devis avec installation, formation, maintenance et minutes illimitées. Aucun abonnement récurrent pour le moteur IA.',
      },
      {
        question: 'Que se passe-t-il si je dépasse mon quota de minutes ?',
        answer: 'Vous pouvez acheter des packs de minutes supplémentaires : 100 min pour 3€, 500 min pour 12€, ou 2 000 min pour 40€. Les minutes supplémentaires n\'expirent pas.',
      },
    ],
  },
  {
    id: 'technique',
    label: 'Technique',
    items: [
      {
        question: 'Quel matériel faut-il pour l\'installation on-premise ?',
        answer: 'Un serveur avec GPU NVIDIA (8 Go VRAM minimum, 16+ Go recommandé), Docker, et 32 Go de RAM. L\'installation se fait via Docker Compose en quelques heures. ClearRecap utilise faster-whisper pour la transcription et Ollama pour les analyses IA.',
      },
      {
        question: 'ClearRecap fonctionne-t-il sans connexion internet ?',
        answer: 'Oui. Une fois installé, ClearRecap fonctionne entièrement hors ligne. L\'IA (Whisper + Ollama) tourne localement, aucune connexion n\'est nécessaire pour transcrire et analyser.',
      },
      {
        question: 'Quelle est la précision de la transcription ?',
        answer: 'ClearRecap utilise Whisper large-v3 (faster-whisper), qui atteint un taux d\'erreur mot (WER) parmi les meilleurs du marché pour le français. La précision dépend de la qualité audio, de l\'accent et du bruit ambiant.',
      },
      {
        question: 'Y a-t-il une API ?',
        answer: 'Oui. ClearRecap expose une API REST complète via FastAPI. Authentification JWT, endpoints de transcription, d\'analyse et d\'export. Documentation disponible dans l\'interface admin.',
      },
    ],
  },
  {
    id: 'profils',
    label: 'Profils métier',
    items: [
      {
        question: 'Quels profils métier sont disponibles ?',
        answer: 'ClearRecap propose 5 profils : Générique (polyvalent), Business (réunions, CR, actions), Éducation (quiz, fiches, carte mentale), Médical (Note SOAP, prescriptions, red flags) et Juridique (synthèse, obligations, échéances).',
      },
      {
        question: 'Peut-on créer des profils personnalisés ?',
        answer: 'Les profils sont définis par des fichiers JSON configurables. Sur l\'installation on-premise, vous pouvez créer des profils sur mesure avec des prompts adaptés à votre métier spécifique.',
      },
      {
        question: 'Les analyses sont-elles fiables pour un usage professionnel ?',
        answer: 'Les analyses IA sont générées comme aide à la rédaction et doivent être relues et validées par le professionnel. ClearRecap accélère considérablement le travail mais ne remplace pas le jugement humain.',
      },
    ],
  },
];

// Build complete FAQ schema from all categories
const ALL_FAQ_ITEMS = FAQ_CATEGORIES.flatMap(cat => cat.items);
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: ALL_FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://clearrecap.com/faq' },
  ],
};

/* ─── Accordion Component ────────────────────────────────── */

function Accordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            aria-expanded={openIndex === i}
          >
            <span className="font-medium text-slate-800 pr-4">{item.question}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`} />
          </button>
          {openIndex === i && (
            <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Page Component ─────────────────────────────────────── */

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState('general');
  const currentCategory = FAQ_CATEGORIES.find(c => c.id === activeCategory) || FAQ_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title={PAGE_META.faq.title}
        description={PAGE_META.faq.description}
        canonical={getCanonical('/faq')}
        hreflangAlternates={getHreflangAlternates('/faq')}
      />
      <StructuredData data={[FAQ_SCHEMA, BREADCRUMB_SCHEMA]} />

      {/* Header */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"
          >
            <HelpCircle className="w-7 h-7 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-extrabold"
          >
            Questions fréquentes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-slate-500 text-lg"
          >
            Tout ce que vous devez savoir sur ClearRecap.
          </motion.p>
        </div>
      </section>

      {/* Category tabs */}
      <div className="px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-8">
            {FAQ_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ content */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <Accordion items={currentCategory.items} />
        </div>
      </section>

      {/* Related links */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-8">En savoir plus</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { to: '/transcription-medicale', label: 'Transcription Médicale', desc: 'Note SOAP, RGPD, confidentialité' },
              { to: '/transcription-juridique', label: 'Transcription Juridique', desc: 'Secret professionnel, obligations' },
              { to: '/transcription-reunion', label: 'Transcription Business', desc: 'CR, actions, KPIs' },
              { to: '/transcription-education', label: 'Transcription Éducation', desc: 'Quiz, fiches, carte mentale' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{link.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Une question non traitée ?</h2>
          <p className="text-slate-500 mb-6">Contactez-nous ou essayez ClearRecap directement.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/oneshot"
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Zap className="w-4 h-4" />
              Essayer pour 3€
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3 rounded-xl font-medium text-slate-600 border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4">
          <Link to="/" className="hover:text-slate-600 transition-colors">Accueil</Link>
          <Link to="/plans" className="hover:text-slate-600 transition-colors">Tarifs</Link>
          <Link to="/blog" className="hover:text-slate-600 transition-colors">Blog</Link>
          <Link to="/glossaire-transcription" className="hover:text-slate-600 transition-colors">Glossaire</Link>
          <Link to="/guide-rgpd-transcription" className="hover:text-slate-600 transition-colors">Guide RGPD</Link>
          <span>ClearRecap — Transcription et analyse audio 100% locale</span>
        </div>
      </footer>
    </div>
  );
}
