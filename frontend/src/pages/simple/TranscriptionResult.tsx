import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Download, Copy, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import UpsellBanner from '../../components/simple/UpsellBanner';

interface TranscriptionData {
  id: string;
  filename: string;
  text: string;
  duration: number | null;
  language: string | null;
  analyses: Array<{ type: string; content: any }>;
}

function TranscriptionResult() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TranscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/transcriptions/${id}`)
      .then(resp => {
        setData(resp.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger la transcription.');
        setLoading(false);
      });
  }, [id]);

  const handleCopy = () => {
    if (data?.text) {
      navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = async (format: string) => {
    if (!id) return;
    setExportError('');
    try {
      const resp = await axios.get(`/api/transcriptions/${id}/export/${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'pdf' ? 'pdf' : 'txt';
      a.download = `${data?.filename || 'transcription'}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError(`Impossible de télécharger le fichier ${format.toUpperCase()}.`);
      setTimeout(() => setExportError(''), 4000);
    }
  };

  const getAnalysis = (type: string) => {
    if (!data?.analyses) return null;
    const analysis = data.analyses.find(a => a.type === type);
    if (!analysis) return null;
    const content = analysis.content;
    if (typeof content === 'string') return content;
    if (content?.text) return content.text;
    if (content?.items) return content.items;
    return JSON.stringify(content, null, 2);
  };

  const summary = getAnalysis('summary');
  const keypoints = getAnalysis('keypoints');
  const actions = getAnalysis('actions');

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
        <p className="text-slate-400 mt-3">Chargement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-400">{error || 'Transcription introuvable.'}</p>
        <Link to="/" className="text-sm text-slate-400 hover:text-white mt-4 inline-block">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">C'est prêt !</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{data.filename}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
            {data.duration && <span>{Math.round(data.duration / 60)} min</span>}
            {data.language && <span className="uppercase">{data.language}</span>}
          </div>
        </div>
      </div>

      {/* Transcription text */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Transcription
          </h2>
        </div>
        <div className="max-h-80 overflow-y-auto text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {data.text}
        </div>
      </div>

      {/* Analyses cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h3 className="font-semibold text-sm text-indigo-400 mb-2">Résumé</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {typeof summary === 'string' ? summary : JSON.stringify(summary)}
            </p>
          </div>
        )}
        {keypoints && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h3 className="font-semibold text-sm text-indigo-400 mb-2">Points clés</h3>
            <div className="text-sm text-slate-300 leading-relaxed">
              {Array.isArray(keypoints) ? (
                <ul className="space-y-1">
                  {keypoints.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span>{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{typeof keypoints === 'string' ? keypoints : JSON.stringify(keypoints)}</p>
              )}
            </div>
          </div>
        )}
        {actions && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h3 className="font-semibold text-sm text-indigo-400 mb-2">Actions</h3>
            <div className="text-sm text-slate-300 leading-relaxed">
              {Array.isArray(actions) ? (
                <ul className="space-y-1">
                  {actions.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5">→</span>
                      <span>{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{typeof actions === 'string' ? actions : JSON.stringify(actions)}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleExport('pdf')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300 hover:border-indigo-500 transition-colors"
        >
          <Download className="w-4 h-4" /> Télécharger PDF
        </button>
        <button
          onClick={() => handleExport('txt')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300 hover:border-indigo-500 transition-colors"
        >
          <Download className="w-4 h-4" /> Télécharger TXT
        </button>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300 hover:border-indigo-500 transition-colors"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copié !' : 'Copier le texte'}
        </button>
      </div>

      {exportError && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-2">
          {exportError}
        </p>
      )}

      {/* Upsell banner */}
      <UpsellBanner />
    </motion.div>
  );
}

export default TranscriptionResult;
