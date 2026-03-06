import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, ListChecks, CheckSquare, BookOpen, HelpCircle,
  Network, Presentation, BarChart3, Table2, Clock, Globe,
  ArrowLeft, Download, RefreshCw, Loader2, Send, MessageSquare, X
} from 'lucide-react';
import axios from 'axios';
import { Transcription, Analysis, AnalysisType } from '../types';

const ANALYSIS_TABS: { type: AnalysisType; label: string; icon: any }[] = [
  { type: 'summary', label: 'Summary', icon: FileText },
  { type: 'keypoints', label: 'Key Points', icon: ListChecks },
  { type: 'actions', label: 'Actions', icon: CheckSquare },
  { type: 'flashcards', label: 'Flashcards', icon: BookOpen },
  { type: 'quiz', label: 'Quiz', icon: HelpCircle },
  { type: 'mindmap', label: 'Mind Map', icon: Network },
  { type: 'slides', label: 'Slides', icon: Presentation },
  { type: 'infographic', label: 'Infographic', icon: BarChart3 },
  { type: 'tables', label: 'Tables', icon: Table2 },
];

function TranscriptionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [activeTab, setActiveTab] = useState<'transcript' | AnalysisType>('transcript');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        axios.get(`/api/transcriptions/${id}`),
        axios.get(`/api/transcriptions/${id}/analyses`),
      ]);
      setTranscription(tRes.data);
      setAnalyses(aRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleRegenerate = async (type: AnalysisType) => {
    setRegenerating(true);
    try {
      await axios.post(`/api/transcriptions/${id}/analyses/${type}/regenerate`);
      const res = await axios.get(`/api/transcriptions/${id}/analyses`);
      setAnalyses(res.data);
    } catch (e) { console.error(e); }
    setRegenerating(false);
  };

  const handleExport = (format: string) => {
    window.open(`/api/transcriptions/${id}/export/${format}`, '_blank');
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const res = await axios.post(`/api/transcriptions/${id}/chat`, { message: msg });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, chat is not available yet.' }]);
    }
    setChatLoading(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const activeAnalysis = analyses.find(a => a.type === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Transcription not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{transcription.filename}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              {transcription.language && (
                <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{transcription.language.toUpperCase()}</span>
              )}
              {transcription.duration && (
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(transcription.duration)}</span>
              )}
              <span>{transcription.segments?.length || 0} segments</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!confirm('Regenerate all 9 analyses? This may take a few minutes.')) return;
                await axios.post(`/api/transcriptions/${id}/regenerate-all`);
                alert('Regeneration started! Refresh in 2-3 minutes to see results.');
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Regen All
            </button>
            <button onClick={() => setChatOpen(!chatOpen)} className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors">
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium">
                <Download className="w-4 h-4" /> Export
              </button>
              <div className="absolute right-0 mt-2 w-48 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {['json', 'md', 'txt', 'srt', 'vtt', 'pptx'].map(fmt => (
                  <button key={fmt} onClick={() => handleExport(fmt)} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Export as .{fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto scrollbar-thin">
            <div className="flex px-6 gap-1 min-w-max">
              <TabButton
                active={activeTab === 'transcript'}
                onClick={() => setActiveTab('transcript')}
                icon={FileText}
                label="Transcript"
              />
              {ANALYSIS_TABS.map(({ type, label, icon }) => {
                const hasAnalysis = analyses.some(a => a.type === type);
                return (
                  <TabButton
                    key={type}
                    active={activeTab === type}
                    onClick={() => setActiveTab(type)}
                    icon={icon}
                    label={label}
                    badge={hasAnalysis}
                  />
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              {activeTab === 'transcript' ? (
                <TranscriptPanel transcription={transcription} />
              ) : activeAnalysis ? (
                <AnalysisPanel
                  analysis={activeAnalysis}
                  onRegenerate={() => handleRegenerate(activeAnalysis.type as AnalysisType)}
                  regenerating={regenerating}
                />
              ) : (
                <div className="text-center py-20 text-slate-500">
                  <p>This analysis hasn't been generated yet.</p>
                  <button
                    onClick={() => handleRegenerate(activeTab as AnalysisType)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm"
                  >
                    Generate Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {chatOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold">Chat with transcript</h3>
              <button onClick={() => setChatOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <p className="text-sm text-slate-400 text-center mt-8">Ask a question about this transcript</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-slate-100 dark:bg-slate-700 rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 rounded-bl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <form onSubmit={(e) => { e.preventDefault(); handleChat(); }} className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask something..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, badge }: {
  active: boolean; onClick: () => void; icon: any; label: string; badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
        active
          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge && !active && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
    </button>
  );
}

function TranscriptPanel({ transcription }: { transcription: Transcription }) {
  return (
    <div className="space-y-1">
      {transcription.segments && transcription.segments.length > 0 ? (
        transcription.segments.map((seg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            className="group flex gap-4 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="text-xs text-indigo-500 font-mono pt-0.5 min-w-[50px]">
              {formatSegTime(seg.start)}
            </span>
            <p className="text-sm leading-relaxed">{seg.text}</p>
          </motion.div>
        ))
      ) : (
        <div className="prose dark:prose-invert max-w-none">
          <p className="leading-relaxed whitespace-pre-wrap">{transcription.text}</p>
        </div>
      )}
    </div>
  );
}

function formatSegTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AnalysisPanel({ analysis, onRegenerate, regenerating }: {
  analysis: Analysis; onRegenerate: () => void; regenerating: boolean;
}) {
  const { type, content } = analysis;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold capitalize">{type.replace('_', ' ')}</h2>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {type === 'summary' && <SummaryView content={content} />}
      {type === 'keypoints' && <KeyPointsView content={content} />}
      {type === 'actions' && <ActionsView content={content} />}
      {type === 'flashcards' && <FlashcardsView content={content} />}
      {type === 'quiz' && <QuizView content={content} />}
      {type === 'mindmap' && <MindMapView content={content} />}
      {type === 'slides' && <SlidesView content={content} />}
      {type === 'infographic' && <InfographicView content={content} />}
      {type === 'tables' && <TablesView content={content} />}
    </div>
  );
}

function SummaryView({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {content.title && <h3 className="text-lg font-semibold">{content.title}</h3>}
      {content.introduction && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
          <p className="text-sm leading-relaxed">{content.introduction}</p>
        </div>
      )}
      {content.points && (
        <ul className="space-y-2">
          {content.points.map((p: string, i: number) => (
            <li key={i} className="flex gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
              <span className="text-sm">{p}</span>
            </li>
          ))}
        </ul>
      )}
      {content.conclusion && (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{content.conclusion}</p>
        </div>
      )}
      {typeof content === 'string' && <p className="leading-relaxed">{content}</p>}
      {content.raw && <p className="leading-relaxed whitespace-pre-wrap">{content.raw}</p>}
    </div>
  );
}

function KeyPointsView({ content }: { content: any }) {
  const points = content.keypoints || content.key_points || content.points || [];
  return (
    <div className="space-y-3">
      {Array.isArray(points) && points.map((p: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
          {typeof p === 'string' ? (
            <p className="text-sm">{p}</p>
          ) : (
            <>
              {p.theme && <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{p.theme}</h4>}
              {p.points && (
                <ul className="space-y-1">
                  {p.points.map((pt: string, j: number) => (
                    <li key={j} className="text-sm text-slate-600 dark:text-slate-300 flex gap-2">
                      <span className="text-indigo-400">-</span> {pt}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ))}
      {!Array.isArray(points) && <GenericView content={content} />}
    </div>
  );
}

function ActionsView({ content }: { content: any }) {
  const actions = content.actions || [];
  const decisions = content.decisions || [];
  const questions = content.questions || [];
  return (
    <div className="space-y-6">
      {actions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-3">Action Items</h3>
          <div className="space-y-2">
            {actions.map((a: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <CheckSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {decisions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-3">Decisions</h3>
          <div className="space-y-2">
            {decisions.map((d: string, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-sm">{d}</div>
            ))}
          </div>
        </div>
      )}
      {questions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-3">Open Questions</h3>
          <div className="space-y-2">
            {questions.map((q: string, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-sm">{q}</div>
            ))}
          </div>
        </div>
      )}
      {!actions.length && !decisions.length && !questions.length && <GenericView content={content} />}
    </div>
  );
}

function FlashcardsView({ content }: { content: any }) {
  const cards = content.cards || content.flashcards || [];
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card: any, i: number) => (
        <motion.div
          key={i}
          onClick={() => setFlipped(p => ({ ...p, [i]: !p[i] }))}
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer min-h-[160px] p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex items-center justify-center text-center"
        >
          {flipped[i] ? (
            <div>
              <span className="text-xs text-green-500 font-semibold uppercase mb-2 block">Answer</span>
              <p className="text-sm">{card.answer}</p>
            </div>
          ) : (
            <div>
              <span className="text-xs text-indigo-500 font-semibold uppercase mb-2 block">Question</span>
              <p className="font-medium">{card.question}</p>
            </div>
          )}
        </motion.div>
      ))}
      {!cards.length && <GenericView content={content} />}
    </div>
  );
}

function QuizView({ content }: { content: any }) {
  const questions = content.questions || content.quiz || [];
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="space-y-6">
      {questions.map((q: any, i: number) => (
        <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="font-semibold mb-4">{i + 1}. {q.question}</p>
          <div className="space-y-2">
            {(q.choices || []).map((choice: string, j: number) => {
              const letter = String.fromCharCode(65 + j);
              const selected = answers[i] === letter;
              const correct = showResults && letter === q.answer;
              const wrong = showResults && selected && letter !== q.answer;
              return (
                <button
                  key={j}
                  onClick={() => !showResults && setAnswers(p => ({ ...p, [i]: letter }))}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                    correct ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-400' :
                    wrong ? 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-400' :
                    selected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400' :
                    'border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                  }`}
                >
                  <span className="font-medium mr-2">{letter}.</span> {choice}
                </button>
              );
            })}
          </div>
          {showResults && q.explanation && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-600 dark:text-slate-300">
              {q.explanation}
            </div>
          )}
        </div>
      ))}
      {questions.length > 0 && (
        <button
          onClick={() => setShowResults(!showResults)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          {showResults ? 'Reset Quiz' : 'Check Answers'}
        </button>
      )}
      {!questions.length && <GenericView content={content} />}
    </div>
  );
}

function SlidesView({ content }: { content: any }) {
  const slides = content.slides || [];
  const [current, setCurrent] = useState(0);

  if (!slides.length) return <GenericView content={content} />;

  const slide = slides[current];
  return (
    <div>
      <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-12 flex flex-col justify-center text-white mb-4">
        <h2 className="text-3xl font-bold mb-8">{slide?.title}</h2>
        <ul className="space-y-3">
          {(slide?.bullets || []).map((b: string, i: number) => (
            <li key={i} className="text-lg text-slate-300 flex gap-3">
              <span className="text-indigo-400">-</span> {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 disabled:opacity-30 text-sm font-medium">
          Previous
        </button>
        <span className="text-sm text-slate-500">{current + 1} / {slides.length}</span>
        <button onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))} disabled={current >= slides.length - 1}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 disabled:opacity-30 text-sm font-medium">
          Next
        </button>
      </div>
    </div>
  );
}

function TablesView({ content }: { content: any }) {
  const tables = content.tables || [];
  return (
    <div className="space-y-6">
      {tables.map((table: any, i: number) => (
        <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {table.title && <h3 className="px-4 py-3 bg-slate-50 dark:bg-slate-800 font-semibold text-sm border-b border-slate-200 dark:border-slate-700">{table.title}</h3>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {table.headers && (
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    {table.headers.map((h: string, j: number) => (
                      <th key={j} className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {(table.rows || []).map((row: string[], j: number) => (
                  <tr key={j} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {row.map((cell: string, k: number) => (
                      <td key={k} className="px-4 py-3">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {!tables.length && <GenericView content={content} />}
    </div>
  );
}

function MindMapView({ content }: { content: any }) {
  const markdown = content.markdown || content.mindmap || content.raw || '';

  // Parse markdown hierarchy into a tree
  const parseTree = (md: string) => {
    const lines = md.split('\n').filter((l: string) => l.trim());
    const root: any = { label: 'Mind Map', children: [] };
    const stack: any[] = [{ node: root, level: -1 }];

    for (const line of lines) {
      let level = 0;
      let label = line.trim();
      if (label.startsWith('# ')) { level = 0; label = label.slice(2); }
      else if (label.startsWith('## ')) { level = 1; label = label.slice(3); }
      else if (label.startsWith('### ')) { level = 2; label = label.slice(4); }
      else if (label.startsWith('#### ')) { level = 3; label = label.slice(5); }
      else if (label.startsWith('- ')) { level = (stack[stack.length - 1]?.level ?? 0) + 1; label = label.slice(2); }
      else if (label.startsWith('* ')) { level = (stack[stack.length - 1]?.level ?? 0) + 1; label = label.slice(2); }
      else continue;

      const node: any = { label, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].node.children.push(node);
      stack.push({ node, level });
    }
    return root;
  };

  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500'];

  const renderNode = (node: any, depth: number = 0): React.ReactNode => {
    const color = colors[depth % colors.length];
    return (
      <div key={node.label} className={depth === 0 ? '' : 'ml-8 mt-2'}>
        <div className="flex items-center gap-2">
          {depth > 0 && <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} />}
          <span className={`${depth === 0 ? 'text-xl font-bold' : depth === 1 ? 'text-base font-semibold' : 'text-sm'}`}>
            {node.label}
          </span>
        </div>
        {node.children?.length > 0 && (
          <div className={`${depth > 0 ? 'border-l-2 border-slate-200 dark:border-slate-700 pl-4' : ''}`}>
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!markdown) return <GenericView content={content} />;

  const tree = parseTree(markdown);
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-auto">
      {tree.children.length > 0 ? renderNode(tree) : (
        <pre className="whitespace-pre-wrap text-sm font-mono">{markdown}</pre>
      )}
    </div>
  );
}

function InfographicView({ content }: { content: any }) {
  // Render a simple visual from the infographic data
  const description = content.description || content.title || 'Data Visualization';
  const spec = content.spec || content.data || content.chart || {};

  // Try to extract data points for a simple bar chart
  const extractBars = (): { label: string; value: number }[] => {
    // Look for Vega-Lite style data
    if (spec.data?.values) {
      return spec.data.values.map((v: any) => ({
        label: v.category || v.label || v.name || v.x || String(Object.values(v)[0]),
        value: v.count || v.value || v.amount || v.y || Number(Object.values(v)[1]) || 0,
      }));
    }
    // Look for simple key-value pairs
    if (typeof content === 'object') {
      const entries = Object.entries(content).filter(([k, v]) => typeof v === 'number' && k !== 'id');
      if (entries.length > 0) return entries.map(([k, v]) => ({ label: k, value: v as number }));
    }
    return [];
  };

  const bars = extractBars();
  const maxVal = Math.max(...bars.map(b => b.value), 1);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{description}</h3>
      {bars.length > 0 ? (
        <div className="space-y-3">
          {bars.map((bar, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-sm font-medium w-32 truncate text-right">{bar.label}</span>
              <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(bar.value / maxVal) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-end pr-3"
                >
                  <span className="text-xs font-bold text-white">{bar.value}</span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function GenericView({ content }: { content: any }) {
  if (content?.raw) return <pre className="whitespace-pre-wrap text-sm p-4 rounded-xl bg-slate-50 dark:bg-slate-800">{content.raw}</pre>;
  if (content?.error) return <p className="text-red-500 text-sm">Error: {content.error}</p>;
  return (
    <pre className="whitespace-pre-wrap text-sm p-4 rounded-xl bg-slate-50 dark:bg-slate-800 overflow-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}

export default TranscriptionView;
