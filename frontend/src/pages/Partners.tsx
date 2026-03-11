import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Users, Briefcase, Server, Award, BookOpen,
  Headphones, GraduationCap, CheckCircle2, ArrowRight,
  Stethoscope, Scale, Mail, Send,
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

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'Programme Partenaires' },
  ],
};

const ADVANTAGES = [
  { icon: Award, title: 'Dashboard partenaire dédié', desc: 'Suivi en temps réel de vos commissions, clients référés et revenus générés.' },
  { icon: BookOpen, title: 'Kit marketing complet', desc: 'Présentations, fiches produit par profil vertical, argumentaires de vente.' },
  { icon: Headphones, title: 'Support technique prioritaire', desc: 'Canal de support dédié avec temps de réponse garanti < 4h.' },
  { icon: GraduationCap, title: 'Formation gratuite', desc: 'Formation complète à l\'installation, la configuration et l\'utilisation avancée de ClearRecap.' },
];

export default function Partners() {
  const [formData, setFormData] = useState({ name: '', company: '', email: '', sector: '', type: 'consultant' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <MetaTags
        title="Programme Partenaires ClearRecap — Consultants & Intégrateurs"
        description="Devenez partenaire ClearRecap. Consultants métier : 20 % de commission récurrente. Intégrateurs IT : 30 % de marge revendeur + certification. Transcription audio souveraine."
        canonical={getCanonical('/partenaires')}
        hreflangAlternates={getHreflangAlternates('/partenaires')}
      />
      <StructuredData data={[breadcrumbSchema]} />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_50%)]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-emerald-200 hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
              Devenez Partenaire ClearRecap
            </h1>
            <p className="text-lg text-emerald-100 max-w-2xl mb-8">
              Recommandez la transcription audio souveraine à vos clients.
              Commission récurrente pour les consultants, marge revendeur pour les intégrateurs.
            </p>
            <a href="#inscription" className="px-6 py-3 rounded-xl bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors inline-flex items-center gap-2">
              Devenir partenaire <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Two profiles */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-8 text-center">Deux profils partenaires</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6">
            <Reveal delay={0.1}>
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Consultant métier</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Santé, juridique, éducation, business — recommandez ClearRecap à vos clients dans votre secteur d'expertise.
                </p>
                <div className="rounded-xl bg-white p-4 mb-4">
                  <p className="text-3xl font-extrabold text-indigo-600">20 %</p>
                  <p className="text-sm text-slate-500">commission récurrente pendant 12 mois sur chaque client référé</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Lien de parrainage personnalisé</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Commission sur abonnements ET one-shots</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Dashboard de suivi en temps réel</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Idéal pour : consultants santé, avocats, formateurs</li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                  <Server className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Intégrateur IT / ESN</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Installez ClearRecap chez vos clients. Marge revendeur + certification officielle.
                </p>
                <div className="rounded-xl bg-white p-4 mb-4">
                  <p className="text-3xl font-extrabold text-emerald-600">30 %</p>
                  <p className="text-sm text-slate-500">marge revendeur sur les installations on-premise</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Certification "ClearRecap Certified Deployer"</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Formation technique approfondie</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Marge sur licence + installation + maintenance</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Idéal pour : ESN, intégrateurs, MSP</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-8 text-center">Avantages partenaires</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ADVANTAGES.map((adv, i) => {
              const Icon = adv.icon;
              return (
                <Reveal key={adv.title} delay={i * 0.1}>
                  <div className="rounded-xl bg-white border border-slate-200 p-5 flex items-start gap-4">
                    <Icon className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold mb-1">{adv.title}</h3>
                      <p className="text-sm text-slate-500">{adv.desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Signup form */}
      <section id="inscription" className="py-16 px-6">
        <div className="max-w-xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold mb-6 text-center">Inscription partenaire</h2>
          </Reveal>
          {submitted ? (
            <Reveal>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Demande envoyée !</h3>
                <p className="text-sm text-slate-600">
                  Nous vous recontactons sous 48h pour finaliser votre inscription au programme partenaire.
                </p>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Entreprise</label>
                  <input type="text" required value={formData.company} onChange={e => setFormData(d => ({ ...d, company: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email professionnel</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Secteur</label>
                  <select value={formData.sector} onChange={e => setFormData(d => ({ ...d, sector: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all text-sm">
                    <option value="">Sélectionner...</option>
                    <option value="sante">Santé</option>
                    <option value="juridique">Juridique</option>
                    <option value="education">Éducation</option>
                    <option value="business">Business / Conseil</option>
                    <option value="it">IT / ESN</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type de partenariat</label>
                  <div className="flex gap-3">
                    <label className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium text-center cursor-pointer transition-all ${
                      formData.type === 'consultant' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="type" value="consultant" checked={formData.type === 'consultant'}
                        onChange={e => setFormData(d => ({ ...d, type: e.target.value }))} className="sr-only" />
                      Consultant métier
                    </label>
                    <label className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium text-center cursor-pointer transition-all ${
                      formData.type === 'integrateur' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="type" value="integrateur" checked={formData.type === 'integrateur'}
                        onChange={e => setFormData(d => ({ ...d, type: e.target.value }))} className="sr-only" />
                      Intégrateur IT
                    </label>
                  </div>
                </div>
                <button type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Envoyer ma candidature
                </button>
              </form>
            </Reveal>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4">
          <Link to="/" className="hover:text-slate-600 transition-colors">Accueil</Link>
          <Link to="/plans" className="hover:text-slate-600 transition-colors">Tarifs</Link>
          <Link to="/integrations" className="hover:text-slate-600 transition-colors">Intégrations</Link>
          <Link to="/conformite" className="hover:text-slate-600 transition-colors">Conformité</Link>
          <span>ClearRecap — Transcription et analyse audio 100 % locale</span>
        </div>
      </footer>
    </div>
  );
}
