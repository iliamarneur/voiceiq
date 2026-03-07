import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Pause, Square, Play, Copy, Save, Loader2, ArrowLeft, Check } from 'lucide-react';
import axios from 'axios';
import { DictationSession } from '../types';

type DictateState = 'idle' | 'recording' | 'paused' | 'stopped' | 'saving';

const CHUNK_INTERVAL_MS = 4000; // send chunk every 4 seconds

function DictatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = (location.state as any)?.profile || 'medical';

  const [state, setState] = useState<DictateState>('idle');
  const [session, setSession] = useState<DictationSession | null>(null);
  const [text, setText] = useState('');
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [chunkLoading, setChunkLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkIntervalRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>('');

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  const sendCurrentChunk = useCallback(async () => {
    if (chunksRef.current.length === 0 || !sessionIdRef.current) return;
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];

    if (blob.size < 100) return; // skip tiny chunks

    setChunkLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'chunk.webm');
      const res = await axios.post(`/api/dictation/${sessionIdRef.current}/chunk`, formData);
      setText(res.data.full_text);
    } catch (e: any) {
      console.error('Chunk error:', e);
    }
    setChunkLoading(false);
  }, []);

  const startDictation = async () => {
    try {
      setError('');
      // Start backend session
      const res = await axios.post('/api/dictation/start', { profile });
      setSession(res.data);
      sessionIdRef.current = res.data.id;

      // Start mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(500); // collect data every 500ms
      mediaRecorderRef.current = recorder;

      setState('recording');
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);

      // Periodically send chunks
      chunkIntervalRef.current = window.setInterval(sendCurrentChunk, CHUNK_INTERVAL_MS);
    } catch (e: any) {
      setError('Impossible d\'acceder au micro ou de demarrer la session.');
    }
  };

  const pauseDictation = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);

    // Send remaining chunk
    await sendCurrentChunk();

    if (sessionIdRef.current) {
      await axios.post(`/api/dictation/${sessionIdRef.current}/pause`).catch(() => {});
    }
    setState('paused');
  };

  const resumeDictation = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    chunkIntervalRef.current = window.setInterval(sendCurrentChunk, CHUNK_INTERVAL_MS);

    if (sessionIdRef.current) {
      await axios.post(`/api/dictation/${sessionIdRef.current}/resume`).catch(() => {});
    }
    setState('recording');
  };

  const stopDictation = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);

    // Send final chunk
    await sendCurrentChunk();
    cleanup();

    if (sessionIdRef.current) {
      const res = await axios.post(`/api/dictation/${sessionIdRef.current}/stop`).catch(() => null);
      if (res) {
        setSession(res.data);
        setText(res.data.current_text);
      }
    }
    setState('stopped');
  };

  const copyText = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveAsTranscription = async () => {
    if (!sessionIdRef.current) return;
    setState('saving');
    try {
      const res = await axios.post(`/api/dictation/${sessionIdRef.current}/save`);
      navigate(`/transcription/${res.data.transcription_id}`);
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
      <button onClick={() => navigate('/new')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dictee en direct</h1>
          <p className="text-sm text-slate-500 mt-1">La transcription apparait au fur et a mesure</p>
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
          <span className="text-sm text-rose-700 dark:text-rose-400 font-medium">Micro actif — dictez maintenant</span>
          {chunkLoading && <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin ml-auto" />}
        </div>
      )}

      {state === 'paused' && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Pause className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">En pause</span>
        </div>
      )}

      {/* Text area */}
      <div className="mb-6 min-h-[300px] p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        {text ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">{text}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">
            {state === 'idle' ? 'Appuyez sur le bouton pour commencer la dictee...' : 'En attente de la transcription...'}
          </p>
        )}
        {chunkLoading && state === 'recording' && (
          <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-0.5" />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {state === 'idle' && (
          <button
            onClick={startDictation}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
          >
            <Mic className="w-6 h-6" /> Commencer la dictee
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

        {state === 'stopped' && text && (
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
              {copied ? 'Copie !' : 'Copier le texte'}
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
