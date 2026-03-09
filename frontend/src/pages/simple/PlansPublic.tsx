import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Star, ArrowLeft } from 'lucide-react';
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
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  chat: 'Chat IA',
  dictation: 'Dictée vocale',
  mindmap: 'Carte mentale',
  slides: 'Slides',
  infographic: 'Infographie',
  tables: 'Tableaux',
  export_txt: 'Export TXT',
  export_pdf: 'Export PDF',
  export_md: 'Export Markdown',
  export_pptx: 'Export PowerPoint',
  templates: 'Templates personnalisés',
  presets: 'Presets audio',
  priority_queue: 'File prioritaire',
  multi_workspace: 'Multi-espaces',
};

function PlansPublic() {
  const [plans, setPlans] = useState<PlanData[]>([]);

  useEffect(() => {
    axios.get('/api/plans').then(r => setPlans(r.data)).catch(() => {});
  }, []);

  const recommended = 'pro';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <Link to="/" className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Les abonnements VoiceIQ</h1>
          <p className="text-slate-400 mt-1">
            Transcriptions illimitées, profils métiers, exports avancés.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => {
          const isRec = plan.id === recommended;
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 bg-slate-800 p-5 transition-all ${
                isRec
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                  : 'border-slate-700'
              }`}
            >
              {isRec && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3" /> Recommandé
                </div>
              )}

              <h3 className="font-bold text-lg text-white mt-1">{plan.name}</h3>

              <div className="mt-2">
                <span className="text-3xl font-bold text-indigo-400">
                  {plan.price_cents === 0 ? 'Gratuit' : `${(plan.price_cents / 100).toFixed(0)} EUR`}
                </span>
                {plan.price_cents > 0 && (
                  <span className="text-sm text-slate-400">/mois</span>
                )}
              </div>

              <p className="text-sm text-slate-400 mt-1">
                {plan.minutes_included} minutes/mois
              </p>

              <div className="mt-4 space-y-1.5">
                {plan.features.slice(0, 8).map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {FEATURE_LABELS[f] || f}
                  </div>
                ))}
                {plan.features.length > 8 && (
                  <p className="text-xs text-slate-500">
                    +{plan.features.length - 8} autres fonctionnalités
                  </p>
                )}
              </div>

              <Link
                to="/app"
                className={`mt-5 block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isRec
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {plan.price_cents === 0 ? 'Commencer gratuitement' : 'Choisir ce plan'}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <Link
          to="/"
          className="text-sm text-slate-500 hover:text-indigo-400 transition-colors"
        >
          Juste besoin d'un fichier ? Essayez le one-shot →
        </Link>
      </div>
    </motion.div>
  );
}

export default PlansPublic;
