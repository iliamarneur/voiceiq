import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Star, ArrowLeft, Zap, ShoppingBag, Building2, Server, Lock, Shield, HardDrive, Users, KeyRound, Mail } from 'lucide-react';
import axios from 'axios';

interface PlanData {
  id: string;
  name: string;
  price_cents: number;
  minutes_included: number;
  features: string[];
}

const FEATURE_LABELS: Record<string, string> = {
  transcription: 'Transcription',
  summary: 'Résumé',
  keypoints: 'Points clés',
  actions: 'Plan d\'actions',
  flashcards: 'Fiches de révision',
  quiz: 'Quiz',
  chat: 'Chat IA',
  dictation: 'Dictée vocale',
  mindmap: 'Carte mentale',
  slides: 'Diapositives',
  infographic: 'Infographie',
  tables: 'Tableaux',
  export_txt: 'Export TXT',
  export_pdf: 'Export PDF',
  export_md: 'Export Markdown',
  export_pptx: 'Export PowerPoint',
  templates: 'Modèles personnalisés',
  presets: 'Profils audio',
  priority_queue: 'File prioritaire',
  multi_workspace: 'Multi-espaces',
  shared_presets: 'Profils partagés',
  batch_export: 'Export par lot',
};

function PlansPublic() {
  const [plans, setPlans] = useState<PlanData[]>([]);

  useEffect(() => {
    axios.get('/api/plans').then(r => {
      setPlans(r.data);
    }).catch(() => {});
  }, []);

  const recommended = 'pro';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <Link to="/" className="text-slate-400 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Nos offres</h1>
          <p className="text-slate-500 mt-1">
            À l'unité ou en abonnement, selon vos besoins.
          </p>
        </div>
      </div>

      {/* One-shot section */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">À l'unité — sans abonnement</h3>
            <p className="text-xs text-slate-500">Payez à l'unité, fichiers jusqu'à 3 heures</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'Court', duration: '30 min', price: 3 },
            { name: 'Standard', duration: '1h', price: 6 },
            { name: 'Long', duration: '1h30', price: 9 },
            { name: 'XLong', duration: '2h', price: 12 },
            { name: 'XXLong', duration: '2h30', price: 15 },
            { name: 'XXXLong', duration: '3h', price: 18 },
          ].map(t => (
            <div key={t.name} className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">{t.name}</p>
              <p className="text-xl font-extrabold">{t.price} <span className="text-xs font-normal text-slate-400">EUR</span></p>
              <p className="text-xs text-slate-500">jusqu'à {t.duration}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Transcription
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Résumé
          <span className="text-slate-400">+ fonctionnalités progressives selon le palier</span>
        </div>
        <Link
          to="/oneshot"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Transcrire un fichier
        </Link>
      </div>

      {/* Subscription plans */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Abonnements mensuels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map(plan => {
            const isRec = plan.id === recommended;
            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 bg-white p-5 transition-all shadow-sm ${
                  isRec
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                    : 'border-slate-200'
                }`}
              >
                {isRec && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3" /> Recommandé
                  </div>
                )}

                <h3 className="font-bold text-lg text-slate-800 mt-1">{plan.name}</h3>

                <div className="mt-2">
                  <span className="text-3xl font-bold text-indigo-600">
                    {(plan.price_cents / 100).toFixed(0)}
                  </span>
                  <span className="text-sm text-slate-500"> EUR/mois</span>
                </div>

                <p className="text-sm text-slate-500 mt-1">
                  {plan.minutes_included.toLocaleString()} minutes/mois
                </p>

                <div className="mt-4 space-y-1.5">
                  {plan.features.slice(0, 8).map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      {FEATURE_LABELS[f] || f}
                    </div>
                  ))}
                  {plan.features.length > 8 && (
                    <p className="text-xs text-slate-400">
                      +{plan.features.length - 8} autres fonctionnalités
                    </p>
                  )}
                </div>

                <Link
                  to="/login"
                  className={`mt-5 block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isRec
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Choisir ce plan
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise — sur devis */}
      <div className="p-6 rounded-2xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Entreprise — 100% dans vos locaux</h3>
              <p className="text-xs text-slate-400">Installation sur vos serveurs, sur devis</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            Installez ClearRecap sur vos serveurs. Aucune donnée ne transite par internet.
            L'IA tourne sur vos machines, sans abonnement récurrent.
          </p>

          <div className="grid sm:grid-cols-2 gap-2.5 mb-5">
            {[
              { icon: Server, text: 'Installation sur vos serveurs' },
              { icon: Lock, text: 'Aucune donnée envoyée à l\'extérieur' },
              { icon: HardDrive, text: 'IA locale gratuite (Whisper + Ollama)' },
              { icon: Shield, text: 'Conforme RGPD, HDS, ISO 27001' },
              { icon: Users, text: 'Utilisateurs et minutes illimités' },
              { icon: KeyRound, text: 'SSO, LDAP, Active Directory' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-xs text-slate-300">
                <item.icon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                {item.text}
              </div>
            ))}
          </div>

          <a
            href="mailto:contact@clearrecap.fr?subject=Demande de devis ClearRecap Entreprise"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Demander un devis
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default PlansPublic;
