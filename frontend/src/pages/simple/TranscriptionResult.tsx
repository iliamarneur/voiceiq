import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Copy, CheckCircle, Loader2, Sparkles, List, Quote, BookOpen, HelpCircle, Zap, Brain, MessageSquare } from 'lucide-react';
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
  // Handle structured summary: { title, introduction, points, conclusion }
  const title = content.title || undefined;
  const intro = content.introduction || content.summary || content.text || undefined;
  const points = Array.isArray(content.points) ? content.points.map((p: any) => typeof p === 'string' ? p : p.text || String(p)) : undefined;
  const conclusion = content.conclusion || undefined;
  // If nothing matched, try to stringify
  if (!intro && !points && !conclusion) {
    return { intro: typeof content === 'object' ? undefined : String(content) };
  }
  return { title, intro, points, conclusion };
}

function extractKeypoints(content: any): { theme: string; importance?: string; points: string[]; quote?: string }[] {
  if (typeof content === 'string') return [{ theme: '', points: [content] }];
  if (!content) return [];
  // Handle { keypoints: [...] }
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
  chapters: 'Chapitres',
  actions: 'Plan d\'actions',
  faq: 'FAQ',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
};

const EXPECTED_ANALYSES = ['summary', 'keypoints', 'chapters', 'actions', 'faq', 'quiz', 'flashcards'];

/* ── Analysis loading bar ── */

function AnalysisLoadingBar({ completedTypes }: { completedTypes: string[] }) {
  const total = EXPECTED_ANALYSES.length;
  const done = completedTypes.filter(t => EXPECTED_ANALYSES.includes(t)).length;
  const realProgress = Math.round((done / total) * 100);

  // Smooth animated progress that never goes backwards
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Jump to real progress, then slowly creep toward next milestone
    const target = Math.max(realProgress, displayProgress);
    if (target > displayProgress) {
      setDisplayProgress(target);
    }
  }, [realProgress]);

  // Slow creep between milestones
  useEffect(() => {
    const nextMilestone = Math.ceil((done + 1) / total * 100);
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        const cap = Math.min(nextMilestone - 2, 98);
        if (prev < cap) return prev + 0.15;
        return prev;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [done, total]);

  // Find what's currently being generated
  const nextStep = EXPECTED_ANALYSES.find(t => !completedTypes.includes(t));
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

      {/* Step indicators */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {EXPECTED_ANALYSES.map(t => {
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

      {/* Progress bar */}
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

/* ── Main component ── */

function TranscriptionResult() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TranscriptionData | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState('');

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

        // Stop polling when all expected analyses are ready
        const allReady = EXPECTED_ANALYSES.every(t => analysisTypes.includes(t));
        if (allReady) {
          setAnalysesLoading(false);
          return;
        }

        attempts++;
        if (attempts < 40 && !cancelled) {
          setTimeout(fetchAll, 3000);
        } else {
          setAnalysesLoading(false);
        }
      } catch {
        setError('Impossible de charger la transcription.');
        setLoading(false);
        setAnalysesLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [id]);

  const handleCopy = () => {
    if (data?.text) {
      navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  // Extract structured data
  const summaryAnalysis = analyses.find(a => a.type === 'summary');
  const keypointsAnalysis = analyses.find(a => a.type === 'keypoints');
  const actionsAnalysis = analyses.find(a => a.type === 'actions');
  const chaptersAnalysis = analyses.find(a => a.type === 'chapters');
  const faqAnalysis = analyses.find(a => a.type === 'faq');
  const quizAnalysis = analyses.find(a => a.type === 'quiz');
  const flashcardsAnalysis = analyses.find(a => a.type === 'flashcards');
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
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
          {data.text}
        </div>
      </motion.div>

      {/* Loading bar OR all results */}
      <AnimatePresence mode="wait">
        {analysesLoading ? (
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

      {/* Chapters */}
      {chaptersAnalysis?.content && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800">Chapitres</h3>
          </div>
          <div className="space-y-3">
            {(chaptersAnalysis.content.chapters || chaptersAnalysis.content || []).map((ch: any, i: number) => (
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
      )}

      {/* Actions */}
      {actionsAnalysis?.content && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800">Plan d'actions</h3>
          </div>
          {actionsAnalysis.content.actions?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-400 mb-2">Actions</p>
              {actionsAnalysis.content.actions.map((a: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 mb-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}
          {actionsAnalysis.content.decisions?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-400 mb-2">Décisions</p>
              {actionsAnalysis.content.decisions.map((d: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}
          {actionsAnalysis.content.questions?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Questions ouvertes</p>
              {actionsAnalysis.content.questions.map((q: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 mb-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{q}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* FAQ */}
      {faqAnalysis?.content?.faq?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800">FAQ</h3>
          </div>
          <div className="space-y-4">
            {faqAnalysis.content.faq.map((item: any, i: number) => (
              <div key={i} className="border-l-2 border-blue-200 pl-4">
                <p className="text-sm font-medium text-slate-700">{item.question}</p>
                <p className="text-sm text-slate-500 mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quiz */}
      {quizAnalysis?.content?.questions?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800">Quiz de révision</h3>
          </div>
          <div className="space-y-5">
            {quizAnalysis.content.questions.map((q: any, i: number) => (
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
      )}

      {/* Flashcards */}
      {flashcardsAnalysis?.content?.cards?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800">Flashcards</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {flashcardsAnalysis.content.cards.map((card: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100">
                <p className="text-xs font-semibold text-slate-700 mb-1">Q: {card.question}</p>
                <p className="text-xs text-slate-500">R: {card.answer}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

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

export default TranscriptionResult;
