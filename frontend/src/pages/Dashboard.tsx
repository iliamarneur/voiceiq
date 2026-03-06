import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Clock, Globe, FileAudio, Trash2, Upload, Languages, BarChart3 } from 'lucide-react';
import axios from 'axios';
import { Transcription, Stats } from '../types';

function Dashboard() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get('/api/transcriptions', { params: { search: search || undefined } }),
        axios.get('/api/transcriptions/stats'),
      ]);
      setTranscriptions(tRes.data);
      setStats(sRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAll();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this transcription and all analyses?')) return;
    await axios.delete(`/api/transcriptions/${id}`);
    fetchAll();
  };

  const formatDuration = (s: number | null) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statCards = stats ? [
    { icon: FileAudio, label: 'Transcriptions', value: stats.total, color: 'from-indigo-500 to-blue-500' },
    { icon: Clock, label: 'Total Duration', value: formatDuration(stats.total_duration), color: 'from-purple-500 to-pink-500' },
    { icon: Languages, label: 'Languages', value: Object.keys(stats.languages).length, color: 'from-emerald-500 to-teal-500' },
    { icon: BarChart3, label: 'Analyses', value: stats.total_analyses || 0, color: 'from-amber-500 to-orange-500' },
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-6 lg:p-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Your audio intelligence hub</p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
        >
          <Upload className="w-4 h-4" />
          New Upload
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map(({ icon: Icon, label, value, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-10 rounded-bl-[4rem]`} />
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transcriptions..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </form>

      {/* Transcription List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
      ) : transcriptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileAudio className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No transcriptions yet</h3>
          <p className="text-slate-500 mb-6">Upload your first audio file to get started</p>
          <Link to="/upload" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
            <Upload className="w-4 h-4" /> Upload Audio
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {transcriptions.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/transcription/${t.id}`)}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <FileAudio className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {t.filename}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {t.text?.slice(0, 120)}...
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {t.language && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium uppercase">
                    {t.language}
                  </span>
                )}
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(t.duration)}
                </span>
                <span className="text-xs text-slate-400">{formatDate(t.created_at)}</span>
                <button
                  onClick={(e) => handleDelete(t.id, e)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default Dashboard;
