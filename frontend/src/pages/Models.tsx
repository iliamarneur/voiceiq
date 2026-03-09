import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Mic2, Cloud, Settings2, Check, Loader2, AlertTriangle, HardDrive, Zap, Radio, ChevronRight, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface LlmModel {
  name: string;
  size_gb: number;
  modified_at?: string;
}

interface WhisperModel {
  name: string;
  description: string;
  size_gb: number;
  recommended_for: string;
}

interface WhisperInfo {
  transcription_model: string;
  dictation_model: string;
  device: string;
  compute_type: string;
  gpu_available: boolean;
  gpu_name: string | null;
  available_models: WhisperModel[];
}

interface OpenAIModel {
  name: string;
  description: string;
  context: string;
}

interface OpenAIInfo {
  current: string;
  models: OpenAIModel[];
  configured: boolean;
}

interface BackendInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  available: boolean;
}

interface BackendsData {
  stt: Record<string, BackendInfo>;
  llm: Record<string, BackendInfo>;
  modes: Record<string, { stt_backend: string; llm_backend: string }>;
}

const MODE_LABELS: Record<string, { label: string; icon: any; description: string }> = {
  file_upload: { label: 'Upload fichier', icon: HardDrive, description: 'Fichiers audio/video uploades' },
  recording: { label: 'Enregistrement', icon: Radio, description: 'Enregistrement depuis le micro' },
  live_dictation: { label: 'Dictee en direct', icon: Zap, description: 'Transcription en temps reel' },
};

function ModelsPage() {
  const [llmModels, setLlmModels] = useState<LlmModel[]>([]);
  const [currentLlm, setCurrentLlm] = useState('');
  const [whisperInfo, setWhisperInfo] = useState<WhisperInfo | null>(null);
  const [backends, setBackends] = useState<BackendsData | null>(null);
  const [openaiInfo, setOpenaiInfo] = useState<OpenAIInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingLlm, setChangingLlm] = useState(false);
  const [changingOpenai, setChangingOpenai] = useState(false);
  const [savingMode, setSavingMode] = useState<string | null>(null);
  const [changingWhisper, setChangingWhisper] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [llmRes, whisperRes, backendsRes, openaiRes] = await Promise.all([
        axios.get('/api/llm/models').catch(() => ({ data: { models: [], current: '' } })),
        axios.get('/api/whisper/info').catch(() => ({ data: null })),
        axios.get('/api/backends').catch(() => ({ data: null })),
        axios.get('/api/openai/models').catch(() => ({ data: null })),
      ]);
      setLlmModels(llmRes.data.models || []);
      setCurrentLlm(llmRes.data.current || '');
      setWhisperInfo(whisperRes.data);
      setBackends(backendsRes.data);
      setOpenaiInfo(openaiRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleChangeLlm = async (model: string) => {
    setChangingLlm(true);
    try {
      await axios.put('/api/llm/model', { model });
      setCurrentLlm(model);
      showToast(`Modele LLM change : ${model}`);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Erreur');
    }
    setChangingLlm(false);
  };

  const handleOpenaiChange = async (model: string) => {
    setChangingOpenai(true);
    try {
      await axios.put('/api/openai/model', { model });
      if (openaiInfo) {
        setOpenaiInfo({ ...openaiInfo, current: model });
      }
      showToast(`Modele OpenAI change : ${model}`);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Erreur');
    }
    setChangingOpenai(false);
  };

  const handleWhisperChange = async (field: 'transcription_model' | 'dictation_model', value: string) => {
    setChangingWhisper(true);
    try {
      await axios.put('/api/whisper/model', { [field]: value });
      // Update local state
      if (whisperInfo) {
        setWhisperInfo({ ...whisperInfo, [field]: value });
      }
      const label = field === 'transcription_model' ? 'Transcription' : 'Dictee';
      showToast(`Modele Whisper ${label} change : ${value}`);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Erreur');
    }
    setChangingWhisper(false);
  };

  const handleModeBackendChange = async (modeId: string, field: 'stt_backend' | 'llm_backend', value: string) => {
    setSavingMode(modeId);
    try {
      await axios.put(`/api/backends/mode/${modeId}`, { [field]: value });
      // Update local state
      if (backends) {
        const updated = { ...backends };
        updated.modes = { ...updated.modes, [modeId]: { ...updated.modes[modeId], [field]: value } };
        setBackends(updated);
      }
      showToast(`${MODE_LABELS[modeId]?.label || modeId} mis a jour`);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Erreur');
    }
    setSavingMode(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Modeles & Backends</h1>
            <p className="text-sm text-slate-500">Gerez vos modeles STT et LLM au meme endroit</p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Rafraichir
        </button>
      </div>

      {/* ── Active config summary ──────────────────── */}
      {backends && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800">
          <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">Configuration active — Upload fichier</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ActiveBadge
              label="STT Backend"
              value={backends.stt[backends.modes.file_upload?.stt_backend]?.name || backends.modes.file_upload?.stt_backend}
              isPremium={backends.modes.file_upload?.stt_backend !== 'stt_open_source'}
            />
            <ActiveBadge
              label="Modele STT"
              value={backends.modes.file_upload?.stt_backend === 'stt_open_source' ? (whisperInfo?.transcription_model || '—') : 'whisper-1'}
              isPremium={backends.modes.file_upload?.stt_backend !== 'stt_open_source'}
            />
            <ActiveBadge
              label="LLM Backend"
              value={backends.llm[backends.modes.file_upload?.llm_backend]?.name || backends.modes.file_upload?.llm_backend}
              isPremium={backends.modes.file_upload?.llm_backend !== 'llm_open_source'}
            />
            <ActiveBadge
              label="Modele LLM"
              value={backends.modes.file_upload?.llm_backend === 'llm_openai' ? (openaiInfo?.current || '—') : (backends.modes.file_upload?.llm_backend === 'llm_open_source' ? (currentLlm || 'Ollama') : '—')}
              isPremium={backends.modes.file_upload?.llm_backend !== 'llm_open_source'}
            />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* ── Section 1: Whisper STT ──────────────────── */}
        <Section
          icon={Mic2}
          title="Whisper — Transcription (STT)"
          description="Modele de transcription parole vers texte"
          badge={whisperInfo?.gpu_available ? 'GPU' : 'CPU'}
          badgeColor={whisperInfo?.gpu_available ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
        >
          {whisperInfo ? (
            <div className="space-y-4">
              {/* GPU info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {whisperInfo.gpu_available && whisperInfo.gpu_name && (
                  <InfoCard label="GPU" value={whisperInfo.gpu_name} detail="CUDA actif" />
                )}
                {!whisperInfo.gpu_available && (
                  <InfoCard label="GPU" value="Non detecte" detail="Whisper tourne sur CPU" warn />
                )}
                <InfoCard label="Compute" value={`${whisperInfo.device.toUpperCase()} / ${whisperInfo.compute_type}`} detail="Configuration active" />
              </div>

              {/* Transcription model selector */}
              <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Modele transcription (upload / enregistrement)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {whisperInfo.available_models.filter(m => ['large-v3', 'large-v2', 'medium', 'small'].includes(m.name)).map(m => {
                    const isActive = m.name === whisperInfo.transcription_model;
                    return (
                      <button
                        key={m.name}
                        onClick={() => !isActive && handleWhisperChange('transcription_model', m.name)}
                        disabled={changingWhisper}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 cursor-pointer'
                        } disabled:opacity-50`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm font-semibold">{m.name}</span>
                          {isActive ? <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" /> : <span className="text-xs text-slate-400">{m.size_gb} GB</span>}
                        </div>
                        <p className="text-xs text-slate-500">{m.description}</p>
                        {isActive && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mt-1">Actif</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dictation model selector */}
              <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Modele dictee (temps reel)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {whisperInfo.available_models.filter(m => ['small', 'base', 'tiny'].includes(m.name)).map(m => {
                    const isActive = m.name === whisperInfo.dictation_model;
                    return (
                      <button
                        key={m.name}
                        onClick={() => !isActive && handleWhisperChange('dictation_model', m.name)}
                        disabled={changingWhisper}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 cursor-pointer'
                        } disabled:opacity-50`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm font-semibold">{m.name}</span>
                          {isActive ? <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" /> : <span className="text-xs text-slate-400">{m.size_gb} GB</span>}
                        </div>
                        <p className="text-xs text-slate-500">{m.description}</p>
                        {isActive && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mt-1">Actif</span>}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Cliquez pour changer de modele. Le nouveau modele se charge a la prochaine transcription.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Information Whisper non disponible — redemarrez le backend.</p>
          )}
        </Section>

        {/* ── Section 2: LLM Ollama ──────────────────── */}
        <Section
          icon={Cpu}
          title="LLM — Analyse (Ollama)"
          description="Modele de langage pour resumes, points cles, actions..."
          badge={llmModels.length > 0 ? `${llmModels.length} modeles` : 'hors ligne'}
          badgeColor={llmModels.length > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
        >
          {llmModels.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {llmModels.map(m => {
                  const isActive = m.name === currentLlm;
                  return (
                    <button
                      key={m.name}
                      onClick={() => !isActive && handleChangeLlm(m.name)}
                      disabled={changingLlm}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 cursor-pointer'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm font-semibold truncate">{m.name}</span>
                        {isActive && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{m.size_gb} GB</span>
                        {isActive && <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">Actif</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">
                Cliquez sur un modele pour l'activer. Pour en ajouter : <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">ollama pull nom-du-modele</code>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Ollama non connecte</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">Verifiez que Ollama est lance sur le port 11434</p>
              </div>
            </div>
          )}
        </Section>

        {/* ── Section 2b: OpenAI ChatGPT ──────────────── */}
        {openaiInfo && openaiInfo.configured && (
          <Section
            icon={Cloud}
            title="LLM — OpenAI ChatGPT"
            description="Modele OpenAI pour les analyses (quand backend = llm_openai)"
            badge={openaiInfo.current}
            badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {openaiInfo.models.map(m => {
                  const isActive = m.name === openaiInfo.current;
                  return (
                    <button
                      key={m.name}
                      onClick={() => !isActive && handleOpenaiChange(m.name)}
                      disabled={changingOpenai}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-green-200 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm font-semibold">{m.name}</span>
                        {isActive && <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500">{m.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">{m.context}</span>
                        {isActive && <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Actif</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">
                Cliquez pour changer le modele. Actif quand un mode utilise le backend <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">llm_openai</code>.
              </p>
            </div>
          </Section>
        )}

        {/* ── Section 3: Backends par mode ────────────── */}
        {backends && (
          <Section
            icon={Settings2}
            title="Backends par mode d'entree"
            description="Choisissez quel backend STT et LLM utiliser pour chaque mode"
          >
            <div className="space-y-4">
              {Object.entries(MODE_LABELS).map(([modeId, { label, icon: MIcon, description }]) => {
                const modeConfig = backends.modes[modeId];
                if (!modeConfig) return null;
                const isSaving = savingMode === modeId;

                return (
                  <div
                    key={modeId}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <MIcon className="w-4 h-4 text-slate-500" />
                      <div>
                        <h4 className="text-sm font-semibold">{label}</h4>
                        <p className="text-xs text-slate-400">{description}</p>
                      </div>
                      {isSaving && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin ml-auto" />}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* STT selector */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                          STT (Transcription)
                        </label>
                        <select
                          value={modeConfig.stt_backend}
                          onChange={e => handleModeBackendChange(modeId, 'stt_backend', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {Object.entries(backends.stt).map(([id, info]) => (
                            <option key={id} value={id} disabled={!info.available}>
                              {info.name} {!info.available ? '(cle manquante)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* LLM selector */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                          LLM (Analyses)
                        </label>
                        <select
                          value={modeConfig.llm_backend}
                          onChange={e => handleModeBackendChange(modeId, 'llm_backend', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {Object.entries(backends.llm).map(([id, info]) => (
                            <option key={id} value={id} disabled={!info.available}>
                              {info.name} {!info.available ? '(cle manquante)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}

              <p className="text-xs text-slate-400">
                Les changements sont appliques immediatement (en memoire). Pour persister, modifier <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">config/audio_backends.json</code>.
              </p>
            </div>
          </Section>
        )}

        {/* ── Section 4: APIs premium ─────────────────── */}
        <Section
          icon={Cloud}
          title="APIs premium (optionnel)"
          description="Connectez des APIs externes pour comparer qualite et vitesse"
        >
          <div className="space-y-3">
            {backends && (
              <>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">STT</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(backends.stt).filter(([id]) => id !== 'stt_open_source').map(([id, info]) => (
                    <ApiCard key={id} info={info} />
                  ))}
                </div>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4">LLM</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(backends.llm).filter(([id]) => id !== 'llm_open_source').map(([id, info]) => (
                    <ApiCard key={id} info={info} />
                  ))}
                </div>
              </>
            )}
            <p className="text-xs text-slate-400">
              Pour activer un backend premium, definissez la variable d'environnement correspondante dans <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">.env</code> et redemarrez le backend.
            </p>
          </div>
        </Section>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 px-4 py-3 rounded-xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-sm font-medium shadow-lg z-50"
        >
          {toast}
        </motion.div>
      )}
    </motion.div>
  );
}


function Section({ icon: Icon, title, description, badge, badgeColor, children }: {
  icon: any; title: string; description: string; badge?: string; badgeColor?: string; children: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-indigo-500" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            {badge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor || 'bg-slate-100 text-slate-600'}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}


function InfoCard({ label, value, detail, warn }: { label: string; value: string; detail: string; warn?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${warn ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold font-mono ${warn ? 'text-amber-600 dark:text-amber-400' : ''}`}>{value}</p>
      <p className="text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}


function ActiveBadge({ label, value, isPremium }: { label: string; value: string; isPremium: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-xl border ${
      isPremium
        ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
        : 'border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800'
    }`}>
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold font-mono truncate ${isPremium ? 'text-green-700 dark:text-green-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
        {value}
      </p>
      {isPremium && <p className="text-[9px] text-green-500 font-medium">PREMIUM</p>}
    </div>
  );
}


function ApiCard({ info }: { info: BackendInfo }) {
  return (
    <div className={`p-3 rounded-xl border transition-all ${
      info.available
        ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{info.name}</span>
        {info.available ? (
          <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">Connecte</span>
        ) : (
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">Non configure</span>
        )}
      </div>
      <p className="text-xs text-slate-500">{info.description}</p>
    </div>
  );
}


export default ModelsPage;
