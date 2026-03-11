import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle, X, ArrowRight, Zap } from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../SEO';

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

export interface ComparisonRow {
  label: string;
  clearrecap: string | boolean;
  competitor: string | boolean;
}

export interface ComparisonPageProps {
  path: string;
  metaTitle: string;
  metaDescription: string;
  headline: string;
  intro: string;
  competitorName: string;
  competitorLogo?: string;
  rows: ComparisonRow[];
  whyClearRecap: string[];
  conclusion: string;
}

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value
      ? <CheckCircle className="w-5 h-5 text-emerald-500" />
      : <X className="w-5 h-5 text-slate-300" />;
  }
  return <span>{value}</span>;
}

export default function ComparisonPage({
  path, metaTitle, metaDescription,
  headline, intro, competitorName,
  rows, whyClearRecap, conclusion,
}: ComparisonPageProps) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
      { '@type': 'ListItem', position: 2, name: 'Comparatifs', item: 'https://clearrecap.com/comparatif' },
      { '@type': 'ListItem', position: 3, name: metaTitle.split(' | ')[0], item: getCanonical(path) },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title={metaTitle}
        description={metaDescription}
        canonical={getCanonical(path)}
        hreflangAlternates={getHreflangAlternates(path)}
      />
      <StructuredData data={[breadcrumbSchema]} />

      {/* Hero */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight"
          >
            {headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            {intro}
          </motion.p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-500 w-1/3">Critère</th>
                    <th className="text-left py-4 px-5 text-sm font-bold text-indigo-600">ClearRecap</th>
                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-400">{competitorName}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3.5 px-5 text-sm font-medium text-slate-700">{row.label}</td>
                      <td className="py-3.5 px-5 text-sm text-slate-800">
                        <CellValue value={row.clearrecap} />
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-500">
                        <CellValue value={row.competitor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Why ClearRecap */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-3xl font-bold text-center mb-10">Pourquoi choisir ClearRecap</h2>
          </Reveal>
          <div className="space-y-4">
            {whyClearRecap.map((reason, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700">{reason}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Conclusion + CTA */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">{conclusion}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/oneshot"
                className="group flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-semibold shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <Zap className="w-4 h-4" />
                Essayer pour 3€
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/plans"
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-slate-600 border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all"
              >
                Voir les plans
              </Link>
            </div>
          </Reveal>
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
