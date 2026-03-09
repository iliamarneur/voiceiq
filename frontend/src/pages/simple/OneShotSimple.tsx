import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileAudio, Loader2, CreditCard, Shield, CheckCircle } from 'lucide-react';
import axios from 'axios';

const FEATURE_LABELS: Record<string, string> = {
  transcription: 'Transcription complète de votre audio',
  summary: 'Résumé en quelques lignes',
  keypoints: 'Points clés et actions à suivre',
  actions: 'Plan d\'actions',
  quiz: 'Quiz de révision',
};

type Phase = 'idle' | 'estimating' | 'ready' | 'paying' | 'error';

function OneShotSimple() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [estimate, setEstimate] = useState<{
    tier: string;
    price_cents: number;
    max_duration_minutes: number;
    includes: string[];
    warning?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const estimatedMinutes = file ? Math.max(1, Math.ceil(file.size / (1024 * 1024))) : 0;

  const handleFileSelected = async (f: File) => {
    setFile(f);
    setError('');
    setPhase('estimating');
    try {
      const estimatedSeconds = Math.max(60, Math.ceil((f.size / (1024 * 1024)) * 60));
      const resp = await axios.post('/api/oneshot/estimate', { duration_seconds: estimatedSeconds });
      setEstimate(resp.data);
      setPhase('ready');
    } catch {
      setError('Impossible d\'estimer le prix. Vérifiez votre fichier.');
      setPhase('error');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelected(dropped);
  }, []);

  const handlePayAndTranscribe = async () => {
    if (!file || !estimate) return;
    setPhase('paying');
    try {
      // Upload file — /api/oneshot/upload creates order + job in one step
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tier', estimate.tier);
      formData.append('profile', 'generic');
      const uploadResp = await axios.post('/api/oneshot/upload', formData);
      const jobId = uploadResp.data.id;

      // Navigate to waiting screen
      navigate(`/processing/${jobId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du traitement.');
      setPhase('error');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Hero */}
      <div className="text-center pt-4">
        <h1 className="text-3xl lg:text-4xl font-bold text-white">
          Transcrivez votre fichier audio.
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Déposez, on s'occupe du reste.
        </p>
      </div>

      {/* Drop Zone */}
      {phase !== 'paying' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('simpleFileInput')?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-indigo-500 bg-indigo-500/10'
              : file
              ? 'border-indigo-400/50 bg-indigo-500/5'
              : 'border-slate-600 hover:border-indigo-400 bg-slate-800/50'
          }`}
        >
          {file ? (
            <div>
              <FileAudio className="w-14 h-14 mx-auto mb-3 text-indigo-400" />
              <p className="font-semibold text-lg text-white">{file.name}</p>
              <p className="text-sm text-slate-400 mt-1">
                {formatSize(file.size)} · ~{estimatedMinutes} minutes estimées
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setEstimate(null);
                  setPhase('idle');
                  setError('');
                }}
                className="mt-3 text-xs text-slate-500 hover:text-indigo-400 transition-colors"
              >
                Changer de fichier
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-14 h-14 mx-auto mb-3 text-slate-500" />
              <p className="font-medium text-lg text-slate-200">
                Glissez votre fichier ici
              </p>
              <p className="text-sm text-slate-500 mt-1">
                ou cliquez pour parcourir
              </p>
              <p className="text-xs text-slate-600 mt-4">
                MP3, WAV, M4A, MP4... jusqu'à 500 Mo
              </p>
            </div>
          )}
          <input
            id="simpleFileInput"
            type="file"
            accept="audio/*,video/*,.mkv,.avi,.mov"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
            }}
          />
        </div>
      )}

      {/* Estimating spinner */}
      {phase === 'estimating' && (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
          <p className="text-sm text-slate-400 mt-2">Estimation en cours...</p>
        </div>
      )}

      {/* Ready — Price + CTA */}
      {estimate && phase === 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-700 bg-slate-800 p-6"
        >
          <div className="text-center mb-5">
            <p className="text-4xl font-bold text-indigo-400">
              {(estimate.price_cents / 100).toFixed(0)} EUR
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Pour un fichier jusqu'à {estimate.max_duration_minutes} minutes
            </p>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-xs font-medium text-slate-500 mb-1">Vous recevrez :</p>
            {estimate.includes.slice(0, 3).map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {FEATURE_LABELS[f] || f}
              </div>
            ))}
          </div>

          {estimate.warning && (
            <p className="text-sm text-amber-400 mb-4 text-center">{estimate.warning}</p>
          )}

          <button
            onClick={handlePayAndTranscribe}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-lg"
          >
            <CreditCard className="w-5 h-5" />
            Transcrire mon fichier — {(estimate.price_cents / 100).toFixed(0)} EUR
          </button>

          <p className="mt-3 text-center text-xs text-slate-500 flex items-center justify-center gap-3">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Paiement sécurisé</span>
            <span>·</span>
            <span>Résultat en 2-5 min</span>
            <span>·</span>
            <span>Sans abonnement</span>
          </p>
        </motion.div>
      )}

      {/* Paying spinner */}
      {phase === 'paying' && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
          <p className="text-slate-300 mt-3 font-medium">Lancement de la transcription...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-900/20 border border-red-800 p-4 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => {
              setError('');
              setPhase(file && estimate ? 'ready' : 'idle');
            }}
            className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* How it works (only when idle) */}
      {phase === 'idle' && !file && (
        <div className="pt-4">
          <p className="text-sm font-medium text-slate-500 mb-4 text-center">Comment ça marche</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { step: '1', title: 'Déposez', desc: 'Glissez votre fichier audio ou vidéo' },
              { step: '2', title: 'On estime', desc: 'Durée et prix calculés automatiquement' },
              { step: '3', title: 'Recevez', desc: 'Texte, résumé et points clés' },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center">
                  {step}
                </div>
                <p className="font-medium text-sm text-slate-300">{title}</p>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data reassurance (always visible when idle) */}
      {(phase === 'idle' || phase === 'ready') && (
        <p className="text-center text-xs text-slate-600 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Vos données restent 100% locales sur votre machine.
        </p>
      )}
    </motion.div>
  );
}

export default OneShotSimple;
