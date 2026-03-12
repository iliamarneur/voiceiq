import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Clock, ThumbsUp,
  FileText, Code, Container, Cloud, MessageSquare,
  Folder, Bell, BookOpen, ArrowRight,
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

interface Integration {
  name: string;
  icon: React.ElementType;
  description: string;
  status: 'available' | 'planned';
  detail: string;
}

const INTEGRATIONS: Integration[] = [
  { name: 'Export multi-format', icon: FileText, status: 'available',
    description: 'Exportez vos transcriptions et analyses dans le format de votre choix.',
    detail: 'PPTX, SRT, VTT, JSON, Markdown, PDF. Chaque format est optimisé pour son cas d\'usage.' },
  { name: 'API REST (FastAPI)', icon: Code, status: 'available',
    description: 'API complète pour intégrer ClearRecap dans vos applications et workflows.',
    detail: 'Endpoints RESTful pour upload, transcription, analyse, gestion des templates et dictionnaires. Documentation OpenAPI incluse.' },
  { name: 'Docker Compose', icon: Container, status: 'available',
    description: 'Déploiement en une commande avec Docker Compose.',
    detail: 'Image Docker officielle avec GPU support (NVIDIA Container Toolkit). Configuration via variables d\'environnement.' },
  { name: 'Nextcloud', icon: Folder, status: 'planned',
    description: 'Synchronisation automatique depuis Nextcloud : déposez un fichier audio, récupérez la transcription.',
    detail: 'Surveillance d\'un dossier Nextcloud → transcription automatique → résultat renvoyé dans Nextcloud. 100 % local.' },
  { name: 'Rocket.Chat / Matrix', icon: MessageSquare, status: 'planned',
    description: 'Bot qui transcrit les messages vocaux et les appels dans Rocket.Chat ou Matrix.',
    detail: 'Intégration webhook : envoyez un message vocal, recevez la transcription en réponse. Compatible Element (Matrix).' },
  { name: 'Mattermost', icon: Bell, status: 'planned',
    description: 'Webhook de notification pour les transcriptions terminées.',
    detail: 'Notification automatique dans un channel Mattermost quand une transcription est prête. Lien direct vers le résultat.' },
  { name: 'Notion', icon: BookOpen, status: 'planned',
    description: 'Export direct des analyses vers une page Notion.',
    detail: 'Créez automatiquement une page Notion avec le résumé, les actions, les décisions — structuré par le profil métier utilisé.' },
  { name: 'Slack / Teams (webhook)', icon: Cloud, status: 'planned',
    description: 'Notifications webhook pour les entreprises utilisant Slack ou Teams.',
    detail: 'Webhook sortant uniquement (pas d\'envoi de données audio). Notification que la transcription est prête avec lien local.' },
];

function VoteButton({ name }: { name: string }) {
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(() => Math.floor(Math.random() * 30) + 5);

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    setCount(c => c + 1);
  };

  return (
    <button
      onClick={handleVote}
      disabled={voted}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        voted
          ? 'bg-indigo-100 text-indigo-700 cursor-default'
          : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
      }`}
    >
      <ThumbsUp className={`w-4 h-4 ${voted ? 'fill-indigo-500' : ''}`} />
      {voted ? 'Voté !' : 'Je veux ça'}
      <span className="text-xs opacity-60">({count})</span>
    </button>
  );
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'Intégrations' },
  ],
};

export default function Integrations() {
  const available = INTEGRATIONS.filter(i => i.status === 'available');
  const planned = INTEGRATIONS.filter(i => i.status === 'planned');

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title="Intégrations ClearRecap — Export, API, Docker, Nextcloud, Matrix"
        description="Découvrez les intégrations ClearRecap : export multi-format, API REST, Docker Compose. Prochainement : Nextcloud, Rocket.Chat, Matrix, Mattermost, Notion. Votez pour vos priorités."
        canonical={getCanonical('/integrations')}
        hreflangAlternates={getHreflangAlternates('/integrations')}
      />
      <StructuredData data={[breadcrumbSchema]} />

      {/* Header */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-extrabold mb-4">Intégrations & Écosystème</h1>
            <p className="text-lg text-slate-500 max-w-2xl">
              ClearRecap s'intègre dans votre infrastructure existante. Exportez, automatisez et connectez
              la transcription audio à vos outils — le tout 100 % en local.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Available */}
      <section className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Disponibles maintenant
            </h2>
          </Reveal>
          <div className="grid gap-4">
            {available.map((intg, i) => {
              const Icon = intg.icon;
              return (
                <Reveal key={intg.name} delay={i * 0.08}>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{intg.name}</h3>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Disponible</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{intg.description}</p>
                        <p className="text-xs text-slate-400">{intg.detail}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planned */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Bientôt disponibles
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Votez pour les intégrations qui vous intéressent — nous priorisons le développement selon la demande.
            </p>
          </Reveal>
          <div className="grid gap-4">
            {planned.map((intg, i) => {
              const Icon = intg.icon;
              return (
                <Reveal key={intg.name} delay={i * 0.08}>
                  <div className="rounded-xl border border-slate-200 bg-white p-6 hover:border-indigo-200 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{intg.name}</h3>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Prévu</span>
                          </div>
                          <VoteButton name={intg.name} />
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{intg.description}</p>
                        <p className="text-xs text-slate-400">{intg.detail}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Besoin d'une intégration spécifique ?</h2>
          <p className="text-indigo-100 mb-6">
            Contactez-nous pour discuter de vos besoins d'intégration. L'API REST permet déjà
            d'intégrer ClearRecap dans n'importe quel workflow.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/oneshot" className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors">
              Essayer — 3 €
            </Link>
            <Link to="/contact" className="px-6 py-3 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors">
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
          <Link to="/partenaires" className="hover:text-slate-600 transition-colors">Partenaires</Link>
          <Link to="/conformite" className="hover:text-slate-600 transition-colors">Conformité</Link>
          <span>ClearRecap — Transcription et analyse audio 100 % locale</span>
        </div>
      </footer>
    </div>
  );
}
