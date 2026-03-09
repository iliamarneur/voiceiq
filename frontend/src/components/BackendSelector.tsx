import React, { useState, useEffect } from 'react';
import { Settings2, Cpu, Cloud, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

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

interface Props {
  modeId: string;
  onSttChange: (backendId: string | null) => void;
  onLlmChange: (backendId: string | null) => void;
}

/**
 * Backend selector for STT/LLM — visible only in dev mode.
 * Shows current backends and allows override for testing.
 */
export default function BackendSelector({ modeId, onSttChange, onLlmChange }: Props) {
  const [backends, setBackends] = useState<BackendsData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sttOverride, setSttOverride] = useState<string | null>(null);
  const [llmOverride, setLlmOverride] = useState<string | null>(null);

  // Only show in dev mode
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;

  useEffect(() => {
    axios.get('/api/backends').then(r => setBackends(r.data)).catch(() => {});
  }, []);

  if (!backends) return null;

  const modeConfig = backends.modes[modeId];
  if (!modeConfig) return null;

  const currentStt = sttOverride || modeConfig.stt_backend;
  const currentLlm = llmOverride || modeConfig.llm_backend;
  const sttInfo = backends.stt[currentStt];
  const llmInfo = backends.llm[currentLlm];

  const handleSttChange = (value: string) => {
    const override = value === modeConfig.stt_backend ? null : value;
    setSttOverride(override);
    onSttChange(override);
  };

  const handleLlmChange = (value: string) => {
    const override = value === modeConfig.llm_backend ? null : value;
    setLlmOverride(override);
    onLlmChange(override);
  };

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-amber-700 font-medium"
      >
        <Settings2 size={14} />
        <span>Backend: {sttInfo?.name || currentStt} / {llmInfo?.name || currentLlm}</span>
        <span className="ml-auto text-amber-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* STT Backend */}
          <div>
            <label className="flex items-center gap-1 text-xs text-amber-600 font-medium mb-1">
              <Cpu size={12} /> STT (Transcription)
            </label>
            <select
              value={currentStt}
              onChange={e => handleSttChange(e.target.value)}
              className="w-full border border-amber-200 rounded px-2 py-1 text-xs bg-white"
            >
              {Object.entries(backends.stt).map(([id, info]) => (
                <option key={id} value={id} disabled={!info.available}>
                  {info.name} {!info.available ? '(non configuré)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* LLM Backend */}
          <div>
            <label className="flex items-center gap-1 text-xs text-amber-600 font-medium mb-1">
              <Cloud size={12} /> LLM (Analyses)
            </label>
            <select
              value={currentLlm}
              onChange={e => handleLlmChange(e.target.value)}
              className="w-full border border-amber-200 rounded px-2 py-1 text-xs bg-white"
            >
              {Object.entries(backends.llm).map(([id, info]) => (
                <option key={id} value={id} disabled={!info.available}>
                  {info.name} {!info.available ? '(non configuré)' : ''}
                </option>
              ))}
            </select>
          </div>

          {(sttOverride || llmOverride) && (
            <p className="text-xs text-amber-500 italic">
              Override actif — les backends par défaut seront restaurés au rechargement.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
