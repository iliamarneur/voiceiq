import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Pause, Square, Play, Copy, Save, Loader2, ArrowLeft, Check, Sparkles, PenLine } from 'lucide-react';
import axios from 'axios';
import { DictationSession } from '../types';

type DictateState = 'idle' | 'recording' | 'paused' | 'stopped' | 'finalizing' | 'saving';

// Extend Window for webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Interval (ms) between backend chunk transcriptions (Firefox fallback)
const CHUNK_INTERVAL_MS = 5000;

function DictatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = (location.state as any)?.profile || 'generic';

  const [state, setState] = useState<DictateState>('idle');
  const [session, setSession] = useState<DictationSession | null>(null);
  const [liveText, setLiveText] = useState(''); // Real-time text from Web Speech API or backend chunks
  const [interimText, setInterimText] = useState(''); // Current partial recognition
  const [finalText, setFinalText] = useState(''); // High-quality text from backend STT
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]); // Full audio recording
  const sessionIdRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const liveTextRef = useRef(''); // Accumulated final transcript from Speech API

  // Firefox fallback refs
  const chunkRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIntervalRef = useRef<number | null>(null);
  const chunkBufferRef = useRef<Blob[]>([]);
  const sendingChunkRef = useRef(false);

  // Display text: edited > final (refined) > live
  const displayText = editedText || finalText || liveText;

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (chunkRecorderRef.current && chunkRecorderRef.current.state !== 'inactive') {
      try { chunkRecorderRef.current.stop(); } catch {}
    }
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  // ── Web Speech API (Chrome/Edge) ──
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        const separator = liveTextRef.current ? ' ' : '';
        liveTextRef.current += separator + finalTranscript.trim();
        setLiveText(liveTextRef.current);
      }
      setInterimText(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  // ── Backend chunk transcription (Firefox fallback) ──
  const sendChunkToBackend = useCallback(async () => {
    if (sendingChunkRef.current || chunkBufferRef.current.length === 0 || !sessionIdRef.current) return;
    sendingChunkRef.current = true;

    const blob = new Blob(chunkBufferRef.current, { type: 'audio/webm' });
    chunkBufferRef.current = [];

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'chunk.webm');
      const res = await axios.post(
        `/api/dictation/${sessionIdRef.current}/chunk`,
        formData,
      );
      if (res.data?.full_text) {
        liveTextRef.current = res.data.full_text;
        setLiveText(res.data.full_text);
      } else if (res.data?.chunk_text) {
        const sep = liveTextRef.current ? ' ' : '';
        liveTextRef.current += sep + res.data.chunk_text;
        setLiveText(liveTextRef.current);
      }
    } catch (e) {
      console.error('Chunk transcription error:', e);
    } finally {
      sendingChunkRef.current = false;
    }
  }, []);

  const startChunkFallback = useCallback((stream: MediaStream) => {
    chunkBufferRef.current = [];
    sendingChunkRef.current = false;

    // Secondary recorder for chunks — collect small slices
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunkBufferRef.current.push(e.data);
    };
    recorder.start(1000); // 1s slices into buffer
    chunkRecorderRef.current = recorder;

    // Send accumulated buffer every CHUNK_INTERVAL_MS
    chunkIntervalRef.current = window.setInterval(sendChunkToBackend, CHUNK_INTERVAL_MS);
  }, [sendChunkToBackend]);

  const stopChunkFallback = useCallback(() => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    if (chunkRecorderRef.current && chunkRecorderRef.current.state !== 'inactive') {
      try { chunkRecorderRef.current.stop(); } catch {}
    }
  }, []);

  const startDictation = async () => {
    try {
      setError('');
      setLiveText('');
      setInterimText('');
      setFinalText('');
      setEditedText('');
      liveTextRef.current = '';

      // Start backend session
      const res = await axios.post('/api/dictation/start', { profile });
      setSession(res.data);
      sessionIdRef.current = res.data.id;

      // Start mic — single stream for both recording and Speech API
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });
      streamRef.current = stream;

      // Audio recording (full quality for backend STT later)
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;

      if (hasSpeechAPI) {
        // Chrome/Edge: real-time speech recognition (browser-native, instant)
        startSpeechRecognition();
      } else {
        // Firefox: send chunks to backend for transcription
        startChunkFallback(stream);
      }

      setState('recording');
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);

    } catch (e: any) {
      if (e?.response?.status === 401) {
        setError('Veuillez vous connecter pour utiliser la dictée.');
      } else if (e?.response?.status === 403) {
        setError(e?.response?.data?.detail || 'Abonnement requis pour utiliser la dictée.');
      } else if (e?.name === 'NotAllowedError' || e?.name === 'NotFoundError') {
        setError('Impossible d\'accéder au micro. Vérifiez les permissions de votre navigateur.');
      } else {
        setError('Impossible de démarrer la session. Vérifiez votre connexion.');
      }
    }
  };

  const pauseDictation = async () => {
    // Pause audio recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    if (hasSpeechAPI) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    } else {
      stopChunkFallback();
      if (chunkRecorderRef.current && chunkRecorderRef.current.state === 'recording') {
        try { chunkRecorderRef.current.pause(); } catch {}
      }
    }
    setInterimText('');
    if (timerRef.current) clearInterval(timerRef.current);

    if (sessionIdRef.current) {
      await axios.post(`/api/dictation/${sessionIdRef.current}/pause`).catch(() => {});
    }
    setState('paused');
  };

  const resumeDictation = async () => {
    // Resume audio recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    if (hasSpeechAPI) {
      startSpeechRecognition();
    } else {
      if (chunkRecorderRef.current && chunkRecorderRef.current.state === 'paused') {
        chunkRecorderRef.current.resume();
      }
      chunkIntervalRef.current = window.setInterval(sendChunkToBackend, CHUNK_INTERVAL_MS);
    }

    timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);

    if (sessionIdRef.current) {
      await axios.post(`/api/dictation/${sessionIdRef.current}/resume`).catch(() => {});
    }
    setState('recording');
  };

  const stopDictation = async () => {
    // Stop speech recognition / chunk fallback
    if (hasSpeechAPI) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    } else {
      stopChunkFallback();
      // Send any remaining buffered chunks
      await sendChunkToBackend();
    }
    setInterimText('');
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop audio recording and get full audio blob
    const audioBlob = await new Promise<Blob>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        return;
      }
      recorder.onstop = () => {
        resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      };
      recorder.stop();
    });

    // Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setState('finalizing');
    setIsRefining(true);

    // Send full audio to backend for high-quality transcription
    try {
      if (audioBlob.size > 1000 && sessionIdRef.current) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'dictation.webm');
        const res = await axios.post(
          `/api/dictation/${sessionIdRef.current}/finalize`,
          formData
        );
        if (res.data.full_text) {
          setFinalText(res.data.full_text);
        }
      }
    } catch (e: any) {
      console.error('Finalize error:', e);
      // Keep live text as fallback
    }

    // Stop backend session
    if (sessionIdRef.current) {
      const res = await axios.post(`/api/dictation/${sessionIdRef.current}/stop`).catch(() => null);
      if (res) {
        setSession(res.data);
      }
    }

    setIsRefining(false);
    setState('stopped');
  };

  const copyText = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveAsTranscription = async () => {
    if (!sessionIdRef.current) return;
    setState('saving');
    try {
      // If text was edited, update the session text before saving
      if (editedText) {
        await axios.put(`/api/dictation/${sessionIdRef.current}/text`, { text: editedText });
      }
      const res = await axios.post(`/api/dictation/${sessionIdRef.current}/save`);
      navigate(`/app/transcription/${res.data.transcription_id}`);
    } catch (e: any) {
      setError('Erreur lors de la sauvegarde');
      setState('stopped');
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-6 lg:p-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dictée en direct</h1>
          <p className="text-sm text-slate-500 mt-1">Parlez, le texte apparaît instantanément</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            {profile}
          </span>
          <span className="font-mono text-lg font-bold text-slate-700 dark:text-slate-200">{formatDuration(duration)}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Recording indicator */}
      {state === 'recording' && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-sm text-rose-700 dark:text-rose-400 font-medium">
            Micro actif — dictez maintenant
            {!hasSpeechAPI && ' (transcription toutes les 5s)'}
          </span>
        </div>
      )}

      {state === 'paused' && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Pause className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">En pause</span>
        </div>
      )}

      {state === 'finalizing' && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">Amélioration de la transcription en cours...</span>
        </div>
      )}

      {/* Text area */}
      <div className="mb-6 min-h-[300px] rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
        {(state === 'stopped' && isEditing) ? (
          <textarea
            value={editedText || displayText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full h-full min-h-[300px] p-6 text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-2xl"
            autoFocus
          />
        ) : (
          <div className="p-6">
            {displayText || interimText ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                {displayText}
                {interimText && (
                  <span className="text-slate-400 italic">{displayText ? ' ' : ''}{interimText}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                {state === 'idle' ? 'Appuyez sur le bouton pour commencer la dictée...' : 'En attente de votre voix...'}
              </p>
            )}
            {state === 'recording' && (
              <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
        {/* Edit button — visible when stopped with text */}
        {state === 'stopped' && displayText && (
          <button
            onClick={() => {
              if (!isEditing) setEditedText(displayText);
              setIsEditing(!isEditing);
            }}
            className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isEditing
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            {isEditing ? 'Terminer l\'édition' : 'Modifier'}
          </button>
        )}
      </div>

      {/* Refined badge */}
      {finalText && state === 'stopped' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium w-fit">
          <Sparkles className="w-3.5 h-3.5" />
          Transcription améliorée par IA
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {state === 'idle' && (
          <button
            onClick={startDictation}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
          >
            <Mic className="w-6 h-6" /> Commencer la dictée
          </button>
        )}

        {state === 'recording' && (
          <>
            <button
              onClick={pauseDictation}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-200 transition-colors"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
            <button
              onClick={stopDictation}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 dark:bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <Square className="w-4 h-4" /> Terminer
            </button>
          </>
        )}

        {state === 'paused' && (
          <>
            <button
              onClick={resumeDictation}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-200 transition-colors"
            >
              <Play className="w-4 h-4" /> Reprendre
            </button>
            <button
              onClick={stopDictation}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 dark:bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <Square className="w-4 h-4" /> Terminer
            </button>
          </>
        )}

        {state === 'finalizing' && (
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-500">Transcription haute qualité en cours...</span>
          </div>
        )}

        {state === 'stopped' && displayText && (
          <>
            <button
              onClick={copyText}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier le texte'}
            </button>
            <button
              onClick={saveAsTranscription}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
            >
              <Save className="w-4 h-4" /> Sauvegarder et analyser
            </button>
          </>
        )}

        {state === 'saving' && (
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-500">Sauvegarde et lancement des analyses...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default DictatePage;
