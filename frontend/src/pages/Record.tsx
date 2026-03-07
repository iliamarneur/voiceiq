import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Square, Play, Pause, RotateCcw, Send, Loader2, ArrowLeft, Volume2 } from 'lucide-react';
import axios from 'axios';

type RecordState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'done';

function RecordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = (location.state as any)?.profile || 'generic';

  const [state, setState] = useState<RecordState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  const updateLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    setAudioLevel(Math.min(100, avg / 1.28));
    animFrameRef.current = requestAnimationFrame(updateLevel);
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio level analyser
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState('recorded');
        cleanup();
      };

      recorder.start(1000); // collect data every second
      mediaRecorderRef.current = recorder;
      setState('recording');
      setDuration(0);

      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
      updateLevel();
    } catch (e: any) {
      setError('Impossible d\'acceder au micro. Verifiez les permissions du navigateur.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setState('idle');
    setDuration(0);
    setAudioLevel(0);
    setPlaying(false);
  };

  const sendRecording = async () => {
    if (!audioBlob) return;
    setState('uploading');
    try {
      const formData = new FormData();
      const filename = `recording_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.webm`;
      formData.append('file', audioBlob, filename);
      formData.append('profile', profile);
      formData.append('priority', 'P1');

      const res = await axios.post('/api/upload', formData);
      setState('done');
      // Poll job until done then redirect
      const jobId = res.data.id;
      const poll = setInterval(async () => {
        try {
          const jr = await axios.get(`/api/jobs/${jobId}`);
          if (jr.data.transcription_id && (jr.data.status === 'transcribed' || jr.data.status === 'completed')) {
            clearInterval(poll);
            navigate(`/transcription/${jr.data.transcription_id}`);
          } else if (jr.data.status === 'failed') {
            clearInterval(poll);
            setError(jr.data.error_message || 'Transcription echouee');
            setState('recorded');
          }
        } catch {}
      }, 3000);
    } catch (e: any) {
      setError('Erreur lors de l\'envoi');
      setState('recorded');
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto p-6 lg:p-8">
      <button onClick={() => navigate('/new')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-1">Enregistrer</h1>
        <p className="text-sm text-slate-500">Capturez un audio depuis votre micro, puis envoyez-le pour transcription</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          Profil : {profile}
        </span>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center">
        {/* Audio level indicator */}
        {state === 'recording' && (
          <div className="w-full max-w-xs mb-6">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                animate={{ width: `${audioLevel}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-rose-500">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm font-medium">Enregistrement en cours</span>
            </div>
          </div>
        )}

        {/* Duration display */}
        <div className="text-5xl font-mono font-bold mb-8 text-slate-800 dark:text-slate-100">
          {formatDuration(duration)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {state === 'idle' && (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-rose-500/30 hover:shadow-2xl hover:scale-105 transition-all"
            >
              <Mic className="w-8 h-8" />
            </button>
          )}

          {state === 'recording' && (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all"
            >
              <Square className="w-8 h-8" />
            </button>
          )}

          {state === 'recorded' && (
            <>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Recommencer
              </button>

              {audioUrl && (
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
                      setPlaying(!playing);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing ? 'Pause' : 'Ecouter'}
                </button>
              )}

              <button
                onClick={sendRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
              >
                <Send className="w-4 h-4" /> Envoyer
              </button>
            </>
          )}

          {(state === 'uploading' || state === 'done') && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500">
                {state === 'uploading' ? 'Envoi en cours...' : 'Transcription en cours...'}
              </p>
            </div>
          )}
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        )}
      </div>
    </motion.div>
  );
}

export default RecordPage;
