import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Circle, Shield } from 'lucide-react';
import axios from 'axios';
import DiscoverySection from '../../components/simple/DiscoverySection';

const STEPS = [
  { id: 'uploading', label: 'Fichier reçu' },
  { id: 'transcribing', label: 'Transcription en cours' },
  { id: 'analyzing', label: 'Analyse' },
  { id: 'done', label: 'Terminé' },
];

type JobPhase = 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error';

function TranscriptionWaiting() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<JobPhase>('uploading');
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('done');
          setTimeout(() => {
            navigate(`/result/${jobId}`);
          }, 1200);
        } else if (job.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setError(job.error_message || 'La transcription a échoué.');
          setPhase('error');
        }

        if (attempts > 200) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setError('Le traitement prend trop de temps.');
          setPhase('error');
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
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

  // Progress: each phase = 25%, smooth fill within current phase
  const progressPercent = isDone
    ? 100
    : Math.min(95, currentIdx * 25 + Math.min(24, elapsed % 30));

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}min ${sec.toString().padStart(2, '0')}s` : `${sec}s`;
  };

  if (error) {
    return (
      <div className="py-16 text-center">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-slate-500 hover:text-slate-800 transition-colors"
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
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-800">
          {isDone ? 'C\'est prêt !' : 'Traitement en cours'}
        </h1>
        {filename && !isDone && (
          <p className="text-sm text-slate-500 mt-1">{filename}</p>
        )}
      </div>

      {/* Progress bar */}
      {!isDone && (
        <div className="max-w-md mx-auto">
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{STEPS[currentIdx]?.label || 'En cours'}</span>
            <span>{formatElapsed(elapsed)}</span>
          </div>
        </div>
      )}

      {/* Steps */}
      {!isDone && (
        <div className="max-w-sm mx-auto flex justify-between">
          {STEPS.map((step, i) => {
            const done = i < currentIdx;
            const current = i === currentIdx;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5">
                <div className="flex-shrink-0">
                  {done ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : current ? (
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <p className={`text-xs font-medium ${
                  done ? 'text-green-600' :
                  current ? 'text-indigo-600' :
                  'text-slate-400'
                }`}>
                  {step.label}
                </p>
              </div>
            );
          })}
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
        <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Vos fichiers ne sont jamais conservés sur nos serveurs.
        </p>
      )}
    </motion.div>
  );
}

export default TranscriptionWaiting;
