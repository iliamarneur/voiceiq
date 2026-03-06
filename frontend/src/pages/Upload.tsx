import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileAudio, Loader2, CheckCircle, XCircle, Mic2 } from 'lucide-react';
import axios from 'axios';

function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setPhase('uploading');
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/upload', formData, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setPhase('transcribing');
      setProgress(0);
      pollJob(res.data.id);
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
        if (res.data.status === 'completed' && res.data.transcription_id) {
          clearInterval(interval);
          setPhase('done');
          setTimeout(() => navigate(`/transcription/${res.data.transcription_id}`), 1500);
        } else if (res.data.status === 'failed') {
          clearInterval(interval);
          setError('Transcription failed');
          setPhase('error');
          setUploading(false);
        } else {
          // Simulate progress
          setProgress(Math.min(90, attempts * 5));
          if (attempts > 10) setPhase('analyzing');
        }
      } catch {
        clearInterval(interval);
        setError('Connection lost');
        setPhase('error');
        setUploading(false);
      }
    }, 3000);
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
            : file
              ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-700'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800'}
        `}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />

        <div className="relative">
          {file ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <FileAudio className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold">{file.name}</p>
              <p className="text-sm text-slate-500 mt-1">{formatSize(file.size)}</p>
            </motion.div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium">Drop your audio file here</p>
              <p className="text-sm text-slate-500 mt-2">or click to browse</p>
              <p className="text-xs text-slate-400 mt-4">MP3, WAV, M4A, FLAC, OGG, WEBM</p>
            </>
          )}
        </div>
        <input
          id="fileInput" type="file" accept="audio/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
        />
      </motion.div>

      {/* Progress */}
      {uploading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <div className="flex items-center gap-3 mb-3">
            {phase === 'done' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : phase === 'error' ? (
              <XCircle className="w-5 h-5 text-red-500" />
            ) : (
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            )}
            <span className="text-sm font-medium">
              {phase === 'uploading' && `Uploading... ${progress}%`}
              {phase === 'transcribing' && 'Transcribing audio with Whisper...'}
              {phase === 'analyzing' && 'Running 9 AI analyses...'}
              {phase === 'done' && 'Complete! Redirecting...'}
              {phase === 'error' && error}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${phase === 'done' ? 'bg-green-500' : phase === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
              initial={{ width: 0 }}
              animate={{ width: phase === 'done' ? '100%' : `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Phase steps */}
          <div className="flex items-center justify-between mt-4 text-xs">
            {['Upload', 'Transcription', 'Analysis', 'Done'].map((step, i) => {
              const phaseIdx = { uploading: 0, transcribing: 1, analyzing: 2, done: 3, error: -1, idle: -1 }[phase];
              const active = i <= (phaseIdx ?? -1);
              return (
                <div key={step} className={`flex items-center gap-1.5 ${active ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  {step}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Upload Button */}
      {!uploading && (
        <motion.button
          onClick={handleUpload}
          disabled={!file}
          whileHover={file ? { scale: 1.02 } : {}}
          whileTap={file ? { scale: 0.98 } : {}}
          className="mt-6 w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:shadow-none hover:shadow-xl transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <Mic2 className="w-5 h-5" />
            Transcribe & Analyze
          </span>
        </motion.button>
      )}

      {error && !uploading && (
        <p className="mt-4 text-center text-red-500 text-sm">{error}</p>
      )}
    </motion.div>
  );
}

export default UploadPage;
