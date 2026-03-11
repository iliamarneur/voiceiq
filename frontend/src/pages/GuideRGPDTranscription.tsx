import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, XCircle, BookOpen, Scale, Globe, Server,
  Lock, FileText, ExternalLink,
} from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';

/* ─── Types ──────────────────────────────────────────────── */

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

/* ─── Schemas ────────────────────────────────────────────── */

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Guide RGPD pour la Transcription Audio par IA',
  description: 'Guide de référence complet sur la conformité RGPD dans le contexte de la transcription audio automatique. Articles 5, 6, 9, 25, 28, 35, 44-49 analysés.',
  author: { '@type': 'Organization', name: 'ClearRecap' },
  publisher: { '@type': 'Organization', name: 'ClearRecap', url: 'https://clearrecap.com' },
  datePublished: '2026-03-01',
  dateModified: '2026-03-11',
  mainEntityOfPage: 'https://clearrecap.com/guide-rgpd-transcription',
  inLanguage: 'fr',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'Guide RGPD Transcription' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'La transcription audio est-elle soumise au RGPD ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui. La voix est une donnée biométrique (article 9 RGPD) et la transcription produit des données personnelles textuelles. Tout traitement de transcription audio impliquant des personnes identifiables est soumis au RGPD.',
      },
    },
    {
      '@type': 'Question',
      name: 'Peut-on utiliser un service cloud américain pour la transcription de données sensibles ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'C\'est juridiquement risqué. Le CLOUD Act (2018) permet aux autorités américaines d\'accéder aux données hébergées par des entreprises US, même sur des serveurs en Europe. Les articles 44-49 du RGPD encadrent strictement les transferts hors UE. Une solution on-premise comme ClearRecap élimine ce risque.',
      },
    },
    {
      '@type': 'Question',
      name: 'Comment ClearRecap assure-t-il la conformité RGPD ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ClearRecap traite 100 % des données localement : transcription (faster-whisper) et analyse (Ollama) s\'exécutent sur l\'infrastructure du client. Aucune donnée audio ou textuelle ne quitte le réseau local. Cette approche est conforme par conception (Privacy by Design, article 25 RGPD).',
      },
    },
    {
      '@type': 'Question',
      name: 'Faut-il réaliser une AIPD pour la transcription audio ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui, dans la plupart des cas. L\'article 35 du RGPD impose une Analyse d\'Impact relative à la Protection des Données (AIPD) lorsque le traitement est susceptible d\'engendrer un risque élevé. La transcription audio implique souvent des données sensibles (santé, juridique) et un traitement automatisé à grande échelle.',
      },
    },
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

function ComplianceRow({ label, cloud, local }: { label: string; cloud: string; local: string }) {
  return (
    <tr className="border-t border-slate-100 dark:border-slate-700/50">
      <td className="px-4 py-3 font-medium text-sm">{label}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{cloud}</td>
      <td className="px-4 py-3 text-sm">
        <span className="flex items-center gap-1 text-emerald-600 font-medium">
          <CheckCircle2 className="w-4 h-4" /> {local}
        </span>
      </td>
    </tr>
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

/* ─── Main Component ─────────────────────────────────────── */

export default function GuideRGPDTranscription() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title="Guide RGPD pour la Transcription Audio par IA — ClearRecap"
        description="Guide complet sur la conformité RGPD dans le contexte de la transcription audio automatique. Articles 5, 6, 9, 25, 28, 35, 44-49 du RGPD analysés. Comparaison cloud vs on-premise."
        canonical={getCanonical('/guide-rgpd-transcription')}
        hreflangAlternates={getHreflangAlternates('/guide-rgpd-transcription')}
        article={{
          publishedTime: '2026-03-01',
          modifiedTime: '2026-03-11',
          author: 'ClearRecap',
          section: 'Conformité',
        }}
      />
      <StructuredData data={[articleSchema, breadcrumbSchema, faqSchema]} />

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
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium mb-3">
              <Shield className="w-4 h-4" />
              Guide de référence — Conformité
            </div>
            <h1 className="text-4xl font-extrabold mb-4">
              Guide RGPD pour la Transcription Audio par IA
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl">
              La transcription audio par intelligence artificielle soulève des questions essentielles
              de protection des données. Ce guide analyse les obligations RGPD applicables et compare
              les approches cloud et on-premise pour les organisations françaises et européennes.
            </p>
            <p className="text-sm text-slate-400 mt-3">
              Publié le 1er mars 2026 — Mis à jour le 11 mars 2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* Table of contents */}
      <section className="px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <nav className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <h2 className="font-bold text-sm uppercase text-slate-500 mb-3">Sommaire</h2>
              <ol className="space-y-1.5 text-sm">
                {[
                  { id: 'voix-donnee', label: '1. La voix est une donnée personnelle' },
                  { id: 'articles-cles', label: '2. Articles RGPD applicables à la transcription' },
                  { id: 'cloud-act', label: '3. CLOUD Act et transferts hors UE' },
                  { id: 'comparaison', label: '4. Comparaison cloud vs on-premise' },
                  { id: 'aipd', label: '5. AIPD : quand et comment ?' },
                  { id: 'clearrecap', label: '6. Comment ClearRecap répond à ces exigences' },
                  { id: 'faq-rgpd', label: '7. Questions fréquentes' },
                ].map(item => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </Reveal>
        </div>
      </section>

      {/* Section 1 */}
      <section id="voix-donnee" className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Scale className="w-6 h-6 text-indigo-500" />
              1. La voix est une donnée personnelle
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                <strong>La voix humaine est une donnée biométrique au sens de l'article 9 du RGPD.</strong>{' '}
                Elle permet l'identification unique d'une personne physique par ses caractéristiques vocales
                (timbre, fréquence, prosodie). La transcription audio transforme cette donnée biométrique
                en données textuelles qui peuvent contenir des informations personnelles (noms, adresses,
                numéros de dossier, données de santé).
              </p>
              <p>
                Concrètement, toute organisation qui transcrit des enregistrements audio contenant des voix
                de personnes identifiables est responsable de traitement au sens du RGPD. Cela inclut :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Les cabinets médicaux transcrivant des consultations (données de santé — art. 9)</li>
                <li>Les cabinets d'avocats transcrivant des audiences ou entretiens clients</li>
                <li>Les entreprises transcrivant des réunions internes ou des appels clients</li>
                <li>Les établissements d'enseignement transcrivant des cours</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 2 */}
      <section id="articles-cles" className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" />
              2. Articles RGPD applicables à la transcription
            </h2>
            <div className="space-y-4">
              {[
                {
                  article: 'Article 5 — Principes',
                  text: 'Minimisation des données, limitation des finalités, intégrité et confidentialité. La transcription ne doit traiter que les données strictement nécessaires à la finalité déclarée.',
                },
                {
                  article: 'Article 6 — Base légale',
                  text: 'Le traitement de transcription doit reposer sur une base légale : consentement (art. 6.1.a), exécution d\'un contrat (art. 6.1.b), intérêt légitime (art. 6.1.f), ou obligation légale (art. 6.1.c).',
                },
                {
                  article: 'Article 9 — Données sensibles',
                  text: 'La voix est une donnée biométrique. Les données de santé, opinions politiques ou convictions religieuses pouvant apparaître dans une transcription sont des données sensibles nécessitant un consentement explicite ou une exception de l\'article 9.2.',
                },
                {
                  article: 'Article 25 — Privacy by Design',
                  text: 'Le responsable de traitement doit mettre en œuvre des mesures techniques et organisationnelles dès la conception. Une solution on-premise comme ClearRecap applique ce principe en ne faisant transiter aucune donnée hors de l\'infrastructure locale.',
                },
                {
                  article: 'Article 28 — Sous-traitant',
                  text: 'Toute utilisation d\'un service cloud de transcription implique un sous-traitant. Un contrat conforme à l\'art. 28 est obligatoire. Avec une solution on-premise, l\'organisation est à la fois responsable de traitement et opérateur, éliminant la complexité du contrat de sous-traitance.',
                },
                {
                  article: 'Articles 44-49 — Transferts internationaux',
                  text: 'Les transferts de données vers des pays hors UE ne bénéficiant pas d\'une décision d\'adéquation sont strictement encadrés. L\'utilisation de services cloud américains (AWS, Azure, GCP, OpenAI API) implique un transfert soumis à ces articles.',
                },
                {
                  article: 'Article 35 — AIPD',
                  text: 'L\'Analyse d\'Impact relative à la Protection des Données est obligatoire lorsque le traitement engendre un risque élevé pour les droits et libertés. La transcription audio à grande échelle, impliquant des données sensibles, nécessite une AIPD.',
                },
              ].map(item => (
                <div key={item.article} className="rounded-xl border border-slate-200 p-5">
                  <h3 className="font-bold text-sm text-indigo-700 mb-1">{item.article}</h3>
                  <p className="text-sm text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 3 — CLOUD Act */}
      <section id="cloud-act" className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Globe className="w-6 h-6 text-red-500" />
              3. CLOUD Act et transferts hors UE
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <div className="rounded-xl bg-red-50 border border-red-200 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700 mb-1">Risque juridique identifié</p>
                    <p className="text-sm text-red-600">
                      Le CLOUD Act (Clarifying Lawful Overseas Use of Data Act, 2018) autorise les autorités
                      américaines à exiger l'accès aux données détenues par toute entreprise américaine,
                      <strong> y compris sur des serveurs situés en Europe</strong>. Cela s'applique à AWS,
                      Azure, Google Cloud, OpenAI, et tout fournisseur de transcription cloud américain.
                    </p>
                  </div>
                </div>
              </div>
              <p>
                <strong>L'invalidation du Privacy Shield (arrêt Schrems II, CJUE, 2020) a confirmé
                l'incompatibilité entre le droit américain et le RGPD.</strong> Le nouveau EU-US Data Privacy
                Framework (2023) fait l'objet de contestations juridiques similaires. Pour les organisations
                traitant des données sensibles (santé, juridique, défense), le risque d'un transfert
                vers un service cloud américain reste significatif.
              </p>
              <p>
                La solution : un traitement 100 % local, sur l'infrastructure de l'organisation,
                élimine tout transfert international et toute exposition au CLOUD Act.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 4 — Comparison table */}
      <section id="comparaison" className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Server className="w-6 h-6 text-indigo-500" />
              4. Comparaison cloud vs on-premise
            </h2>
            <p className="text-slate-600 mb-4">
              Ce tableau compare les implications RGPD d'une solution de transcription cloud
              avec un déploiement on-premise comme ClearRecap.
            </p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Critère RGPD</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Solution Cloud</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">ClearRecap On-Premise</th>
                  </tr>
                </thead>
                <tbody>
                  <ComplianceRow
                    label="Localisation des données"
                    cloud="Serveurs tiers (US/EU/variable)"
                    local="Serveurs du client uniquement"
                  />
                  <ComplianceRow
                    label="Sous-traitant (art. 28)"
                    cloud="Oui — contrat obligatoire"
                    local="Non — pas de sous-traitant"
                  />
                  <ComplianceRow
                    label="Transfert hors UE (art. 44-49)"
                    cloud="Probable (CLOUD Act, Privacy Shield)"
                    local="Aucun transfert"
                  />
                  <ComplianceRow
                    label="Privacy by Design (art. 25)"
                    cloud="Dépend du fournisseur"
                    local="Natif — architecture locale"
                  />
                  <ComplianceRow
                    label="Exposition CLOUD Act"
                    cloud="Oui si fournisseur US"
                    local="Non — aucun composant US"
                  />
                  <ComplianceRow
                    label="AIPD simplifiée"
                    cloud="Complexe (sous-traitants, flux de données)"
                    local="Simplifiée (périmètre local)"
                  />
                  <ComplianceRow
                    label="Compatibilité HDS"
                    cloud="Hébergeur certifié requis"
                    local="Données sur site — pas d'hébergeur tiers"
                  />
                  <ComplianceRow
                    label="Compatibilité SecNumCloud"
                    cloud="Rares fournisseurs qualifiés"
                    local="Compatible par conception"
                  />
                  <ComplianceRow
                    label="Droit à l'effacement (art. 17)"
                    cloud="Dépend du fournisseur + rétention"
                    local="Contrôle total et immédiat"
                  />
                  <ComplianceRow
                    label="Audit et traçabilité"
                    cloud="Limité aux logs fournisseur"
                    local="Logs complets sur site"
                  />
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 5 — AIPD */}
      <section id="aipd" className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" />
              5. AIPD : quand et comment ?
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                <strong>L'Analyse d'Impact relative à la Protection des Données (AIPD) est obligatoire
                pour la transcription audio dans la plupart des cas professionnels.</strong> La CNIL
                considère que le traitement de données biométriques (la voix) combiné à un traitement
                automatisé à grande échelle déclenche l'obligation d'AIPD (article 35 RGPD).
              </p>
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-5">
                <h3 className="font-bold text-sm text-indigo-700 mb-3">Étapes clés d'une AIPD pour la transcription</h3>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span><strong>Description du traitement</strong> : finalité, catégories de données, durée de conservation, destinataires</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span><strong>Évaluation de la nécessité et proportionnalité</strong> : base légale, minimisation, durée de conservation justifiée</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span><strong>Évaluation des risques</strong> : confidentialité, intégrité, disponibilité des données</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    <span><strong>Mesures d'atténuation</strong> : chiffrement, contrôle d'accès, traitement local, politique de rétention</span>
                  </li>
                </ol>
              </div>
              <p>
                Avec ClearRecap on-premise, l'AIPD est significativement simplifiée : pas de sous-traitant
                à auditer, pas de flux de données transfrontaliers à documenter, contrôle total sur la
                rétention et l'effacement.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 6 — ClearRecap */}
      <section id="clearrecap" className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-emerald-500" />
              6. Comment ClearRecap répond à ces exigences
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                <strong>ClearRecap est une solution de transcription audio 100 % locale, conforme au RGPD
                par conception (Privacy by Design).</strong> Voici comment elle répond à chaque exigence :
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    icon: Server,
                    title: 'Traitement 100 % local',
                    text: 'Transcription (faster-whisper) et analyse (Ollama) s\'exécutent sur votre infrastructure. Aucune donnée ne quitte votre réseau.',
                  },
                  {
                    icon: Shield,
                    title: 'Pas de sous-traitant',
                    text: 'Aucun appel API externe. Pas de fournisseur cloud à auditer. Vous êtes le seul responsable de traitement.',
                  },
                  {
                    icon: Globe,
                    title: 'Immunité CLOUD Act',
                    text: 'Aucun composant américain. Modèles open-source (Whisper, Qwen, Mistral). Infrastructure 100 % européenne.',
                  },
                  {
                    icon: Lock,
                    title: 'Contrôle total des données',
                    text: 'Effacement immédiat possible. Politique de rétention configurable. Logs d\'audit complets sur site.',
                  },
                  {
                    icon: CheckCircle2,
                    title: 'Compatible HDS & SecNumCloud',
                    text: 'Architecture on-premise compatible avec les exigences HDS 2.0 et SecNumCloud 3.2.',
                  },
                  {
                    icon: FileText,
                    title: 'AIPD simplifiée',
                    text: 'Périmètre local = documentation simplifiée. Pas de flux transfrontaliers à analyser.',
                  },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-bold text-sm">{item.title}</h3>
                      </div>
                      <p className="text-sm">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 7 — FAQ */}
      <section id="faq-rgpd" className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              7. Questions fréquentes
            </h2>
            <div className="space-y-3">
              <AccordionItem question="La transcription audio est-elle soumise au RGPD ?">
                <p>
                  Oui. La voix est une donnée biométrique (article 9 RGPD) et la transcription produit
                  des données personnelles textuelles. Tout traitement de transcription audio impliquant
                  des personnes identifiables est soumis au RGPD.
                </p>
              </AccordionItem>
              <AccordionItem question="Peut-on utiliser un service cloud américain pour la transcription de données sensibles ?">
                <p>
                  C'est juridiquement risqué. Le CLOUD Act (2018) permet aux autorités américaines
                  d'accéder aux données hébergées par des entreprises US, même sur des serveurs en Europe.
                  Les articles 44-49 du RGPD encadrent strictement les transferts hors UE. Une solution
                  on-premise comme ClearRecap élimine ce risque.
                </p>
              </AccordionItem>
              <AccordionItem question="Comment ClearRecap assure-t-il la conformité RGPD ?">
                <p>
                  ClearRecap traite 100 % des données localement : transcription (faster-whisper) et
                  analyse (Ollama) s'exécutent sur l'infrastructure du client. Aucune donnée audio ou
                  textuelle ne quitte le réseau local. Cette approche est conforme par conception
                  (Privacy by Design, article 25 RGPD).
                </p>
              </AccordionItem>
              <AccordionItem question="Faut-il réaliser une AIPD pour la transcription audio ?">
                <p>
                  Oui, dans la plupart des cas. L'article 35 du RGPD impose une Analyse d'Impact
                  relative à la Protection des Données (AIPD) lorsque le traitement est susceptible
                  d'engendrer un risque élevé. La transcription audio implique souvent des données
                  sensibles (santé, juridique) et un traitement automatisé à grande échelle.
                </p>
              </AccordionItem>
              <AccordionItem question="Quelle est la différence entre HDS et SecNumCloud ?">
                <p>
                  La certification HDS (Hébergement de Données de Santé) est spécifique aux données
                  de santé et obligatoire pour les hébergeurs tiers. SecNumCloud est une qualification
                  ANSSI plus large, visant les prestataires de cloud de confiance avec des exigences
                  d'immunité aux lois extraterritoriales. ClearRecap on-premise est compatible avec
                  les deux car les données restent sur l'infrastructure du client.
                </p>
              </AccordionItem>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Transcription audio conforme au RGPD, dès aujourd'hui
          </h2>
          <p className="text-indigo-100 mb-6">
            ClearRecap traite vos données 100 % en local. Aucun cloud tiers, aucun transfert
            de données, aucun risque CLOUD Act. Essayez dès 3 €.
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
          <Link to="/glossaire-transcription" className="hover:text-slate-600 transition-colors">Glossaire</Link>
          <span>ClearRecap — Transcription et analyse audio 100 % locale</span>
        </div>
      </footer>
    </div>
  );
}
