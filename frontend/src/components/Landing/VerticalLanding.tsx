import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, Lock, Zap, Server, ChevronDown } from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../SEO';

/* ─── Animated section wrapper ───────────────────────────── */
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

/* ─── Types ──────────────────────────────────────────────── */

export interface PainPoint {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export interface Feature {
  name: string;
  description?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface VerticalLandingProps {
  /** SEO */
  path: string;
  metaTitle: string;
  metaDescription: string;

  /** Hero */
  heroIcon: React.ComponentType<{ className?: string }>;
  heroIconGradient: string;
  headline: string;
  subheadline: string;
  badge?: string;

  /** Pain points */
  painPoints: PainPoint[];

  /** Features list */
  featuresTitle: string;
  features: Feature[];
  featuresGradient: string;

  /** FAQ */
  faqItems: FAQItem[];

  /** Optional structured data additions */
  extraSchemas?: Record<string, unknown>[];
}

/* ─── FAQ Accordion ──────────────────────────────────────── */

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left text-slate-800 font-medium hover:bg-slate-50 transition-colors"
            aria-expanded={openIndex === i}
          >
            <span className="pr-4">{item.question}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`} />
          </button>
          {openIndex === i && (
            <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Comparison Table ───────────────────────────────────── */

const COMPARISON_ROWS = [
  { label: 'Données', clearrecap: '100% local', cloud: 'Envoyées aux USA/Cloud' },
  { label: 'RGPD', clearrecap: 'Conforme par design', cloud: 'Nécessite DPA complexe' },
  { label: 'Latence', clearrecap: 'GPU local, rapide', cloud: 'Dépend de la connexion' },
  { label: 'Profils métier', clearrecap: 'Analyses spécialisées', cloud: 'Transcription générique' },
  { label: 'Coût minimum', clearrecap: 'Dès 3€', cloud: '10-50€/mois minimum' },
];

/* ─── Main Component ─────────────────────────────────────── */

export default function VerticalLanding({
  path, metaTitle, metaDescription,
  heroIcon: HeroIcon, heroIconGradient, headline, subheadline, badge,
  painPoints, featuresTitle, features, featuresGradient,
  faqItems, extraSchemas,
}: VerticalLandingProps) {
  // FAQ schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
      { '@type': 'ListItem', position: 2, name: metaTitle.split(' — ')[0], item: getCanonical(path) },
    ],
  };

  const schemas = [faqSchema, breadcrumbSchema, ...(extraSchemas || [])];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* SEO */}
      <MetaTags
        title={metaTitle}
        description={metaDescription}
        canonical={getCanonical(path)}
        hreflangAlternates={getHreflangAlternates(path)}
      />
      <StructuredData data={schemas} />

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-100/50 blur-[100px]" />
          <div className="absolute -bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full bg-purple-100/30 blur-[80px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
            className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${heroIconGradient} flex items-center justify-center shadow-xl`}
          >
            <HeroIcon className="w-8 h-8 text-white" />
          </motion.div>

          {badge && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 mb-6"
            >
              <Shield className="w-3 h-3" />
              {badge}
            </motion.span>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight"
          >
            {headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            {subheadline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/oneshot"
              className="group flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-semibold shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
            >
              Essayer pour 3€
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/plans"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-slate-600 border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all"
            >
              Voir les plans
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── PAIN POINTS / PROBLÈMES RÉSOLUS ─────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-3xl font-bold text-center mb-12">Les défis que ClearRecap résout</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {painPoints.map((pp, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-lg transition-shadow">
                  <pp.icon className="w-8 h-8 text-indigo-600 mb-4" />
                  <h3 className="text-lg font-bold mb-2">{pp.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{pp.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES MÉTIER ─────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-3xl font-bold text-center mb-4">{featuresTitle}</h2>
            <p className="text-slate-500 text-center max-w-xl mx-auto mb-12">
              Chaque analyse est générée automatiquement par l'IA locale, adaptée à votre contexte professionnel.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className={`p-5 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${featuresGradient} flex items-center justify-center shrink-0 mt-0.5`}>
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{f.name}</h3>
                      {f.description && <p className="text-sm text-slate-500 mt-1">{f.description}</p>}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARAISON ─────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-3xl font-bold text-center mb-10">ClearRecap vs Solutions Cloud</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">Critère</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-600">ClearRecap</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Solutions Cloud</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="py-3 px-4 text-sm font-medium text-slate-700">{row.label}</td>
                      <td className="py-3 px-4 text-sm text-slate-800">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          {row.clearrecap}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-400">{row.cloud}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PRICING RAPIDE ──────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl font-bold mb-4">Des offres simples</h2>
            <p className="text-slate-500 mb-10 max-w-lg mx-auto">
              Commencez sans engagement avec le one-shot dès 3€, ou choisissez un abonnement mensuel.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              {[
                { name: 'Basic', price: '19€', desc: '500 min/mois' },
                { name: 'Pro', price: '49€', desc: '3 000 min/mois', highlight: true },
                { name: 'Équipe+', price: '99€', desc: '10 000 min/mois' },
              ].map(plan => (
                <div
                  key={plan.name}
                  className={`p-5 rounded-2xl border-2 ${plan.highlight ? 'border-indigo-500 shadow-lg' : 'border-slate-200'}`}
                >
                  <p className="text-sm font-semibold text-slate-600">{plan.name}</p>
                  <p className="text-3xl font-extrabold mt-1">{plan.price}<span className="text-sm font-normal text-slate-400">/mois</span></p>
                  <p className="text-xs text-slate-500 mt-1">{plan.desc}</p>
                </div>
              ))}
            </div>
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
            >
              Voir tous les plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ MÉTIER ──────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-3xl font-bold text-center mb-10">Questions fréquentes</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <FAQAccordion items={faqItems} />
          </Reveal>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Prêt à essayer ?
              </span>
            </h2>
            <p className="text-slate-500 mb-8 text-lg">
              Transcrivez votre premier fichier dès 3€ — sans abonnement, sans inscription.
            </p>
            <Link
              to="/oneshot"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-2xl font-bold shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Zap className="w-5 h-5" />
              Lancer une transcription
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4">
          <Link to="/" className="hover:text-slate-600 transition-colors">Accueil</Link>
          <Link to="/plans" className="hover:text-slate-600 transition-colors">Tarifs</Link>
          <Link to="/blog" className="hover:text-slate-600 transition-colors">Blog</Link>
          <Link to="/faq" className="hover:text-slate-600 transition-colors">FAQ</Link>
          <Link to="/glossaire-transcription" className="hover:text-slate-600 transition-colors">Glossaire</Link>
          <Link to="/guide-rgpd-transcription" className="hover:text-slate-600 transition-colors">Guide RGPD</Link>
          <span>ClearRecap — Transcription et analyse audio 100% locale</span>
        </div>
      </footer>
    </div>
  );
}
