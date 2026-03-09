import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Circle, Shield } from 'lucide-react';

interface TranscriptionProgressProps {
  filename: string;
  estimatedMinutes?: number;
  profile?: string;
  phase: 'uploading' | 'transcribing' | 'analyzing' | 'done';
}

const PROFILE_LABELS: Record<string, string> = {
  generic: 'Generique',
  business: 'Business',
  education: 'Education',
  medical: 'Medical',
  legal: 'Legal',
};

const STEPS = [
  { id: 'uploading', label: 'Fichier recu', sub: 'Votre audio est bien arrive.' },
  { id: 'transcribing', label: 'Transcription', sub: 'Nous transformons l\'audio en texte.' },
  { id: 'analyzing', label: 'Resume', sub: 'Nous resumons les idees principales.' },
  { id: 'done', label: 'Analyses', sub: 'Nous extrayons points cles et actions.' },
];

const BENEFITS = [
  'Texte complet de votre audio',
  'Resume clair en quelques lignes',
  'Points cles et actions a suivre',
];

function TranscriptionProgress({ filename, estimatedMinutes, profile = 'generic', phase }: TranscriptionProgressProps) {
  const phaseOrder = ['uploading', 'transcribing', 'analyzing', 'done'];
  const currentIdx = phaseOrder.indexOf(phase);
  const profileLabel = PROFILE_LABELS[profile] || profile;
  const isDone = phase === 'done';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 lg:p-8 space-y-5"
    >
      {/* Header */}
      <div className="text-center">
        {isDone ? (
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
            <CheckCircle className="w-14 h-14 mx-auto text-green-500 mb-3" />
          </motion.div>
        ) : (
          <div className="relative w-14 h-14 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
          </div>
        )}
        <h2 className="text-xl font-bold">
          {isDone ? 'C\'est pret !' : 'Nous preparons vos resultats'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isDone
            ? 'Affichage du resultat...'
            : `${filename}${estimatedMinutes ? ` · ~${estimatedMinutes} min` : ''}${profileLabel ? ` · ${profileLabel}` : ''}`
          }
        </p>
      </div>

      {/* Timeline */}
      {!isDone && (
        <div className="space-y-0.5">
          {STEPS.map((step, i) => {
            const done = i < currentIdx;
            const current = i === currentIdx;
            return (
              <div key={step.id} className="flex items-start gap-3 py-2">
                <div className="flex-shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : current ? (
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-indigo-400/30 animate-ping" style={{ width: 20, height: 20 }} />
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    done ? 'text-green-600 dark:text-green-400' :
                    current ? 'text-indigo-600 dark:text-indigo-400' :
                    'text-slate-400 dark:text-slate-500'
                  }`}>
                    {step.label}
                  </p>
                  {(current || done) && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{step.sub}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Time estimate */}
      {!isDone && (
        <p className="text-center text-xs text-slate-400">
          Environ 2 a 5 minutes
        </p>
      )}

      {/* Benefits */}
      {!isDone && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Ce que vous allez obtenir :</p>
          <div className="space-y-1.5">
            {BENEFITS.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reassurance */}
      {!isDone && (
        <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Vos donnees restent 100% locales sur votre machine.
        </p>
      )}
    </motion.div>
  );
}

export default TranscriptionProgress;
