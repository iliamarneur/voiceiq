import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileAudio, Loader2, CheckCircle, CreditCard, ArrowRight, Clock, Shield, Star, Briefcase, GraduationCap, Stethoscope, Scale, Layers, Globe } from 'lucide-react';
import axios from 'axios';
import { OneshotTier } from '../types';
import TranscriptionProgress from '../components/TranscriptionProgress';
import BackendSelector from '../components/BackendSelector';

const FEATURE_LABELS: Record<string, string> = {
  transcription: 'Transcription complète',
  summary: 'Résumé structuré',
  keypoints: 'Points clés',
  chapters: 'Découpage en chapitres',
  actions: 'Plan d\'actions',
  faq: 'FAQ générée',
  quiz: 'Quiz de révision',
  chat: 'Chat IA',
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

const PROFILES = [
  { id: 'generic', label: 'Générique', icon: Layers, color: 'from-slate-500 to-slate-600' },
  { id: 'business', label: 'Business', icon: Briefcase, color: 'from-blue-500 to-blue-600' },
  { id: 'education', label: 'Éducation', icon: GraduationCap, color: 'from-emerald-500 to-emerald-600' },
  { id: 'medical', label: 'Médical', icon: Stethoscope, color: 'from-rose-500 to-rose-600' },
  { id: 'legal', label: 'Légal', icon: Scale, color: 'from-amber-500 to-amber-600' },
];

function OneshotPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tiers, setTiers] = useState<OneshotTier[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('generic');
  const [estimate, setEstimate] = useState<{tier: string; price_cents: number; max_duration_minutes: number; includes: string[]; warning?: string} | null>(null);
  const [processing, setProcessing] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'estimating' | 'ready' | 'paying' | 'uploading' | 'transcribing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('');
  const [sttBackend, setSttBackend] = useState<string | null>(null);
  const [llmBackend, setLlmBackend] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/oneshot/tiers').then(r => setTiers(r.data)).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelected(dropped);
  }, []);

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
    } catch (err: any) {
      setError('Impossible d\'estimer le prix.');
      setPhase('error');
    }
  };

  const handlePayAndTranscribe = async () => {
    if (!file || !estimate) return;
    setProcessing(true);
    setPhase('paying');
    try {
      // Upload file first — backend handles order + Stripe checkout
      setPhase('uploading');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tier', estimate.tier);
      formData.append('profile', selectedProfile);
      if (language) formData.append('language', language);
      if (sttBackend) formData.append('stt_backend', sttBackend);
      if (llmBackend) formData.append('llm_backend', llmBackend);
      const uploadResp = await axios.post('/api/oneshot/upload', formData);

      // If Stripe checkout URL returned, redirect to payment
      if (uploadResp.data.checkout_url) {
        window.location.href = uploadResp.data.checkout_url;
        return;
      }

      const jobId = uploadResp.data.id;

      setPhase('transcribing');
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const jobResp = await axios.get(`/api/jobs/${jobId}`);
          if (jobResp.data.transcription_id && (jobResp.data.status === 'transcribed' || jobResp.data.status === 'completed')) {
            if (pollRef.current) clearInterval(pollRef.current);
            setPhase('done');
            setTimeout(() => navigate(`/app/transcription/${jobResp.data.transcription_id}`), 1000);
          } else if (jobResp.data.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setError(jobResp.data.error_message || 'Transcription échouée.');
            setPhase('error');
            setProcessing(false);
          }
          if (attempts > 200) {
            if (pollRef.current) clearInterval(pollRef.current);
            setError('Le traitement prend trop de temps.');
            setPhase('error');
            setProcessing(false);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setError('Connexion perdue.');
          setPhase('error');
          setProcessing(false);
        }
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du traitement.');
      setPhase('error');
      setProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  };

  const featureLabel = (f: string) => FEATURE_LABELS[f] || f.replace(/_/g, ' ');

  const recommendedTier = tiers.find(t => t.tier === 'Standard');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8"
    >
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Transcription à la demande</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Choisissez votre formule, déposez votre fichier, recevez votre transcription.
        </p>
      </div>

      {/* Tier grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiers.map(t => {
          const isRecommended = t.tier === 'Standard';
          return (
            <div
              key={t.tier}
              className={`relative rounded-xl border-2 bg-white dark:bg-slate-800 p-5 text-center transition-all ${
                isRecommended
                  ? 'border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/30 scale-[1.02]'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3" /> Populaire
                </div>
              )}
              <p className="font-semibold text-sm text-slate-600 dark:text-slate-300 mt-1">
                {t.label || `Fichier ${t.tier.toLowerCase()}`}
              </p>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" /> jusqu'à {t.max_duration_minutes} min
              </p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                {(t.price_cents / 100).toFixed(0)} EUR
              </p>
              <div className="mt-3 space-y-1 text-left">
                {t.includes.filter(f => AUTO_FEATURES.includes(f)).map(f => (
                  <p key={f} className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    {featureLabel(f)}
                  </p>
                ))}
                {t.includes.filter(f => !AUTO_FEATURES.includes(f)).map(f => (
                  <p key={f} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                    {featureLabel(f)}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drop Zone */}
      {!processing && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById('oneshotFileInput')?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : file
                ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/10'
                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 bg-white dark:bg-slate-800'
            }`}
          >
            {file ? (
              <div>
                <FileAudio className="w-12 h-12 mx-auto mb-3 text-indigo-500" />
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {formatSize(file.size)} — durée estimée ~{estimatedMinutes} min
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setEstimate(null); setPhase('idle'); setError(''); }}
                  className="mt-2 text-xs text-red-500 hover:underline"
                >
                  Changer de fichier
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="font-medium">Glissez votre fichier audio ou vidéo ici</p>
                <p className="text-sm text-slate-500 mt-1">ou cliquez pour parcourir</p>
                <p className="text-xs text-slate-400 mt-3">MP3, WAV, M4A, MP4... max 500 Mo</p>
              </div>
            )}
            <input
              id="oneshotFileInput" type="file" accept="audio/*,video/*,.mkv,.avi,.mov" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); }}
            />
          </div>

          {/* Language selector */}
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Langue de l'audio</p>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-600 dark:text-slate-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-colors"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Profile selector */}
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Profil d'analyse</p>
            <div className="flex flex-wrap gap-2">
              {PROFILES.map(p => {
                const Icon = p.icon;
                const selected = selectedProfile === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfile(p.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selected
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Backend Selector (dev only) */}
      {file && phase === 'ready' && (
        <div className="mb-4">
          <BackendSelector
            modeId="file_upload"
            onSttChange={setSttBackend}
            onLlmChange={setLlmBackend}
          />
        </div>
      )}

      {/* Recap before payment */}
      {estimate && phase === 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 p-6"
        >
          <h3 className="font-bold text-lg mb-4">Récapitulatif</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Fichier</span>
              <span className="font-medium">{file?.name} ({formatSize(file?.size || 0)}, ~{estimatedMinutes} min)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Profil</span>
              <span className="font-medium">{PROFILES.find(p => p.id === selectedProfile)?.label || selectedProfile}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Formule</span>
              <span className="font-medium">
                {tiers.find(t => t.tier === estimate.tier)?.label || estimate.tier} (jusqu'à {estimate.max_duration_minutes} min)
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">Prix</span>
              <span className="font-bold text-xl text-indigo-600 dark:text-indigo-400">{(estimate.price_cents / 100).toFixed(0)} EUR</span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Automatique :</p>
              <div className="flex flex-wrap gap-1">
                {estimate.includes.filter(f => AUTO_FEATURES.includes(f)).map(f => (
                  <span key={f} className="text-xs px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
                    {featureLabel(f)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2 mb-1">Également inclus :</p>
              <div className="flex flex-wrap gap-1">
                {estimate.includes.filter(f => !AUTO_FEATURES.includes(f)).map(f => (
                  <span key={f} className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    {featureLabel(f)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {estimate.warning && (
            <p className="mt-3 text-sm text-amber-600">{estimate.warning}</p>
          )}
          <button
            onClick={handlePayAndTranscribe}
            className="mt-5 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Transcrire mon fichier — {(estimate.price_cents / 100).toFixed(0)} EUR
          </button>
          <p className="mt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Paiement sécurisé</span>
            <span>Résultat en 2-5 min</span>
            <span>Sans abonnement</span>
          </p>
        </motion.div>
      )}

      {/* Processing progress */}
      {processing && phase !== 'error' && (
        <TranscriptionProgress
          filename={file?.name || ''}
          estimatedMinutes={estimatedMinutes}
          profile={selectedProfile}
          phase={
            phase === 'paying' ? 'uploading' :
            phase === 'uploading' ? 'uploading' :
            phase === 'transcribing' ? 'transcribing' :
            phase === 'done' ? 'done' : 'uploading'
          }
        />
      )}

      {/* Error — keeps file and estimate */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => { setError(''); setPhase(file && estimate ? 'ready' : 'idle'); setProcessing(false); }}
            className="mt-2 text-xs text-red-500 hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* One-shot vs subscription comparison */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-300 mb-3">One-shot vs abonnement</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="font-medium text-indigo-600 dark:text-indigo-400 mb-1">One-shot Standard</p>
            <p className="text-slate-500">6 EUR pour 1 fichier (1h max)</p>
            <p className="text-xs text-slate-400 mt-1">= {(600 / 60).toFixed(2)} EUR/min</p>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="font-medium text-emerald-600 dark:text-emerald-400 mb-1">Abonnement Basic</p>
            <p className="text-slate-500">19 EUR/mois pour 500 min</p>
            <p className="text-xs text-slate-400 mt-1">= 0.038 EUR/min — jusqu'à 3x moins cher</p>
          </div>
        </div>
        <div className="mt-3 text-center">
          <Link
            to="/app/plans"
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
          >
            Voir les abonnements <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default OneshotPage;
