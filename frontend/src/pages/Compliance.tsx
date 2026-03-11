import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, Lock, Globe, Server, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, Leaf, Eye,
  FileText, Scale,
} from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';

function Reveal({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function AccordionItem({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
        <span className="font-medium text-sm">{question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{children}</div>}
    </div>
  );
}

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Conformité & Certifications — ClearRecap',
  description: 'Conformité RGPD, HDS 2.0, SecNumCloud 3.2, CLOUD Act et IA Responsable pour la transcription audio ClearRecap.',
  author: { '@type': 'Organization', name: 'ClearRecap' },
  publisher: { '@type': 'Organization', name: 'ClearRecap', url: 'https://clearrecap.com' },
  datePublished: '2026-03-01',
  dateModified: '2026-03-11',
  mainEntityOfPage: 'https://clearrecap.com/conformite',
  about: ['RGPD', 'HDS', 'SecNumCloud', 'CLOUD Act'],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'ClearRecap est-il conforme au RGPD ?',
      acceptedAnswer: { '@type': 'Answer', text: 'Oui. ClearRecap traite 100 % des données localement. Aucune donnée ne quitte l\'infrastructure du client. Conforme par conception (Privacy by Design, article 25 RGPD).' },
    },
    {
      '@type': 'Question',
      name: 'ClearRecap est-il soumis au CLOUD Act ?',
      acceptedAnswer: { '@type': 'Answer', text: 'Non. ClearRecap n\'utilise aucun composant américain. Les modèles sont open-source (Whisper, Mistral, Qwen) et le traitement se fait sur l\'infrastructure du client.' },
    },
    {
      '@type': 'Question',
      name: 'ClearRecap est-il compatible avec la certification HDS ?',
      acceptedAnswer: { '@type': 'Answer', text: 'L\'architecture on-premise de ClearRecap est compatible avec les exigences HDS 2.0. Les données de santé restent sur l\'infrastructure du client, éliminant le besoin d\'un hébergeur certifié HDS tiers.' },
    },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'Conformité & Certifications' },
  ],
};

const CERTIFICATIONS = [
  {
    id: 'rgpd',
    icon: Shield,
    title: 'RGPD — Conformité par design',
    status: 'Conforme',
    statusColor: 'bg-emerald-100 text-emerald-700',
    content: (
      <div className="space-y-4 text-slate-600">
        <p>
          <strong>ClearRecap est conforme au RGPD par conception (Privacy by Design, article 25).</strong>{' '}
          Le traitement audio et textuel s'effectue à 100 % sur l'infrastructure du client. Aucune donnée
          ne transite par un serveur tiers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { art: 'Article 5', text: 'Minimisation : seules les données nécessaires sont traitées' },
            { art: 'Article 25', text: 'Privacy by Design : architecture locale par défaut' },
            { art: 'Article 28', text: 'Pas de sous-traitant cloud à auditer' },
            { art: 'Articles 44-49', text: 'Aucun transfert international de données' },
            { art: 'Article 17', text: 'Droit à l\'effacement : contrôle total et immédiat' },
            { art: 'Article 35', text: 'AIPD simplifiée : périmètre local uniquement' },
          ].map(item => (
            <div key={item.art} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>{item.art}</strong> — {item.text}</span>
            </div>
          ))}
        </div>
        <Link to="/guide-rgpd-transcription" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          Lire le guide RGPD complet →
        </Link>
      </div>
    ),
  },
  {
    id: 'hds',
    icon: Lock,
    title: 'HDS 2.0 — Hébergement de Données de Santé',
    status: 'Compatible',
    statusColor: 'bg-blue-100 text-blue-700',
    content: (
      <div className="space-y-4 text-slate-600">
        <p>
          <strong>L'architecture on-premise de ClearRecap est compatible avec les exigences HDS 2.0.</strong>{' '}
          La certification HDS (article L.1111-8 du Code de la santé publique) concerne l'hébergeur —
          c'est-à-dire l'infrastructure sur laquelle les données sont traitées.
        </p>
        <p>
          Avec ClearRecap installé sur les serveurs de l'établissement de santé, les données médicales
          (transcriptions de consultations, notes SOAP, dictées médicales) restent dans le SI de l'établissement.
          Il n'y a pas de recours à un hébergeur tiers, ce qui simplifie considérablement la conformité HDS.
        </p>
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm font-medium text-blue-800">
            Note : ClearRecap facilite la conformité HDS mais ne remplace pas la certification HDS
            de l'infrastructure sous-jacente si celle-ci est requise par votre organisation.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'secnumcloud',
    icon: Server,
    title: 'SecNumCloud 3.2 — Qualification ANSSI',
    status: 'Compatible',
    statusColor: 'bg-blue-100 text-blue-700',
    content: (
      <div className="space-y-4 text-slate-600">
        <p>
          <strong>ClearRecap est aligné avec les principes du référentiel SecNumCloud 3.2 de l'ANSSI.</strong>{' '}
          Ce référentiel qualifie les prestataires de cloud de confiance et impose des exigences
          d'immunité aux lois extraterritoriales (notamment le CLOUD Act américain).
        </p>
        <p>
          En tant que solution on-premise, ClearRecap est naturellement compatible avec SecNumCloud :
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm ml-2">
          <li>Aucun cloud américain dans la chaîne de traitement</li>
          <li>Modèles open-source (pas de dépendance à un fournisseur US)</li>
          <li>Déploiement sur infrastructure qualifiée par le client (OIV, OSE)</li>
          <li>Traçabilité et audit complets côté client</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'cloud-act',
    icon: Globe,
    title: 'CLOUD Act — Immunité garantie',
    status: 'Non soumis',
    statusColor: 'bg-emerald-100 text-emerald-700',
    content: (
      <div className="space-y-4 text-slate-600">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-700 mb-1">Risque cloud identifié</p>
            <p className="text-red-600">
              Le CLOUD Act (2018) autorise les autorités américaines à exiger l'accès aux données
              détenues par toute entreprise américaine, y compris sur des serveurs situés en Europe.
              Cela concerne AWS, Azure, GCP, OpenAI API, et les solutions SaaS de transcription cloud.
            </p>
          </div>
        </div>
        <p>
          <strong>ClearRecap n'est pas soumis au CLOUD Act</strong> car :
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm ml-2">
          <li>Aucun composant d'origine américaine dans la chaîne de traitement</li>
          <li>Modèles open-source : Whisper (libéré en open-source), Mistral (français), Qwen (open-weight)</li>
          <li>Aucune donnée transmise à un fournisseur cloud</li>
          <li>Traitement intégralement sur l'infrastructure du client</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'ia-responsable',
    icon: Leaf,
    title: 'IA Responsable — Transparence & sobriété',
    status: 'Engagé',
    statusColor: 'bg-emerald-100 text-emerald-700',
    content: (
      <div className="space-y-4 text-slate-600">
        <p>
          <strong>ClearRecap s'engage dans une démarche d'IA responsable</strong> fondée sur la
          transparence, la sobriété et le respect de la vie privée.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: Eye, title: 'Transparence des modèles', text: 'Whisper (OpenAI, open-source), Mistral Nemo (open-weight), Qwen 2.5 (open-weight). Pas de boîte noire.' },
            { icon: Leaf, title: 'Empreinte carbone réduite', text: 'Traitement local = pas de transfert réseau vers le cloud. Inférence GPU optimisée via faster-whisper (4× moins de compute).' },
            { icon: Lock, title: 'Respect de la vie privée', text: 'Aucune collecte de données pour entraîner des modèles. Vos transcriptions ne servent pas à améliorer un service tiers.' },
            { icon: Scale, title: 'Conformité réglementaire', text: 'Aligné avec le AI Act européen : transparence, documentation, évaluation des risques.' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-emerald-500" />
                  <h4 className="font-bold text-sm">{item.title}</h4>
                </div>
                <p className="text-xs text-slate-500">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    ),
  },
];

export default function Compliance() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title="Conformité & Certifications — RGPD, HDS, SecNumCloud, CLOUD Act — ClearRecap"
        description="ClearRecap est conforme au RGPD par design, compatible HDS 2.0 et SecNumCloud 3.2, non soumis au CLOUD Act. Transcription audio 100 % locale, IA responsable."
        canonical={getCanonical('/conformite')}
        hreflangAlternates={getHreflangAlternates('/conformite')}
        article={{
          publishedTime: '2026-03-01',
          modifiedTime: '2026-03-11',
          author: 'ClearRecap',
          section: 'Conformité',
        }}
      />
      <StructuredData data={[articleSchema, faqSchema, breadcrumbSchema]} />

      {/* Header */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium mb-3">
              <Shield className="w-4 h-4" /> Conformité & Certifications
            </div>
            <h1 className="text-4xl font-extrabold mb-4">
              Conformité réglementaire de ClearRecap
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl">
              ClearRecap est une solution de transcription audio 100 % locale, conforme au RGPD par design.
              Cette page détaille notre alignement avec les principales réglementations et certifications
              françaises et européennes.
            </p>
            <p className="text-sm text-slate-400 mt-3">Mis à jour le 11 mars 2026</p>
          </motion.div>
        </div>
      </section>

      {/* Status overview */}
      <section className="px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {CERTIFICATIONS.map(cert => {
                const Icon = cert.icon;
                return (
                  <div key={cert.id} className="rounded-xl border border-slate-200 p-4 text-center">
                    <Icon className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                    <p className="font-bold text-sm mb-1">{cert.id.toUpperCase()}</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cert.statusColor}`}>
                      {cert.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Detailed sections */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto space-y-6">
          {CERTIFICATIONS.map((cert, i) => {
            const Icon = cert.icon;
            return (
              <Reveal key={cert.id} delay={i * 0.08}>
                <div id={cert.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-indigo-500" />
                      <h2 className="font-bold">{cert.title}</h2>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${cert.statusColor}`}>
                      {cert.status}
                    </span>
                  </div>
                  <div className="p-6">{cert.content}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
          </Reveal>
          <div className="space-y-3">
            <AccordionItem question="ClearRecap est-il conforme au RGPD ?">
              <p>Oui. ClearRecap traite 100 % des données localement. Aucune donnée ne quitte
              l'infrastructure du client. Conforme par conception (Privacy by Design, article 25 RGPD).</p>
            </AccordionItem>
            <AccordionItem question="ClearRecap est-il soumis au CLOUD Act ?">
              <p>Non. ClearRecap n'utilise aucun composant américain. Les modèles sont open-source
              (Whisper, Mistral, Qwen) et le traitement se fait sur l'infrastructure du client.</p>
            </AccordionItem>
            <AccordionItem question="ClearRecap est-il compatible avec la certification HDS ?">
              <p>L'architecture on-premise de ClearRecap est compatible avec les exigences HDS 2.0.
              Les données de santé restent sur l'infrastructure du client, éliminant le besoin
              d'un hébergeur certifié HDS tiers.</p>
            </AccordionItem>
            <AccordionItem question="Quels modèles d'IA sont utilisés ?">
              <p>Whisper large-v3 (open-source, OpenAI) via faster-whisper pour la transcription.
              Mistral Nemo et Qwen 2.5 (open-weight) via Ollama pour les analyses. Tous les modèles
              s'exécutent localement sur le GPU du client.</p>
            </AccordionItem>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Transcription conforme, dès aujourd'hui</h2>
          <p className="text-indigo-100 mb-6">
            100 % local, conforme RGPD, non soumis au CLOUD Act. Essai dès 3 €, abonnement dès 19 €/mois.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/oneshot" className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors">
              Essayer — 3 €
            </Link>
            <Link to="/plans" className="px-6 py-3 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors">
              Voir les offres
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
          <Link to="/guide-rgpd-transcription" className="hover:text-slate-600 transition-colors">Guide RGPD</Link>
          <Link to="/glossaire-transcription" className="hover:text-slate-600 transition-colors">Glossaire</Link>
          <span>ClearRecap — Transcription et analyse audio 100 % locale</span>
        </div>
      </footer>
    </div>
  );
}
