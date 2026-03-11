import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Building2, Server, Shield, CheckCircle2,
  ArrowRight, Users, Headphones, Mail,
} from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../../components/SEO';

/* ─── Types ──────────────────────────────────────────────── */

export interface GeoLandingProps {
  path: string;
  city: string;
  region: string;
  meta: { title: string; description: string };
  hero: {
    headline: string;
    sub: string;
  };
  ecosystem: {
    title: string;
    description: string;
    sectors: { icon: React.ElementType; name: string; detail: string }[];
  };
  poles: string[];
  partnerCTA: string;
  features?: string[];
}

/* ─── Component ──────────────────────────────────────────── */

function Reveal({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function GeoLanding(props: GeoLandingProps) {
  const { path, city, region, meta, hero, ecosystem, poles, partnerCTA, features } = props;

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `ClearRecap — ${city}`,
    description: meta.description,
    url: `https://clearrecap.com${path}`,
    address: {
      '@type': 'PostalAddress',
      addressRegion: region,
      addressCountry: 'FR',
    },
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: { '@type': 'GeoCoordinates', name: city },
    },
    priceRange: 'Dès 3€',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
      { '@type': 'ListItem', position: 2, name: `Transcription ${city}` },
    ],
  };

  const defaultFeatures = [
    'Transcription Whisper large-v3 — précision 95%+',
    '5 profils métier (Médical, Juridique, Business, Éducation, Générique)',
    '9 analyses IA par profil, 100% locales via Ollama',
    '12 langues supportées avec détection automatique',
    'Export multi-format : PPTX, SRT, VTT, JSON, MD, PDF',
    'Diarisation automatique jusqu\'à 20 locuteurs',
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title={meta.title}
        description={meta.description}
        canonical={getCanonical(path)}
        hreflangAlternates={getHreflangAlternates(path)}
      />
      <StructuredData data={[localBusinessSchema, breadcrumbSchema]} />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_50%)]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-200 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-indigo-200 text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              {city} — {region}
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
              {hero.headline}
            </h1>
            <p className="text-lg text-indigo-100 max-w-2xl mb-8">
              {hero.sub}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/oneshot"
                className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors"
              >
                Essayer — 3 €
              </Link>
              <a
                href={`mailto:contact@clearrecap.fr?subject=Démonstration ${city}`}
                className="px-6 py-3 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Demander une démo à {city}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-2">{ecosystem.title}</h2>
            <p className="text-slate-500 mb-8">{ecosystem.description}</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ecosystem.sectors.map((sector, i) => {
              const Icon = sector.icon;
              return (
                <Reveal key={sector.name} delay={i * 0.1}>
                  <div className="rounded-xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all h-full">
                    <Icon className="w-8 h-8 text-indigo-500 mb-3" />
                    <h3 className="font-bold mb-1">{sector.name}</h3>
                    <p className="text-sm text-slate-500">{sector.detail}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pôles de compétitivité */}
      {poles.length > 0 && (
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                Pôles de compétitivité & écosystème
              </h2>
              <div className="flex flex-wrap gap-2">
                {poles.map(pole => (
                  <span key={pole} className="px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 font-medium">
                    {pole}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Server className="w-6 h-6 text-indigo-500" />
              Pourquoi ClearRecap pour {city} ?
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(features || defaultFeatures).map((feat, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{feat}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Proximity */}
      <section className="py-16 px-6 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="flex items-start gap-4">
              <Users className="w-10 h-10 text-emerald-500 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Installation & support sur site</h2>
                <p className="text-slate-600 mb-4">
                  {partnerCTA}
                </p>
                <Link
                  to="/partenaires"
                  className="inline-flex items-center gap-1.5 text-emerald-700 font-medium hover:text-emerald-900 transition-colors"
                >
                  Devenir partenaire intégrateur à {city}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Sovereignty */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <Shield className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Souveraineté numérique à {city}</h2>
            <p className="text-slate-500 max-w-2xl mx-auto mb-6">
              ClearRecap est 100 % local : aucune donnée ne quitte votre infrastructure.
              Conforme RGPD par design, non soumis au CLOUD Act, compatible HDS et SecNumCloud.
              Vos données restent à {city}, sous votre contrôle exclusif.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/guide-rgpd-transcription"
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Guide RGPD
              </Link>
              <Link
                to="/conformite"
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Conformité & certifications
              </Link>
              <Link
                to="/comparatif/transcription-cloud-vs-locale"
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Cloud vs Local
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Prêt à déployer ClearRecap à {city} ?
          </h2>
          <p className="text-indigo-100 mb-6">
            Essai one-shot dès 3 €, abonnement dès 19 €/mois, ou déploiement on-premise illimité.
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
          <Link to="/plans" className="hover:text-slate-600 transition-colors">Tarifs</Link>
          <Link to="/blog" className="hover:text-slate-600 transition-colors">Blog</Link>
          <Link to="/glossaire-transcription" className="hover:text-slate-600 transition-colors">Glossaire</Link>
          <Link to="/guide-rgpd-transcription" className="hover:text-slate-600 transition-colors">Guide RGPD</Link>
          <Link to="/conformite" className="hover:text-slate-600 transition-colors">Conformité</Link>
          <span>ClearRecap — Transcription et analyse audio 100 % locale</span>
        </div>
      </footer>
    </div>
  );
}
