import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Copy, CheckCircle, Loader2, Sparkles, List, Quote, BookOpen, HelpCircle, Zap, Brain, MessageSquare, Play, RefreshCw } from 'lucide-react';
import axios from 'axios';
import UpsellBanner from '../../components/simple/UpsellBanner';

interface TranscriptionData {
  id: string;
  filename: string;
  text: string;
  duration: number | null;
  language: string | null;
}

interface AnalysisData {
  type: string;
  content: any;
}

/* ── Helpers to extract readable content from analysis JSON ── */

function extractSummaryText(content: any): { title?: string; intro?: string; points?: string[]; conclusion?: string } {
  if (typeof content === 'string') return { intro: content };
  if (!content) return {};
  const title = content.title || undefined;
  const intro = content.introduction || content.summary || content.text || undefined;
  const points = Array.isArray(content.points) ? content.points.map((p: any) => typeof p === 'string' ? p : p.text || String(p)) : undefined;
  const conclusion = content.conclusion || undefined;
  if (!intro && !points && !conclusion) {
    return { intro: typeof content === 'object' ? undefined : String(content) };
  }
  return { title, intro, points, conclusion };
}

function extractKeypoints(content: any): { theme: string; importance?: string; points: string[]; quote?: string }[] {
  if (typeof content === 'string') return [{ theme: '', points: [content] }];
  if (!content) return [];
  const kps = content.keypoints || content.items || (Array.isArray(content) ? content : null);
  if (!kps || !Array.isArray(kps)) return [];
  return kps.map((kp: any) => {
    if (typeof kp === 'string') return { theme: '', points: [kp] };
    return {
      theme: kp.theme || '',
      importance: kp.importance || undefined,
      points: Array.isArray(kp.points) ? kp.points.map((p: any) => typeof p === 'string' ? p : p.text || String(p)) : [kp.text || String(kp)],
      quote: kp.verbatim_quote || undefined,
    };
  });
}

/* ── Analysis step labels ── */
const ANALYSIS_STEPS: Record<string, string> = {
  summary: 'Résumé',
  keypoints: 'Points clés',
};

const AUTO_ANALYSES = ['summary', 'keypoints'];

/* ── On-demand analysis definitions ── */
const ON_DEMAND_ANALYSES = [
  { type: 'chapters', label: 'Chapitres', desc: 'Découpage temporel en sections thématiques', icon: BookOpen, gradient: 'from-teal-500 to-emerald-600' },
  { type: 'actions', label: "Plan d'actions", desc: 'Actions, décisions et questions ouvertes', icon: Zap, gradient: 'from-rose-500 to-pink-600' },
  { type: 'faq', label: 'FAQ', desc: 'Questions fréquentes et réponses détaillées', icon: MessageSquare, gradient: 'from-blue-500 to-cyan-600' },
  { type: 'quiz', label: 'Quiz de révision', desc: 'QCM pour tester vos connaissances', icon: Brain, gradient: 'from-purple-500 to-fuchsia-600' },
  { type: 'flashcards', label: 'Fiches de révision', desc: 'Fiches question/réponse pour réviser', icon: Sparkles, gradient: 'from-yellow-500 to-orange-600' },
];

/* ── Auto-analysis loading bar ── */

function AnalysisLoadingBar({ completedTypes }: { completedTypes: string[] }) {
  const total = AUTO_ANALYSES.length;
  const done = completedTypes.filter(t => AUTO_ANALYSES.includes(t)).length;
  const realProgress = Math.round((done / total) * 100);

  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const target = Math.max(realProgress, displayProgress);
    if (target > displayProgress) {
      setDisplayProgress(target);
    }
  }, [realProgress]);

  useEffect(() => {
    const nextMilestone = Math.ceil((done + 1) / total * 100);
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        const cap = Math.min(nextMilestone - 2, 98);
        if (prev < cap) return prev + 0.3;
        return prev;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [done, total]);

  const nextStep = AUTO_ANALYSES.find(t => !completedTypes.includes(t));
  const currentLabel = nextStep ? ANALYSIS_STEPS[nextStep] || nextStep : 'Finalisation...';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-5 h-5 text-white" />
          </motion.div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700">Analyses IA en cours</p>
          <motion.p
            key={currentLabel}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-slate-400"
          >
            Génération : {currentLabel}...
          </motion.p>
        </div>
        <span className="text-xs font-medium text-indigo-500">{done}/{total}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {AUTO_ANALYSES.map(t => {
          const isDone = completedTypes.includes(t);
          return (
            <span
              key={t}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-all duration-500 ${
                isDone
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : t === nextStep
                  ? 'bg-indigo-50 text-indigo-500 border border-indigo-200 animate-pulse'
                  : 'bg-slate-50 text-slate-400 border border-slate-100'
              }`}
            >
              {isDone && <span className="mr-1">&#10003;</span>}
              {ANALYSIS_STEPS[t] || t}
            </span>
          );
        })}
      </div>

      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
          animate={{ width: `${displayProgress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className="text-right text-[11px] text-slate-300 mt-1.5">{Math.round(displayProgress)}%</p>
    </div>
  );
}

/* ── Importance badge ── */
function ImportanceBadge({ level }: { level?: string }) {
  if (!level) return null;
  const colors: Record<string, string> = {
    critical: 'bg-red-50 text-red-600 border-red-200',
    high: 'bg-amber-50 text-amber-600 border-amber-200',
    medium: 'bg-blue-50 text-blue-600 border-blue-200',
    low: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  const labels: Record<string, string> = {
    critical: 'Essentiel',
    high: 'Important',
    medium: 'Notable',
    low: 'Mineur',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors[level] || colors.medium}`}>
      {labels[level] || level}
    </span>
  );
}

/* ── On-demand analysis panel ── */
function OnDemandPanel({
  jobId,
  definition,
  analysis,
  onGenerated,
}: {
  jobId: string;
  definition: typeof ON_DEMAND_ANALYSES[0];
  analysis: AnalysisData | undefined;
  onGenerated: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const Icon = definition.icon;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await axios.post(`/api/oneshot/result/${jobId}/generate/${definition.type}`);
      // Poll until analysis appears
      setPolling(true);
      let attempts = 0;
      const poll = async () => {
        attempts++;
        try {
          const resp = await axios.get(`/api/oneshot/result/${jobId}`);
          const found = (resp.data.analyses || []).find((a: any) => a.type === definition.type);
          if (found || attempts > 30) {
            setGenerating(false);
            setPolling(false);
            onGenerated();
            return;
          }
        } catch {}
        setTimeout(poll, 2000);
      };
      setTimeout(poll, 2000);
    } catch {
      setGenerating(false);
      setPolling(false);
    }
  };

  // If already generated, render the content
  if (analysis) {
    return <AnalysisContent definition={definition} analysis={analysis} />;
  }

  // Not generated yet — show placeholder with Generate button
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${definition.gradient} flex items-center justify-center opacity-60`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-600">{definition.label}</h3>
            <p className="text-xs text-slate-400">{definition.desc}</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 shadow-sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Générer
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Rendered analysis content ── */
function AnalysisContent({ definition, analysis }: { definition: typeof ON_DEMAND_ANALYSES[0]; analysis: AnalysisData }) {
  const Icon = definition.icon;
  const content = analysis.content;

  // Chapters
  if (definition.type === 'chapters') {
    const chapters = content?.chapters || content || [];
    if (!Array.isArray(chapters) || chapters.length === 0) return null;
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${definition.gradient} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800">{definition.label}</h3>
        </div>
        <div className="space-y-3">
          {chapters.map((ch: any, i: number) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
              <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-slate-700">{ch.title}</p>
                {ch.summary && <p className="text-xs text-slate-500 mt-0.5">{ch.summary}</p>}
                {ch.start_time != null && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {Math.floor(ch.start_time / 60)}:{String(Math.floor(ch.start_time % 60)).padStart(2, '0')}
                    {ch.end_time != null && ` — ${Math.floor(ch.end_time / 60)}:${String(Math.floor(ch.end_time % 60)).padStart(2, '0')}`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Actions
  if (definition.type === 'actions') {
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${definition.gradient} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800">{definition.label}</h3>
        </div>
        {content?.actions?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-400 mb-2">Actions</p>
            {content.actions.map((a: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600 mb-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}
        {content?.decisions?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-400 mb-2">Décisions</p>
            {content.decisions.map((d: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}
        {content?.questions?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Questions ouvertes</p>
            {content.questions.map((q: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600 mb-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{q}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // FAQ
  if (definition.type === 'faq') {
    const faqItems = content?.faq || [];
    if (!Array.isArray(faqItems) || faqItems.length === 0) return null;
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${definition.gradient} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800">{definition.label}</h3>
        </div>
        <div className="space-y-4">
          {faqItems.map((item: any, i: number) => (
            <div key={i} className="border-l-2 border-blue-200 pl-4">
              <p className="text-sm font-medium text-slate-700">{item.question}</p>
              <p className="text-sm text-slate-500 mt-1">{item.answer}</p>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Quiz
  if (definition.type === 'quiz') {
    const questions = content?.questions || [];
    if (!Array.isArray(questions) || questions.length === 0) return null;
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${definition.gradient} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800">{definition.label}</h3>
        </div>
        <div className="space-y-5">
          {questions.map((q: any, i: number) => (
            <div key={i}>
              <p className="text-sm font-medium text-slate-700 mb-2">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-2 gap-2">
                {(q.choices || []).map((c: string, j: number) => (
                  <div key={j} className="text-xs px-3 py-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                    {String.fromCharCode(65 + j)}. {c}
                  </div>
                ))}
              </div>
              {q.explanation && <p className="text-xs text-slate-400 mt-1.5 italic">Réponse {q.answer} — {q.explanation}</p>}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Flashcards
  if (definition.type === 'flashcards') {
    const cards = content?.cards || [];
    if (!Array.isArray(cards) || cards.length === 0) return null;
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${definition.gradient} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800">{definition.label}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((card: any, i: number) => (
            <div key={i} className="p-3 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100">
              <p className="text-xs font-semibold text-slate-700 mb-1">Q: {card.question}</p>
              <p className="text-xs text-slate-500">R: {card.answer}</p>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return null;
}

/* ── Main component ── */

function TranscriptionResult() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TranscriptionData | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoLoading, setAutoLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [transcriptView, setTranscriptView] = useState<'raw' | 'formatted'>('raw');
  const [formattedText, setFormattedText] = useState('');
  const [formattingLoading, setFormattingLoading] = useState(false);
  const [formatError, setFormatError] = useState('');

  // Fetch data — polls only until auto-analyses (summary + keypoints) are ready
  useEffect(() => {
    if (!id) return;
    let attempts = 0;
    let cancelled = false;
    let ensureCalled = false;

    const fetchAll = async () => {
      try {
        if (!ensureCalled) {
          ensureCalled = true;
          await axios.post(`/api/oneshot/result/${id}/ensure-analyses`).catch(() => {});
        }

        const resp = await axios.get(`/api/oneshot/result/${id}`);
        const { transcription, analyses: analysisItems } = resp.data;

        setData(transcription);
        setLoading(false);
        setAnalyses(analysisItems || []);

        const analysisTypes = (analysisItems || []).map((a: AnalysisData) => a.type);

        // Stop polling when auto-analyses are ready (summary + keypoints)
        const autoReady = AUTO_ANALYSES.every(t => analysisTypes.includes(t));
        if (autoReady) {
          setAutoLoading(false);
          return;
        }

        attempts++;
        if (attempts < 30 && !cancelled) {
          setTimeout(fetchAll, 2500);
        } else {
          setAutoLoading(false);
        }
      } catch {
        setError('Impossible de charger la transcription.');
        setLoading(false);
        setAutoLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  // Auto-trigger mise en page when transcription loads
  useEffect(() => {
    if (data?.text && data.id && !formattedText && !formattingLoading) {
      handleFormat(data.id);
    }
  }, [data?.id]);

  const handleFormat = async (transcriptionId: string) => {
    setFormattingLoading(true);
    setFormatError('');
    try {
      const res = await axios.post(`/api/transcriptions/${transcriptionId}/format`);
      setFormattedText(res.data.formatted_text || '');
      setTranscriptView('formatted');
    } catch (e: any) {
      setFormatError(e.response?.data?.detail || 'Erreur lors de la mise en page.');
    }
    setFormattingLoading(false);
  };

  const handleCopy = () => {
    const textToCopy = transcriptView === 'formatted' && formattedText ? formattedText : data?.text || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: string) => {
    if (!data?.id) return;
    setExportError('');
    try {
      const resp = await axios.get(`/api/oneshot/result/${id}/export/${format}`, {
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

  const handleRefresh = () => {
    // Refresh analyses after on-demand generation
    if (!id) return;
    axios.get(`/api/oneshot/result/${id}`).then(resp => {
      setAnalyses(resp.data.analyses || []);
    }).catch(() => {});
  };

  // Extract structured data
  const summaryAnalysis = analyses.find(a => a.type === 'summary');
  const keypointsAnalysis = analyses.find(a => a.type === 'keypoints');
  const summaryData = summaryAnalysis ? extractSummaryText(summaryAnalysis.content) : null;
  const keypointsData = keypointsAnalysis ? extractKeypoints(keypointsAnalysis.content) : null;

  if (loading) {
    return (
      <div className="py-16 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 mx-auto text-indigo-500" />
        </motion.div>
        <p className="text-slate-500 mt-3">Chargement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-600">{error || 'Transcription introuvable.'}</p>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-800 mt-4 inline-block">
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex items-center gap-2 text-emerald-600 mb-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Transcription terminée</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-800">{data.filename}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            {data.duration != null && <span>{Math.round(data.duration / 60)} min</span>}
            {data.language && <span className="uppercase">{data.language}</span>}
          </div>
        </div>
      </div>

      {/* Transcription text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> Transcription complète
          </h2>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100">
              <button
                onClick={() => setTranscriptView('formatted')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  transcriptView === 'formatted'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-3 h-3" /> Mise en page
              </button>
              <button
                onClick={() => setTranscriptView('raw')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  transcriptView === 'raw'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Texte brut
              </button>
            </div>
            {formattedText && transcriptView === 'formatted' && (
              <button
                onClick={() => data && handleFormat(data.id)}
                disabled={formattingLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                title="Régénérer la mise en page"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${formattingLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>

        {transcriptView === 'formatted' ? (
          formattingLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-400">Mise en page en cours...</p>
            </div>
          ) : formatError ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500 mb-3">{formatError}</p>
              <button
                onClick={() => data && handleFormat(data.id)}
                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Réessayer
              </button>
            </div>
          ) : formattedText ? (
            <div className="prose prose-slate prose-sm max-w-none">
              <FormattedMarkdown text={formattedText} />
            </div>
          ) : (
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {data.text}
            </div>
          )
        ) : (
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {data.text}
          </div>
        )}
      </motion.div>

      {/* Auto-analyses loading bar OR results */}
      <AnimatePresence mode="wait">
        {autoLoading ? (
          <motion.div
            key="analyses-loading"
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <AnalysisLoadingBar completedTypes={analyses.map(a => a.type)} />
          </motion.div>
        ) : (
          <motion.div
            key="analyses-ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-5"
          >
            {/* Summary + Keypoints side by side */}
            {(summaryData || (keypointsData && keypointsData.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Summary */}
                {summaryData && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-800">Résumé</h3>
                    </div>
                    {summaryData.title && (
                      <p className="text-base font-semibold text-slate-700 mb-2">{summaryData.title}</p>
                    )}
                    {summaryData.intro && (
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">{summaryData.intro}</p>
                    )}
                    {summaryData.points && summaryData.points.length > 0 && (
                      <ul className="space-y-2 mb-3">
                        {summaryData.points.map((p, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="flex items-start gap-2 text-sm text-slate-600"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                    {summaryData.conclusion && (
                      <p className="text-sm text-slate-500 italic border-l-2 border-indigo-200 pl-3">
                        {summaryData.conclusion}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Keypoints */}
                {keypointsData && keypointsData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <List className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-800">Points clés</h3>
                    </div>
                    <div className="space-y-4">
                      {keypointsData.map((kp, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.12 }}
                        >
                          {kp.theme && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{kp.theme}</span>
                              <ImportanceBadge level={kp.importance} />
                            </div>
                          )}
                          <ul className="space-y-1 mb-2">
                            {kp.points.map((p, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                          {kp.quote && (
                            <div className="flex items-start gap-1.5 ml-3.5">
                              <Quote className="w-3 h-3 text-slate-300 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-slate-400 italic leading-relaxed">
                                {kp.quote}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* On-demand analyses — panels with Generate buttons */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Analyses complémentaires</p>
              {ON_DEMAND_ANALYSES.map(def => (
                <OnDemandPanel
                  key={def.type}
                  jobId={id!}
                  definition={def}
                  analysis={analyses.find(a => a.type === def.type)}
                  onGenerated={handleRefresh}
                />
              ))}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Export buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleExport('pdf')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:border-indigo-400 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" /> Télécharger PDF
        </button>
        <button
          onClick={() => handleExport('txt')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:border-indigo-400 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" /> Télécharger TXT
        </button>
      </div>

      {exportError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
          {exportError}
        </p>
      )}

      {/* Upsell banner */}
      <UpsellBanner />
    </motion.div>
  );
}

/* ── Simple Markdown Renderer ── */
function FormattedMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-base font-semibold text-slate-800 mt-4 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-lg font-bold text-slate-800 mt-5 mb-2 pb-1 border-b border-slate-200">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} className="text-xl font-bold text-slate-900 mt-4 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-2 my-0.5">
          <span className="text-indigo-400 mt-1">•</span>
          <span className="text-sm text-slate-600">{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(<p key={key++} className="text-sm text-slate-600 leading-relaxed my-1">{renderInline(line)}</p>);
    }
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default TranscriptionResult;
