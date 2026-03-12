import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  MetaTags, StructuredData,
  getHreflangAlternates, getCanonical,
  SCHEMA_ORGANIZATION, SCHEMA_SOFTWARE_APPLICATION, SCHEMA_FAQ_HOME,
  PAGE_META,
} from '../components/SEO';
import { SocialProof, TrustBadges, ROICalculator, CTABanner } from '../components/Conversion';
import {
  Mic2, Shield, Zap, Brain, Upload, Sparkles, FileText,
  Lock, Clock, Globe, ArrowRight, CheckCircle,
  Headphones, BookOpen, Briefcase, GraduationCap,
  Stethoscope, Landmark, MessageSquare, PenTool,
  BarChart3, Presentation, Network, CreditCard, ShoppingBag,
  Building2, Server, Users, KeyRound, HardDrive, Mail,
} from 'lucide-react';

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

/* ─── Data ───────────────────────────────────────────────── */

const BENEFITS = [
  {
    icon: Lock,
    title: 'Vos fichiers ne sont jamais conservés',
    desc: 'Aucun fichier audio n\'est stocké sur nos serveurs. Une fois le traitement terminé, vos données sont supprimées. Conforme RGPD.',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Zap,
    title: 'Rapide, même sur les longs fichiers',
    desc: 'Conférences de 3 heures, podcasts, réunions marathon — le traitement GPU analyse votre audio en quelques minutes.',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    icon: Brain,
    title: '9 analyses IA par fichier',
    desc: 'Résumé, points clés, quiz, fiches de révision, carte mentale, diapositives, infographie, tableaux et plan d\'actions. Tout est généré automatiquement.',
    accent: 'from-violet-500 to-purple-600',
  },
];

const STEPS = [
  { num: '01', title: 'Importez', desc: 'Glissez un fichier audio ou vidéo, enregistrez au micro, ou dictez en direct.', icon: Upload },
  { num: '02', title: 'L\'IA analyse', desc: 'Transcription précise et analyses IA adaptées à votre domaine métier.', icon: Sparkles },
  { num: '03', title: 'Exploitez', desc: 'Consultez, exportez en PDF/PPTX/Markdown, discutez avec le contenu via le chat.', icon: FileText },
];

const USE_CASES = [
  {
    icon: Briefcase,
    title: 'Réunions & Business',
    features: ['Compte-rendu structuré', 'Actions assignées avec priorité', 'Email de suivi', 'Indicateurs et risques'],
    color: 'from-blue-500 to-indigo-600',
    link: '/transcription-reunion',
  },
  {
    icon: GraduationCap,
    title: 'Cours & Formation',
    features: ['Fiches de révision', 'Quiz par section', 'Carte des concepts', 'Support de cours'],
    color: 'from-emerald-500 to-teal-600',
    link: '/transcription-education',
  },
  {
    icon: Stethoscope,
    title: 'Consultations médicales',
    features: ['Note SOAP structurée', 'Prescriptions extraites', 'Points de vigilance', 'Anonymisation des données (RGPD)'],
    color: 'from-rose-500 to-pink-600',
    link: '/transcription-medicale',
  },
  {
    icon: Landmark,
    title: 'Juridique & Conformité',
    features: ['Synthèse juridique', 'Obligations par partie', 'Échéances et délais', 'Références légales'],
    color: 'from-amber-500 to-orange-600',
    link: '/transcription-juridique',
  },
];

const EXTRA_FEATURES = [
  { icon: MessageSquare, label: 'Chat avec la transcription' },
  { icon: Globe, label: '12 langues supportées' },
  { icon: Headphones, label: 'Lecteur audio synchronisé' },
  { icon: BookOpen, label: 'Chapitrage automatique' },
  { icon: PenTool, label: 'Dictée en temps réel' },
  { icon: Network, label: 'Carte mentale automatique' },
  { icon: Presentation, label: 'Diapositives de présentation' },
  { icon: BarChart3, label: 'Infographies et tableaux' },
];

const ONESHOT_TIERS = [
  { name: 'Court', duration: '30 min', price: '3' },
  { name: 'Standard', duration: '1h', price: '6' },
  { name: 'Long', duration: '1h30', price: '9' },
  { name: 'XLong', duration: '2h', price: '12' },
  { name: 'XXLong', duration: '2h30', price: '15' },
  { name: 'XXXLong', duration: '3h', price: '18' },
];

const PLANS = [
  { name: 'Basic (Solo)', price: '19', minutes: '500 min / mois', features: ['11 analyses IA', 'Chat IA', 'Dictée vocale', 'Export TXT, PDF, Markdown'], highlight: false },
  { name: 'Pro (PME)', price: '49', minutes: '3 000 min / mois', features: ['Toutes les analyses', 'Export PowerPoint', 'Modèles et profils', 'File prioritaire'], highlight: true },
  { name: 'Équipe+ (Éducation)', price: '99', minutes: '10 000 min / mois', features: ['Tout Pro inclus', 'Multi-espaces', 'Profils partagés', 'Export par lot'], highlight: false },
];

/* ─── Component ──────────────────────────────────────────── */

export default function AboutMarketing() {
  const { user } = useAuth();
  const appLink = user ? '/app/upload' : '/oneshot';
  const plansLink = user ? '/app/plans' : '/plans';

  return (
    <div className="min-h-screen bg-white text-slate-800 overflow-hidden">
      {/* ── SEO ──────────────────────────────────────────── */}
      <MetaTags
        title={PAGE_META.home.title}
        description={PAGE_META.home.description}
        canonical={getCanonical('/')}
        hreflangAlternates={getHreflangAlternates('/')}
      />
      <StructuredData data={[SCHEMA_SOFTWARE_APPLICATION, SCHEMA_ORGANIZATION, SCHEMA_FAQ_HOME]} />

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-white/80 backdrop-blur-lg border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ClearRecap
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/oneshot" className="text-slate-500 hover:text-slate-800 transition-colors">
              À l'unité
            </Link>
            <Link to={plansLink} className="text-slate-500 hover:text-slate-800 transition-colors">
              Tarifs
            </Link>
            <Link to="/blog" className="hidden md:inline text-slate-500 hover:text-slate-800 transition-colors">
              Blog
            </Link>
            <Link to="/faq" className="hidden md:inline text-slate-500 hover:text-slate-800 transition-colors">
              FAQ
            </Link>
            <Link
              to="/oneshot"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              Essayer
            </Link>
            {user ? (
              <Link to="/app" className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                Mon espace
              </Link>
            ) : (
              <Link to="/login" className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 pt-20">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-[700px] h-[700px] rounded-full bg-indigo-100/60 blur-[100px]" />
          <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-purple-100/40 blur-[80px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-amber-100/30 blur-[60px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/25 ring-1 ring-indigo-200"
          >
            <Mic2 className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]"
          >
            <span className="text-slate-800">
              Votre audio,
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              transformé en savoir
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            Transcription précise, analyses IA et exports professionnels.
            Vos fichiers ne sont jamais stockés sur nos serveurs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to={appLink}
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-semibold shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              Transcrire un fichier
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to={plansLink}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-slate-600 border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-300"
            >
              Voir les plans
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="mt-16 flex items-center justify-center gap-8 text-xs text-slate-400"
          >
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Conforme RGPD</span>
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Aucun fichier conservé</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Fichiers jusqu'à 3h</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> 12 langues</span>
          </motion.div>
        </div>
      </section>

      {/* ── 3 BENEFITS ───────────────────────────────────── */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Pourquoi ClearRecap
            </h2>
            <p className="text-slate-500 text-center max-w-xl mx-auto mb-16">
              Trois piliers pour une plateforme audio sans compromis.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.15}>
                <div className="group relative p-8 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 transition-all duration-500 shadow-sm hover:shadow-xl">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b.accent} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <b.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{b.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / CHIFFRES ──────────────────────── */}
      <Reveal>
        <SocialProof className="max-w-4xl mx-auto px-6 pb-12" />
      </Reveal>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="relative py-24 px-6 bg-slate-50">
        <div className="relative max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Comment ça marche
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.2}>
                <div className="relative text-center">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-300 to-transparent" />
                  )}
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center relative">
                    <s.icon className="w-8 h-8 text-indigo-600" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                      {s.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Adapté à votre métier
            </h2>
            <p className="text-slate-500 text-center max-w-xl mx-auto mb-16">
              Des profils métier avec des analyses spécifiques à chaque domaine.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {USE_CASES.map((uc, i) => (
              <Reveal key={uc.title} delay={i * 0.1}>
                <div className="group p-6 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${uc.color} flex items-center justify-center flex-shrink-0`}>
                      <uc.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-3">{uc.title}</h3>
                      <ul className="space-y-2">
                        {uc.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-sm text-slate-500">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link to={uc.link} className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                        En savoir plus <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXTRA FEATURES RIBBON ────────────────────────── */}
      <section className="py-16 px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold text-center mb-10">Et aussi...</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {EXTRA_FEATURES.map((f, i) => (
              <Reveal key={f.label} delay={i * 0.05}>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200">
                  <f.icon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{f.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ──────────────────────────────────── */}
      <section className="py-12 px-6">
        <Reveal>
          <TrustBadges className="max-w-4xl mx-auto" />
        </Reveal>
      </section>

      {/* ── ROI CALCULATOR ─────────────────────────────── */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <ROICalculator />
          </Reveal>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Des offres simples et transparentes
            </h2>
            <p className="text-slate-500 text-center max-w-xl mx-auto mb-16">
              Payez à l'unité ou choisissez un abonnement mensuel.
            </p>
          </Reveal>

          {/* One-shot section */}
          <Reveal>
            <div className="mb-10 p-8 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">À l'unité — sans abonnement</h3>
                  <p className="text-sm text-slate-500">Payez uniquement ce que vous transcrivez, fichiers jusqu'à 3 heures</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {ONESHOT_TIERS.map(tier => (
                  <div key={tier.name} className="bg-white rounded-2xl p-4 border border-indigo-100 text-center">
                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">{tier.name}</p>
                    <p className="text-2xl font-extrabold">{tier.price} <span className="text-sm font-normal text-slate-400">EUR</span></p>
                    <p className="text-xs text-slate-500 mt-1">jusqu'à {tier.duration}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link
                  to="/oneshot"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-colors shadow-md"
                >
                  <Zap className="w-4 h-4" />
                  Transcrire sans compte
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Subscription plans */}
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1}>
                <div className={`relative p-7 rounded-3xl border-2 transition-all duration-300 ${
                  plan.highlight
                    ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 bg-white'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
                }`}>
                  {plan.highlight && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-md">
                      Recommandé
                    </span>
                  )}
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-sm text-slate-400">EUR/mois</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-5">{plan.minutes}</p>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={plansLink}
                    className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg hover:shadow-xl'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Choisir ce plan
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Enterprise — sur devis */}
          <Reveal delay={0.2}>
            <div className="mt-10 p-8 rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
              <div className="relative">
                <div className="flex flex-col md:flex-row md:items-start gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">Entreprise — 100% dans vos locaux</h3>
                        <p className="text-sm text-slate-400">Installation sur vos serveurs, sur devis</p>
                      </div>
                    </div>

                    <p className="text-slate-300 leading-relaxed mb-6">
                      Installez ClearRecap directement sur vos serveurs.
                      Aucune donnée ne transite par internet — tout reste dans vos murs.
                      L'IA tourne sur vos machines, sans abonnement récurrent pour le moteur.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3 mb-6">
                      {[
                        { icon: Server, text: 'Installation sur vos serveurs (Docker ou serveur physique)' },
                        { icon: Lock, text: 'Aucune donnée envoyée à l\'extérieur — jamais' },
                        { icon: HardDrive, text: 'IA locale gratuite : Whisper + Ollama tournent sans licence' },
                        { icon: Shield, text: 'Conforme RGPD, HDS, ISO 27001 dès la conception' },
                        { icon: Users, text: 'Nombre illimité d\'utilisateurs et de minutes' },
                        { icon: KeyRound, text: 'SSO, LDAP, Active Directory — intégration à votre SI' },
                        { icon: Building2, text: 'Multi-sites et multi-équipes avec espaces séparés' },
                        { icon: Zap, text: 'GPU dédié = performance maximale, aucune file d\'attente' },
                      ].map(item => (
                        <div key={item.text} className="flex items-start gap-2.5">
                          <item.icon className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-300">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                      <h4 className="text-sm font-semibold text-indigo-400 mb-2">Comment ça fonctionne</h4>
                      <div className="grid sm:grid-cols-3 gap-4 text-sm text-slate-400">
                        <div>
                          <span className="block text-white font-semibold mb-0.5">1. Audit</span>
                          Nous évaluons votre infrastructure, vos volumes et vos besoins métier.
                        </div>
                        <div>
                          <span className="block text-white font-semibold mb-0.5">2. Installation</span>
                          Mise en place sur vos serveurs avec configuration GPU, SSO et profils métier.
                        </div>
                        <div>
                          <span className="block text-white font-semibold mb-0.5">3. Autonomie</span>
                          Votre équipe est formée. L'IA tourne en local, gratuitement, sans limite.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-72 flex-shrink-0">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Tarification</p>
                      <p className="text-3xl font-extrabold mb-1">Sur devis</p>
                      <p className="text-xs text-slate-400 mb-4">Frais d'installation uniques<br />+ accompagnement optionnel</p>
                      <div className="space-y-2 text-xs text-slate-400 text-left mb-6">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>Pas d'abonnement pour l'IA</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>Minutes illimitées</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>Utilisateurs illimités</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>Toutes les fonctionnalités</span>
                        </div>
                      </div>
                      <a
                        href="mailto:contact@clearrecap.fr?subject=Demande de devis ClearRecap Entreprise"
                        className="block py-3 rounded-xl font-semibold text-sm bg-white text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <Mail className="w-4 h-4 inline mr-2 -mt-0.5" />
                        Demander un devis
                      </a>
                      <Link
                        to="/calculateur-tco"
                        className="block py-3 mt-2 rounded-xl font-semibold text-sm text-center border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                      >
                        Calculateur TCO Cloud vs Local
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section className="relative py-32 px-6 bg-slate-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-100/50 blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Prêt à transformer votre audio ?
              </span>
            </h2>
            <p className="text-slate-500 mb-10 text-lg">
              Transcrivez votre premier fichier dès 3 EUR — sans abonnement.
            </p>
            <Link
              to={appLink}
              className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all duration-300"
            >
              <Mic2 className="w-6 h-6" />
              Lancer ClearRecap
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm mb-8">
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Produit</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/oneshot" className="hover:text-slate-600 transition-colors">Transcription à l'unité</Link></li>
                <li><Link to={plansLink} className="hover:text-slate-600 transition-colors">Tarifs</Link></li>
                <li><Link to="/faq" className="hover:text-slate-600 transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Solutions</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/transcription-medicale" className="hover:text-slate-600 transition-colors">Médical</Link></li>
                <li><Link to="/transcription-juridique" className="hover:text-slate-600 transition-colors">Juridique</Link></li>
                <li><Link to="/transcription-reunion" className="hover:text-slate-600 transition-colors">Business</Link></li>
                <li><Link to="/transcription-education" className="hover:text-slate-600 transition-colors">Éducation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Comparatifs</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/comparatif/clearrecap-vs-happyscribe" className="hover:text-slate-600 transition-colors">vs HappyScribe</Link></li>
                <li><Link to="/comparatif/clearrecap-vs-otter-ai" className="hover:text-slate-600 transition-colors">vs Otter.ai</Link></li>
                <li><Link to="/comparatif/transcription-cloud-vs-locale" className="hover:text-slate-600 transition-colors">Cloud vs Local</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Ressources</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/blog" className="hover:text-slate-600 transition-colors">Blog</Link></li>
                <li><Link to="/glossaire-transcription" className="hover:text-slate-600 transition-colors">Glossaire</Link></li>
                <li><Link to="/guide-rgpd-transcription" className="hover:text-slate-600 transition-colors">Guide RGPD</Link></li>
                <li><Link to="/calculateur-tco" className="hover:text-slate-600 transition-colors">Calculateur TCO</Link></li>
                <li><Link to="/conformite" className="hover:text-slate-600 transition-colors">Conformité</Link></li>
                <li><Link to="/integrations" className="hover:text-slate-600 transition-colors">Intégrations</Link></li>
                <li><Link to="/partenaires" className="hover:text-slate-600 transition-colors">Partenaires</Link></li>
                <li><a href="mailto:contact@clearrecap.fr" className="hover:text-slate-600 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-6 flex flex-col items-center gap-2 text-xs text-slate-400">
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/cgu" className="hover:text-slate-600 transition-colors">CGU</Link>
              <Link to="/confidentialite" className="hover:text-slate-600 transition-colors">Politique de confidentialité</Link>
              <Link to="/securite-donnees" className="hover:text-slate-600 transition-colors">Sécurité & Données</Link>
              <Link to="/contact" className="hover:text-slate-600 transition-colors">Contact</Link>
            </div>
            <p>ClearRecap — Transcription et analyse audio. Hébergement France. Audio supprimé après traitement.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
