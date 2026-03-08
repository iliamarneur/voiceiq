import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Mic, PenLine, ArrowRight, Loader2, Clock } from 'lucide-react';
import axios from 'axios';
import { Profile, SubscriptionInfo } from '../types';

const MODES = [
  {
    id: 'file',
    icon: Upload,
    title: 'Fichier audio/video',
    description: 'Importez un fichier depuis votre ordinateur (reunions, consultations, conferences...)',
    color: 'from-indigo-500 to-blue-500',
    route: '/upload',
  },
  {
    id: 'record',
    icon: Mic,
    title: 'Enregistrer',
    description: 'Enregistrez un audio directement depuis votre micro, puis traitez-le comme un fichier.',
    color: 'from-rose-500 to-pink-500',
    route: '/record',
  },
  {
    id: 'dictate',
    icon: PenLine,
    title: 'Dicter en direct',
    description: 'Dictez en temps reel, la transcription apparait a l\'ecran au fur et a mesure.',
    color: 'from-amber-500 to-orange-500',
    route: '/dictate',
  },
];

function NewEntryPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('generic');
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    axios.get('/api/profiles').then(r => setProfiles(r.data)).catch(() => {});
    axios.get('/api/preferences').then(r => {
      if (r.data?.default_profile) setSelectedProfile(r.data.default_profile);
    }).catch(() => {});
    axios.get('/api/subscription').then(r => setSubscription(r.data)).catch(() => {});
  }, []);

  const handleSelect = (mode: typeof MODES[0]) => {
    navigate(mode.route, { state: { profile: selectedProfile } });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Nouveau traitement</h1>
        <p className="text-slate-500">Choisissez votre mode d'entree</p>
        {subscription && (
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="text-slate-600 dark:text-slate-300">
              {subscription.minutes_remaining} min restantes
              {subscription.extra_minutes_balance > 0 && ` (+${subscription.extra_minutes_balance} extra)`}
            </span>
            <span className="text-slate-400">— {subscription.plan_name}</span>
          </div>
        )}
      </div>

      {/* Profile selector */}
      {profiles.length > 0 && (
        <div className="mb-8">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 block">Profil metier</label>
          <div className="flex flex-wrap gap-2">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedProfile === p.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MODES.map((mode, i) => (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleSelect(mode)}
            className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
              <mode.icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">{mode.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{mode.description}</p>
            <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Commencer <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default NewEntryPage;
