import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Circle, Shield } from 'lucide-react';
import axios from 'axios';
import DiscoverySection from '../../components/simple/DiscoverySection';

const STEPS = [
  { id: 'uploading', label: 'Fichier reçu', sub: 'Votre audio est bien arrivé.' },
  { id: 'transcribing', label: 'Transcription', sub: 'Nous transformons l\'audio en texte.' },
  { id: 'analyzing', label: 'Résumé', sub: 'Nous résumons les idées principales.' },
  { id: 'done', label: 'Analyses', sub: 'Nous extrayons les points clés et actions.' },
];

const BENEFITS = [
  'Le texte complet, mot à mot',
  'Un résumé clair en quelques lignes',
  'Les points clés et les actions à suivre',
];

type JobPhase = 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error';

function TranscriptionWaiting() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<JobPhase>('uploading');
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const resp = await axios.get(`/api/jobs/${jobId}`);
        const job = resp.data;

        if (job.file_path && !filename) {
          const name = job.file_path.split('/').pop() || job.file_path.split('\\').pop() || '';
          setFilename(name);
        }

        if (job.status === 'pending' || job.status === 'queued') {
          setPhase('uploading');
        } else if (job.status === 'processing') {
          setPhase('transcribing');
        } else if (job.status === 'transcribed') {
          setPhase('analyzing');
        } else if (job.status === 'completed' && job.transcription_id) {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase('done');
          setTimeout(() => {
            navigate(`/result/${job.transcription_id}`);
          }, 1500);
        } else if (job.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(job.error_message || 'La transcription a échoué.');
          setPhase('error');
        }

        if (attempts > 200) {
          if (pollRef.current) clearInterval(pollRef.current);
          setError('Le traitement prend trop de temps.');
          setPhase('error');
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
        setError('Connexion perdue.');
        setPhase('error');
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, navigate]);

  const phaseOrder = ['uploading', 'transcribing', 'analyzing', 'done'];
  const currentIdx = phaseOrder.indexOf(phase);
  const isDone = phase === 'done';

  if (error) {
    return (
      <div className="py-16 text-center">
        <div className="rounded-xl bg-red-900/20 border border-red-800 p-6 max-w-md mx-auto">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8 space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        {isDone ? (
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-3" />
          </motion.div>
        ) : (
          <div className="relative w-16 h-16 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">
          {isDone ? 'C\'est prêt !' : 'Nous préparons vos résultats'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {isDone ? 'Affichage du résultat...' : filename || 'Votre fichier audio'}
        </p>
      </div>

      {/* Timeline */}
      {!isDone && (
        <div className="max-w-sm mx-auto space-y-0.5">
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
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    done ? 'text-green-400' :
                    current ? 'text-indigo-400' :
                    'text-slate-500'
                  }`}>
                    {step.label}
                  </p>
                  {(current || done) && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.sub}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Time estimate */}
      {!isDone && (
        <p className="text-center text-xs text-slate-500">
          Environ 2 à 5 minutes
        </p>
      )}

      {/* Benefits */}
      {!isDone && (
        <div className="max-w-sm mx-auto">
          <p className="text-xs font-medium text-slate-500 mb-2">Ce que vous allez obtenir :</p>
          <div className="space-y-1.5">
            {BENEFITS.map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovery section */}
      {!isDone && (
        <div className="max-w-sm mx-auto">
          <DiscoverySection />
        </div>
      )}

      {/* Reassurance */}
      {!isDone && (
        <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Vos données restent 100% locales sur votre machine.
        </p>
      )}
    </motion.div>
  );
}

export default TranscriptionWaiting;
