import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';
import { TCOCalculator } from '../components/Conversion';

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

const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Calculer le TCO de la transcription audio : Cloud vs On-Premise',
  description: 'Comparez le coût total de possession d\'une solution de transcription cloud vs ClearRecap on-premise sur 1, 3 et 5 ans.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Définir votre volume',
      text: 'Indiquez le nombre d\'heures audio traitées par mois et le nombre d\'utilisateurs.',
    },
    {
      '@type': 'HowToStep',
      name: 'Choisir la période',
      text: 'Sélectionnez la durée de comparaison : 1, 3 ou 5 ans.',
    },
    {
      '@type': 'HowToStep',
      name: 'Comparer les résultats',
      text: 'Le calculateur affiche le coût total cloud vs on-premise, l\'économie réalisée et le mois de rentabilité.',
    },
  ],
};

export default function TCOCalculatorPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title="Calculateur TCO Transcription Audio — Cloud vs Local"
        description="Comparez le coût total de possession d'une solution cloud vs ClearRecap on-premise. Calculateur interactif sur 1, 3 et 5 ans."
        canonical={getCanonical('/calculateur-tco')}
        hreflangAlternates={getHreflangAlternates('/calculateur-tco')}
      />
      <StructuredData data={[HOWTO_SCHEMA]} />

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

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold mb-4"
          >
            Calculateur TCO — Cloud vs On-Premise
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500 max-w-2xl"
          >
            Combien coûte réellement la transcription audio pour votre organisation ?
            Comparez le coût total de possession d'une solution cloud avec ClearRecap installé sur vos serveurs.
          </motion.p>
        </div>
      </section>

      {/* Calculator */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <TCOCalculator />
          </Reveal>
        </div>
      </section>

      {/* Explanation */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-6">Comment lire ces résultats</h2>
            <div className="space-y-4 text-slate-600">
              <p>
                Le <strong>coût cloud</strong> est calculé sur la base du prix moyen au marché des solutions de
                transcription SaaS (0,12€/minute), multiplié par le nombre d'utilisateurs et la période choisie.
              </p>
              <p>
                Le <strong>coût ClearRecap on-premise</strong> inclut l'investissement initial (serveur GPU + installation)
                et les coûts récurrents (licence annuelle + maintenance). Les minutes sont illimitées et le nombre
                d'utilisateurs n'affecte pas le prix.
              </p>
              <p>
                Le <strong>point de rentabilité</strong> indique à partir de quel mois l'investissement on-premise
                devient moins cher que le cloud. Plus votre volume est élevé, plus ce point arrive tôt.
              </p>
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
          <Link to="/faq" className="hover:text-slate-600 transition-colors">FAQ</Link>
          <span>ClearRecap — Transcription et analyse audio 100% locale</span>
        </div>
      </footer>
    </div>
  );
}
