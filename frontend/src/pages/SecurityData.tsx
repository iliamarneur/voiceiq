import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Shield, Lock, Server, Cloud, Check, X, ArrowRight, Building2,
  Database, Eye, Trash2, FileText, ChevronDown, ChevronUp,
  ArrowLeft, Heart, Scale, Briefcase, Landmark,
} from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';

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

function AccordionItem({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-sm">{question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Schemas ────────────────────────────────────────────── */

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'Sécurité & Confidentialité des Données' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "L'audio est-il conservé par ClearRecap ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Non. L'audio est supprimé immédiatement après traitement. ClearRecap ne conserve jamais vos fichiers audio, ni en mode Cloud ni en mode auto-hébergé.",
      },
    },
    {
      '@type': 'Question',
      name: 'Mes transcriptions peuvent-elles être lues par ClearRecap ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "En mode Cloud, ClearRecap agit comme sous-traitant et un accès technique est possible dans le cadre du DPA. En mode auto-hébergé, ClearRecap n'a strictement aucun accès à vos données.",
      },
    },
    {
      '@type': 'Question',
      name: 'Quels prestataires tiers reçoivent mes données ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "En mode Cloud, le texte uniquement peut être transmis à OpenAI pour l'analyse IA, et Stripe pour le paiement. L'audio brut n'est jamais partagé avec un tiers. En mode auto-hébergé, aucun prestataire tiers n'intervient.",
      },
    },
    {
      '@type': 'Question',
      name: 'Comment supprimer mes données ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Depuis votre compte, vous pouvez supprimer vos transcriptions immédiatement. L'audio est déjà supprimé automatiquement après traitement. La suppression du compte entraîne l'effacement total sous 30 jours.",
      },
    },
    {
      '@type': 'Question',
      name: 'Le mode auto-hébergé nécessite-t-il un GPU ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui, un GPU NVIDIA est recommandé pour des performances optimales de transcription. ClearRecap utilise faster-whisper qui tire parti de l\'accélération GPU CUDA pour des transcriptions rapides et de haute qualité.',
      },
    },
  ],
};

/* ─── Data ───────────────────────────────────────────────── */

const COMPARISON_ROWS = [
  { label: 'Hébergement audio', cloud: 'France (supprimé après traitement)', onprem: 'Chez le client' },
  { label: 'Hébergement texte', cloud: 'France (Hostinger, Paris)', onprem: 'Chez le client' },
  { label: 'Accès ClearRecap aux données', cloud: 'Sous-traitant (DPA)', onprem: 'Aucun accès' },
  { label: 'Transfert hors UE', cloud: 'Texte uniquement (IA externes, SCC)', onprem: 'Aucun' },
  { label: 'Conformité RGPD', cloud: 'Assistée', onprem: 'Totale maîtrise client' },
  { label: 'Conformité HDS', cloud: 'Compatible', onprem: 'Le client gère' },
  { label: 'Mise en place', cloud: 'Immédiate', onprem: 'Installation requise' },
  { label: 'Mises à jour', cloud: 'Automatiques', onprem: 'Manuelles ou assistées' },
];

const SECURITY_COMMITMENTS = [
  {
    icon: Trash2,
    title: 'Audio jamais conservé',
    description: 'Suppression automatique immédiate après traitement. Aucun stockage, aucune copie.',
  },
  {
    icon: Lock,
    title: 'Chiffrement TLS en transit',
    description: 'Toutes les communications sont chiffrées en HTTPS/TLS. Vos données ne circulent jamais en clair.',
  },
  {
    icon: Database,
    title: 'Mots de passe hashés (bcrypt)',
    description: 'Vos mots de passe sont hashés avec bcrypt. Même en cas de fuite, ils restent illisibles.',
  },
  {
    icon: Eye,
    title: 'Aucun tracking publicitaire',
    description: 'Pas de Google Analytics, pas de pixels Facebook, pas de cookies tiers. Votre activité reste privée.',
  },
  {
    icon: Shield,
    title: 'Données non utilisées pour l\'entraînement',
    description: 'Vos transcriptions ne servent jamais à entraîner ou améliorer un modèle IA, ni le nôtre ni celui d\'un tiers.',
  },
  {
    icon: FileText,
    title: 'Suppression totale sous 30 jours',
    description: 'La suppression de votre compte entraîne l\'effacement complet et irréversible de toutes vos données.',
  },
];

const SECTORS = [
  {
    icon: Heart,
    title: 'Santé',
    color: 'text-red-500',
    bgColor: 'bg-red-50 border-red-200',
    description: 'Données patient sur votre infrastructure. Pas de CLOUD Act, pas de sous-traitant cloud à auditer. Compatible HDS en mode auto-hébergé.',
  },
  {
    icon: Scale,
    title: 'Juridique',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    description: 'Secret professionnel garanti en mode auto-hébergé. Aucune donnée client ne quitte votre cabinet. Transcription d\'audiences et d\'entretiens en toute confidentialité.',
  },
  {
    icon: Landmark,
    title: 'Défense & Institutions',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50 border-slate-300',
    description: 'Déploiement air-gapped possible, aucune dépendance externe. Compatible avec les exigences SecNumCloud et les environnements classifiés.',
  },
  {
    icon: Briefcase,
    title: 'Entreprises',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    description: 'Comités de direction, M&A, données stratégiques protégées. Aucun risque de fuite vers un prestataire cloud tiers.',
  },
];

/* ─── Main Component ─────────────────────────────────────── */

export default function SecurityData() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title="Sécurité & Confidentialité des Données — ClearRecap"
        description="ClearRecap protège vos données avec deux approches : Cloud géré en France ou 100 % auto-hébergé. Audio jamais conservé, chiffrement TLS, conformité RGPD. Idéal pour santé, juridique, défense."
        canonical={getCanonical('/securite-donnees')}
        hreflangAlternates={getHreflangAlternates('/securite-donnees')}
      />
      <StructuredData data={[breadcrumbSchema, faqSchema]} />

      {/* ─── 1. Hero Section ─────────────────────────────────── */}
      <section className="pt-24 pb-16 px-6 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium mb-3">
              <Shield className="w-4 h-4" /> Sécurité & Confidentialité
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-5 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-600 bg-clip-text text-transparent">
              Sécurité & Confidentialité — Vos données sous votre contrôle
            </h1>
            <p className="text-lg text-slate-500 max-w-3xl leading-relaxed">
              ClearRecap propose une approche duale pour protéger vos données :
              un <strong className="text-slate-700">mode Cloud géré en France</strong> pour démarrer rapidement,
              ou un <strong className="text-slate-700">mode 100 % auto-hébergé</strong> pour une maîtrise totale.
              Dans les deux cas, votre audio n'est jamais conservé.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── 2. Two Modes Comparison ─────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-8 text-center">Deux modes, une même exigence de sécurité</h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cloud Card */}
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Mode Cloud</h3>
                    <p className="text-xs text-slate-500">SaaS géré</p>
                  </div>
                </div>

                <ul className="space-y-3 flex-1">
                  {[
                    'Hébergement France (Hostinger, datacenter Paris)',
                    'Audio supprimé immédiatement après traitement (one-shot)',
                    'Texte hébergé en France, supprimable à tout moment',
                    'Possibilité d\'enrichissement IA via prestataires tiers (texte uniquement)',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-indigo-200/50">
                  <p className="text-xs font-medium text-indigo-700 mb-1">Idéal pour :</p>
                  <p className="text-xs text-slate-500">
                    PME, indépendants, équipes qui veulent démarrer rapidement
                  </p>
                </div>
              </div>
            </Reveal>

            {/* On-premise Card */}
            <Reveal delay={0.2}>
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Server className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Mode Auto-hébergé</h3>
                    <p className="text-xs text-slate-500">On-premise</p>
                  </div>
                </div>

                <ul className="space-y-3 flex-1">
                  {[
                    'Installation sur le serveur du client (ou VPS dédié)',
                    'Aucune donnée ne quitte l\'infrastructure du client',
                    'Aucun accès de ClearRecap aux données en production',
                    'Client = seul responsable de traitement',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-emerald-200/50">
                  <p className="text-xs font-medium text-emerald-700 mb-1">Idéal pour :</p>
                  <p className="text-xs text-slate-500">
                    Hôpitaux, cabinets d'avocats, défense, industries sensibles
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── 3. Comparison Table ─────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-6 text-center">Comparaison détaillée</h2>
            <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-3 text-left font-medium text-slate-500">Critère</th>
                    <th className="px-5 py-3 text-left font-medium text-indigo-600">
                      <span className="flex items-center gap-1.5">
                        <Cloud className="w-4 h-4" /> Mode Cloud
                      </span>
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-emerald-600">
                      <span className="flex items-center gap-1.5">
                        <Server className="w-4 h-4" /> Mode Auto-hébergé
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-medium text-sm">{row.label}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{row.cloud}</td>
                      <td className="px-5 py-3 text-sm text-emerald-700 font-medium">{row.onprem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── 4. Engagements de sécurité ──────────────────────── */}
      <section className="px-6 pb-16 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-2 text-center">Nos engagements de sécurité</h2>
            <p className="text-slate-500 text-center mb-8 max-w-2xl mx-auto">
              Quel que soit le mode choisi, ces garanties s'appliquent systématiquement.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECURITY_COMMITMENTS.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={i * 0.07}>
                  <div className="rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow bg-white h-full">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. Secteurs sensibles ───────────────────────────── */}
      <section className="px-6 py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-2 text-center">Pour les secteurs sensibles</h2>
            <p className="text-slate-500 text-center mb-8 max-w-2xl mx-auto">
              ClearRecap est conçu pour répondre aux exigences des environnements les plus critiques.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SECTORS.map((sector, i) => {
              const Icon = sector.icon;
              return (
                <Reveal key={sector.title} delay={i * 0.08}>
                  <div className={`rounded-xl border p-5 ${sector.bgColor} h-full`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className={`w-6 h-6 ${sector.color}`} />
                      <h3 className="font-bold">{sector.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{sector.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 6. FAQ ──────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-6 text-center">Questions fréquentes</h2>
          </Reveal>

          <div className="space-y-3">
            <AccordionItem question="L'audio est-il conservé ?">
              <p>
                Non. L'audio est supprimé immédiatement après traitement, de manière automatique et irréversible.
                ClearRecap ne conserve jamais vos fichiers audio, que ce soit en mode Cloud ou en mode auto-hébergé.
                Seul le texte résultant est conservé, et uniquement tant que vous le souhaitez.
              </p>
            </AccordionItem>

            <AccordionItem question="Mes transcriptions peuvent-elles être lues par ClearRecap ?">
              <p>
                <strong>Mode Cloud :</strong> ClearRecap agit comme sous-traitant au sens du RGPD.
                Un accès technique aux transcriptions est possible dans le cadre strict du DPA
                (Data Processing Agreement), uniquement pour assurer le fonctionnement du service.
              </p>
              <p className="mt-2">
                <strong>Mode auto-hébergé :</strong> ClearRecap n'a strictement aucun accès à vos données.
                Tout est traité et stocké sur votre infrastructure. Vous êtes le seul responsable de traitement.
              </p>
            </AccordionItem>

            <AccordionItem question="Quels prestataires tiers reçoivent mes données ?">
              <p>
                En mode Cloud, le <strong>texte uniquement</strong> peut être transmis à :
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                <li><strong>OpenAI</strong> — pour l'analyse et le résumé IA (texte uniquement, jamais l'audio brut)</li>
                <li><strong>Stripe</strong> — pour le traitement des paiements</li>
              </ul>
              <p className="mt-2">
                L'audio brut n'est jamais partagé avec un prestataire tiers. En mode auto-hébergé, aucun prestataire
                tiers n'intervient.
              </p>
            </AccordionItem>

            <AccordionItem question="Comment supprimer mes données ?">
              <p>
                Depuis votre compte, vous pouvez supprimer vos transcriptions immédiatement — la suppression est
                instantanée et définitive. L'audio, quant à lui, est déjà supprimé automatiquement après traitement.
                La suppression de votre compte entraîne l'effacement total de toutes vos données sous 30 jours maximum.
              </p>
            </AccordionItem>

            <AccordionItem question="Le mode auto-hébergé nécessite-t-il un GPU ?">
              <p>
                Oui, un GPU NVIDIA est recommandé pour des performances optimales. ClearRecap utilise
                faster-whisper qui tire parti de l'accélération GPU CUDA pour des transcriptions
                rapides et de haute qualité. Une carte avec 8 Go de VRAM minimum est conseillée,
                16 Go ou plus pour un usage intensif.
              </p>
            </AccordionItem>

            <AccordionItem question="ClearRecap est-il conforme au RGPD ?">
              <p>
                Oui. En mode Cloud, ClearRecap agit comme sous-traitant conforme (DPA disponible),
                avec hébergement en France et suppression automatique de l'audio. En mode auto-hébergé,
                la conformité RGPD est totalement entre les mains du client — aucune donnée ne quitte
                son infrastructure.{' '}
                <Link to="/conformite" className="text-indigo-600 hover:text-indigo-800 underline">
                  Voir notre page Conformité
                </Link>.
              </p>
            </AccordionItem>
          </div>
        </div>
      </section>

      {/* ─── 7. CTA Section ──────────────────────────────────── */}
      <section className="py-16 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Shield className="w-10 h-10 mx-auto mb-4 text-indigo-200" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Protégez vos données dès aujourd'hui
            </h2>
            <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
              Choisissez le mode qui correspond à vos exigences de sécurité.
              Dans les deux cas, votre audio n'est jamais conservé.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/oneshot"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors"
              >
                Essayer le mode Cloud — dès 3€
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:contact@clearrecap.fr"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Demander un devis On-premise
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 8. Footer Links ─────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4">
          <Link to="/" className="hover:text-slate-600 transition-colors">Accueil</Link>
          <Link to="/cgu" className="hover:text-slate-600 transition-colors">CGU</Link>
          <Link to="/confidentialite" className="hover:text-slate-600 transition-colors">Politique de confidentialité</Link>
          <Link to="/conformite" className="hover:text-slate-600 transition-colors">Conformité</Link>
          <Link to="/plans" className="hover:text-slate-600 transition-colors">Tarifs</Link>
          <span>ClearRecap — Transcription et analyse audio sécurisées</span>
        </div>
      </footer>
    </div>
  );
}
