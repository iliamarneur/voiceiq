import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileAudio, Loader2, CheckCircle, XCircle, Mic2, Files, Trash2, GraduationCap, Briefcase, Sparkles, HeartPulse, Landmark, Clock, Zap, AlertTriangle, RotateCcw, Settings2 } from 'lucide-react';
import axios from 'axios';
import { Profile, AudioPreset } from '../types';
import MinutesEstimate from '../components/MinutesEstimate';
import TranscriptionProgress from '../components/TranscriptionProgress';
import BackendSelector from '../components/BackendSelector';
import { useAuth } from '../contexts/AuthContext';

interface BatchJob {
  id: string;
  filename: string;
  status: string;
  transcription_id?: string | null;
  priority?: string;
  estimated_seconds?: number | null;
  error_message?: string | null;
}

const PROFILE_ICONS: Record<string, any> = {
  GraduationCap, Briefcase, Sparkles, HeartPulse, Landmark, Scale: Landmark,
};

function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('generic');
  const [selectedPriority, setSelectedPriority] = useState('P1');
  const [presets, setPresets] = useState<AudioPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('fr');
  const [sttBackend, setSttBackend] = useState<string | null>(null);
  const [llmBackend, setLlmBackend] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    axios.get('/api/profiles').then(r => setProfiles(r.data)).catch(() => {});
    axios.get('/api/presets').then(r => setPresets(r.data)).catch(() => {});
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setPhase('uploading');
    setError('');

    try {
      if (files.length === 1) {
        // Single file upload
        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('profile', selectedProfile);
        formData.append('priority', selectedPriority);
        if (selectedPreset) formData.append('preset_id', selectedPreset);
        if (selectedLanguage) formData.append('language', selectedLanguage);
        if (sttBackend) formData.append('stt_backend', sttBackend);
        if (llmBackend) formData.append('llm_backend', llmBackend);
        const res = await axios.post('/api/upload', formData, {
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
          },
        });
        setPhase('transcribing');
        setProgress(0);
        pollJob(res.data.id);
      } else {
        // Batch upload
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        formData.append('profile', selectedProfile);
        formData.append('priority', selectedPriority);
        if (selectedPreset) formData.append('preset_id', selectedPreset);
        if (selectedLanguage) formData.append('language', selectedLanguage);
        if (sttBackend) formData.append('stt_backend', sttBackend);
        if (llmBackend) formData.append('llm_backend', llmBackend);
        const res = await axios.post('/api/upload/batch', formData, {
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
          },
        });
        setBatchJobs(res.data.jobs);
        setPhase('transcribing');
        setProgress(0);
        pollBatchJobs(res.data.jobs);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
      setPhase('error');
      setUploading(false);
    }
  };

  const pollJob = async (id: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await axios.get(`/api/jobs/${id}`);
        // Redirect as soon as transcription is ready (don't wait for analyses)
        if (res.data.transcription_id && (res.data.status === 'transcribed' || res.data.status === 'completed')) {
          clearInterval(interval);
          setPhase('done');
          setTimeout(() => navigate(`/transcription/${res.data.transcription_id}`), 500);
        } else if (res.data.status === 'failed') {
          clearInterval(interval);
          setError(res.data.error_message || 'Transcription echouee');
          setPhase('error');
          setUploading(false);
        } else {
          // Still processing
          if (res.data.status === 'processing') {
            setProgress(Math.min(90, attempts * 3));
            if (attempts > 15) setPhase('analyzing');
          } else {
            setProgress(Math.min(90, attempts * 5));
          }
        }
        // Timeout after 10 minutes
        if (attempts > 200) {
          clearInterval(interval);
          setError('Le traitement prend trop de temps. Consultez le dashboard.');
          setPhase('error');
          setUploading(false);
        }
      } catch {
        clearInterval(interval);
        setError('Connexion perdue');
        setPhase('error');
        setUploading(false);
      }
    }, 3000);
  };

  const pollBatchJobs = async (jobs: BatchJob[]) => {
    const interval = setInterval(async () => {
      try {
        const updates = await Promise.all(
          jobs.map(j => axios.get(`/api/jobs/${j.id}`).then(r => r.data))
        );
        const updated = jobs.map((j, i) => ({
          ...j,
          status: updates[i].status,
          transcription_id: updates[i].transcription_id,
        }));
        setBatchJobs(updated);

        const allDone = updated.every(j => j.status === 'completed' || j.status === 'transcribed' || j.status === 'failed');
        if (allDone) {
          clearInterval(interval);
          setPhase('done');
        }
      } catch {
        clearInterval(interval);
        setPhase('error');
        setUploading(false);
      }
    }, 3000);
  };

  const retryJob = async (jobId: string) => {
    try {
      await axios.post(`/api/jobs/${jobId}/retry`);
      setBatchJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'pending' } : j));
      pollBatchJobs(batchJobs);
    } catch {}
  };

  const formatTime = (seconds: number | null | undefined) => {
    if (!seconds) return '';
    if (seconds < 60) return `~${Math.round(seconds)}s`;
    return `~${Math.round(seconds / 60)}min`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-6 lg:p-8 max-w-2xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload Audio</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Transform your audio into actionable knowledge</p>
      </div>

      {/* Drop Zone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && document.getElementById('fileInput')?.click()}
        whileHover={!uploading ? { scale: 1.01 } : {}}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300
          ${dragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
            : files.length
              ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-700'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800'}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
        <div className="relative">
          {files.length > 0 ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                {files.length > 1 ? <Files className="w-8 h-8 text-white" /> : <FileAudio className="w-8 h-8 text-white" />}
              </div>
              <p className="text-lg font-semibold">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
              <p className="text-sm text-slate-500 mt-1">{formatSize(files.reduce((s, f) => s + f.size, 0))} total</p>
            </motion.div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium">Drop your audio files here</p>
              <p className="text-sm text-slate-500 mt-2">or click to browse (multiple files supported)</p>
              <p className="text-xs text-slate-400 mt-4">Audio : MP3, WAV, M4A, FLAC, OGG, AAC, OPUS</p>
              <p className="text-xs text-slate-400 mt-1">Video : MP4, MKV, AVI, MOV, WMV, WEBM</p>
              <p className="text-xs text-slate-400 mt-1">Taille max : 2 Go</p>
            </>
          )}
        </div>
        <input
          id="fileInput" type="file" accept="audio/*,video/*,.mkv,.avi,.mov,.wmv,.flv,.ts" multiple className="hidden"
          onChange={(e) => {
            if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
          }}
        />
      </motion.div>

      {/* File List */}
      {files.length > 1 && !uploading && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <FileAudio className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="flex-1 text-sm truncate">{f.name}</span>
              <span className="text-xs text-slate-400">{formatSize(f.size)}</span>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Batch Progress */}
      {batchJobs.length > 1 && uploading && (
        <div className="mt-6 space-y-2">
          {batchJobs.map((j, i) => (
            <div key={j.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {j.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : j.status === 'failed' ? (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : j.status === 'pending' ? (
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
              )}
              <span className="flex-1 text-sm truncate">{j.filename}</span>
              {j.estimated_seconds && j.status !== 'completed' && j.status !== 'failed' && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{formatTime(j.estimated_seconds)}
                </span>
              )}
              {j.priority === 'P0' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">P0</span>
              )}
              <span className={`text-xs font-medium ${
                j.status === 'completed' ? 'text-green-500' : j.status === 'transcribed' ? 'text-emerald-500' : j.status === 'failed' ? 'text-red-500' : j.status === 'pending' ? 'text-amber-500' : 'text-indigo-500'
              }`}>
                {j.status === 'pending' ? 'en attente' : j.status === 'processing' ? 'en cours' : j.status === 'transcribed' ? 'transcrit' : j.status === 'completed' ? 'termine' : 'echec'}
              </span>
              {(j.status === 'completed' || j.status === 'transcribed') && j.transcription_id && (
                <button
                  onClick={() => navigate(`/transcription/${j.transcription_id}`)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Voir
                </button>
              )}
              {j.status === 'failed' && (
                <button
                  onClick={() => retryJob(j.id)}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Single file progress */}
      {uploading && batchJobs.length <= 1 && phase !== 'error' && (
        <div className="mt-6">
          <TranscriptionProgress
            filename={files[0]?.name || ''}
            estimatedMinutes={files[0] ? Math.max(1, Math.ceil(files[0].size / (1024 * 1024))) : undefined}
            profile={selectedProfile}
            phase={phase as 'uploading' | 'transcribing' | 'analyzing' | 'done'}
          />
        </div>
      )}

      {/* Profile Selector */}
      {profiles.length > 0 && !uploading && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Pipeline d'analyse</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {profiles.map((p) => {
              const Icon = PROFILE_ICONS[p.icon] || Sparkles;
              const isSelected = selectedProfile === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfile(p.id)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{p.description}</span>
                  <span className="text-xs text-slate-400">{p.analyses.length} analyses</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset (user) + Priority (admin only) */}
      {!uploading && files.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          {/* Priority — admin only */}
          {isAdmin && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priorite</label>
              <div className="flex gap-2">
                {[
                  { value: 'P0', label: 'Urgent', color: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400', icon: Zap },
                  { value: 'P1', label: 'Normal', color: 'border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300', icon: Clock },
                  { value: 'P2', label: 'Basse', color: 'border-slate-200 bg-slate-50 dark:bg-slate-800/50 text-slate-500', icon: Clock },
                ].map(({ value, label, color, icon: PIcon }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedPriority(value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                      selectedPriority === value ? color + ' shadow-sm' : 'border-transparent bg-slate-100 dark:bg-slate-700 text-slate-400'
                    }`}
                  >
                    <PIcon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preset */}
          {presets.length > 0 && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Settings2 className="w-3.5 h-3.5 inline mr-1" />Preset audio
              </label>
              <select
                value={selectedPreset || ''}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setSelectedPreset(id);
                  if (id) {
                    const preset = presets.find(p => p.id === id);
                    if (preset) setSelectedProfile(preset.profile_id);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Aucun preset</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.audio_type ? ` (${p.audio_type})` : ''}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Language Selector */}
      {!uploading && files.length > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Langue de l'audio</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Auto-detection</option>
            <option value="fr">Francais</option>
            <option value="en">English</option>
            <option value="es">Espanol</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Portugues</option>
            <option value="nl">Nederlands</option>
            <option value="ru">Russkiy</option>
            <option value="zh">Zhongwen</option>
            <option value="ja">Nihongo</option>
            <option value="ko">Hangugeo</option>
            <option value="ar">Arabiya</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">Forcer la langue ameliore la precision de la transcription</p>
        </div>
      )}

      {/* Backend Selector — admin only */}
      {isAdmin && !uploading && files.length > 0 && (
        <div className="mt-4">
          <BackendSelector
            modeId="file_upload"
            onSttChange={setSttBackend}
            onLlmChange={setLlmBackend}
          />
        </div>
      )}

      {/* Minutes Estimate */}
      {!uploading && files.length > 0 && (
        <MinutesEstimate files={files} />
      )}

      {/* Upload Button */}
      {!uploading && (
        <motion.button
          onClick={handleUpload}
          disabled={!files.length}
          whileHover={files.length ? { scale: 1.02 } : {}}
          whileTap={files.length ? { scale: 0.98 } : {}}
          className="mt-6 w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:shadow-none hover:shadow-xl transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <Mic2 className="w-5 h-5" />
            {files.length > 1 ? `Transcribe ${files.length} Files` : 'Transcribe & Analyze'}
          </span>
        </motion.button>
      )}

      {phase === 'done' && batchJobs.length > 1 && (
        <div className="mt-4 text-center">
          <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline text-sm font-medium">
            Go to Dashboard
          </button>
        </div>
      )}

      {error && !uploading && (
        <p className="mt-4 text-center text-red-500 text-sm">{error}</p>
      )}
    </motion.div>
  );
}

export default UploadPage;
