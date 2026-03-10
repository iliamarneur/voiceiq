import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Upload, FileAudio, Loader2, CreditCard, Shield, CheckCircle, Sparkles, ArrowRight, Globe } from 'lucide-react';
import axios from 'axios';

const FEATURE_LABELS: Record<string, string> = {
  transcription: 'Transcription complète',
  summary: 'Résumé structuré',
  keypoints: 'Points clés',
  chapters: 'Découpage en chapitres',
  actions: 'Plan d\'actions',
  faq: 'FAQ générée',
  quiz: 'Quiz de révision',
  flashcards: 'Flashcards',
  export_md: 'Export Markdown',
  export_pdf: 'Export PDF',
};

const AUTO_FEATURES = ['transcription', 'summary', 'keypoints', 'chapters'];

const LANGUAGES = [
  { code: '', label: 'Détection automatique' },
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'Українська' },
];

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
  const [language, setLanguage] = useState('');
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
      // Upload file first — backend creates job + order + Stripe checkout
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tier', estimate.tier);
      formData.append('profile', 'generic');
      if (language) formData.append('language', language);
      const uploadResp = await axios.post('/api/oneshot/upload', formData);

      // If Stripe checkout URL returned, redirect to payment
      if (uploadResp.data.checkout_url) {
        window.location.href = uploadResp.data.checkout_url;
        return;
      }

      // Stub mode: transcription started immediately
      const jobId = uploadResp.data.id;
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
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-800">
          Transcrivez votre fichier audio.
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
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
              ? 'border-indigo-500 bg-indigo-50'
              : file
              ? 'border-indigo-400/50 bg-indigo-50/50'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50'
          }`}
        >
          {file ? (
            <div>
              <FileAudio className="w-14 h-14 mx-auto mb-3 text-indigo-500" />
              <p className="font-semibold text-lg text-slate-800">{file.name}</p>
              <p className="text-sm text-slate-500 mt-1">
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
                className="mt-3 text-xs text-slate-400 hover:text-indigo-500 transition-colors"
              >
                Changer de fichier
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-14 h-14 mx-auto mb-3 text-slate-400" />
              <p className="font-medium text-lg text-slate-700">
                Glissez votre fichier ici
              </p>
              <p className="text-sm text-slate-400 mt-1">
                ou cliquez pour parcourir
              </p>
              <p className="text-xs text-slate-400 mt-4">
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

      {/* Language selector — shown after file is selected */}
      {file && phase !== 'paying' && (
        <div className="flex items-center justify-center gap-3">
          <Globe className="w-4 h-4 text-slate-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-colors"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Estimating spinner */}
      {phase === 'estimating' && (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
          <p className="text-sm text-slate-500 mt-2">Estimation en cours...</p>
        </div>
      )}

      {/* Ready — Price + CTA */}
      {estimate && phase === 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-200 bg-white shadow-sm p-6"
        >
          <div className="text-center mb-5">
            <p className="text-4xl font-bold text-indigo-600">
              {(estimate.price_cents / 100).toFixed(0)} EUR
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Pour un fichier jusqu'à {estimate.max_duration_minutes} minutes
            </p>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-xs font-medium text-slate-400 mb-1">Généré automatiquement :</p>
            {estimate.includes.filter(f => AUTO_FEATURES.includes(f)).map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {FEATURE_LABELS[f] || f}
              </div>
            ))}
            {estimate.includes.filter(f => !AUTO_FEATURES.includes(f)).length > 0 && (
              <>
                <p className="text-xs font-medium text-slate-400 mt-3 mb-1">Également inclus :</p>
                {estimate.includes.filter(f => !AUTO_FEATURES.includes(f)).map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    {FEATURE_LABELS[f] || f}
                  </div>
                ))}
              </>
            )}
          </div>

          {estimate.warning && (
            <p className="text-sm text-amber-600 mb-4 text-center">{estimate.warning}</p>
          )}

          <button
            onClick={handlePayAndTranscribe}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-lg"
          >
            <CreditCard className="w-5 h-5" />
            Transcrire mon fichier — {(estimate.price_cents / 100).toFixed(0)} EUR
          </button>

          <p className="mt-3 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Paiement sécurisé</span>
            <span>·</span>
            <span>Résultat rapide</span>
            <span>·</span>
            <span>Sans abonnement</span>
          </p>
        </motion.div>
      )}

      {/* Paying spinner */}
      {phase === 'paying' && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
          <p className="text-slate-600 mt-3 font-medium">Lancement de la transcription...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => {
              setError('');
              setPhase(file && estimate ? 'ready' : 'idle');
            }}
            className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* How it works (only when idle) */}
      {phase === 'idle' && !file && (
        <div className="pt-4">
          <p className="text-sm font-medium text-slate-400 mb-4 text-center">Comment ça marche</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { step: '1', title: 'Déposez', desc: 'Glissez votre fichier audio ou vidéo' },
              { step: '2', title: 'On estime', desc: 'Durée et prix calculés automatiquement' },
              { step: '3', title: 'Recevez', desc: 'Texte, résumé et points clés' },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm flex items-center justify-center">
                  {step}
                </div>
                <p className="font-medium text-sm text-slate-700">{title}</p>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upsell — remind about subscriptions */}
      {estimate && phase === 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                Vous transcrivez régulièrement ?
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Nos abonnements démarrent à 19 EUR/mois pour 500 minutes, avec 11 analyses IA, chat, export PDF et bien plus.
              </p>
              <Link
                to="/plans"
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Découvrir les offres <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Data reassurance */}
      {(phase === 'idle' || phase === 'ready') && (
        <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Vos fichiers ne sont jamais conservés sur nos serveurs.
        </p>
      )}
    </motion.div>
  );
}

export default OneShotSimple;
