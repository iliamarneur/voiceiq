import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileAudio, Loader2, CheckCircle, XCircle, Mic2, Files, Trash2 } from 'lucide-react';
import axios from 'axios';

interface BatchJob {
  id: string;
  filename: string;
  status: string;
  transcription_id?: string | null;
}

function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const navigate = useNavigate();

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
        if (res.data.status === 'completed' && res.data.transcription_id) {
          clearInterval(interval);
          setPhase('done');
          setTimeout(() => navigate(`/transcription/${res.data.transcription_id}`), 1500);
        } else if (res.data.status === 'completed' && !res.data.transcription_id) {
          // Job completed but transcription_id not yet set — check transcriptions list
          try {
            const tRes = await axios.get('/api/transcriptions');
            const latest = tRes.data[0];
            if (latest) {
              clearInterval(interval);
              setPhase('done');
              setTimeout(() => navigate(`/transcription/${latest.id}`), 1500);
            }
          } catch {}
        } else if (res.data.status === 'failed') {
          clearInterval(interval);
          setError('Transcription failed');
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
          setError('Processing is taking too long. Check the dashboard for results.');
          setPhase('error');
          setUploading(false);
        }
      } catch {
        clearInterval(interval);
        setError('Connection lost');
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

        const allDone = updated.every(j => j.status === 'completed' || j.status === 'failed');
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
              ) : (
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
              )}
              <span className="flex-1 text-sm truncate">{j.filename}</span>
              <span className={`text-xs font-medium ${
                j.status === 'completed' ? 'text-green-500' : j.status === 'failed' ? 'text-red-500' : 'text-indigo-500'
              }`}>
                {j.status}
              </span>
              {j.status === 'completed' && j.transcription_id && (
                <button
                  onClick={() => navigate(`/transcription/${j.transcription_id}`)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  View
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Single file progress */}
      {uploading && batchJobs.length <= 1 && (
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
