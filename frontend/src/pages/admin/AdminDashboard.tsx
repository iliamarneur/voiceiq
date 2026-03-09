import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Clock, AlertTriangle, Loader2, Server,
  CheckCircle, XCircle, CreditCard, RefreshCw,
} from 'lucide-react';
import axios from 'axios';

interface AdminStats {
  mrr_cents: number;
  mrr_eur: number;
  active_subscriptions: number;
  total_minutes_this_month: number;
  total_transcriptions: number;
  error_rate_24h: number;
  queue_size: number;
  queue_preview: QueueJob[];
  backends: {
    whisper: { status: string; note?: string };
    ollama: { status: string; models?: string[] };
  };
}

interface QueueJob {
  id: string;
  file_path: string;
  status: string;
  priority: string;
  profile: string;
  created_at: string | null;
}

interface BillingEvent {
  id: string;
  event_type: string;
  amount_cents: number | null;
  status: string;
  created_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-400',
  queued: 'bg-slate-400',
  processing: 'bg-blue-500',
  transcribed: 'bg-indigo-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'Urgent',
  P1: 'Normal',
  P2: 'Basse',
};

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [billing, setBilling] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsResp, billingResp] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/billing?limit=20'),
      ]);
      setStats(statsResp.data);
      setBilling(billingResp.data);
    } catch {
      // silently fail
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-slate-500">
        Impossible de charger les statistiques admin.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" /> Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-1">Vue d'ensemble de la plateforme</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MRR"
          value={`${stats.mrr_eur} EUR`}
          sub={`${stats.active_subscriptions} abo actifs`}
          icon={CreditCard}
          color="text-emerald-500"
        />
        <StatCard
          label="Minutes ce mois"
          value={`${stats.total_minutes_this_month}`}
          sub="minutes consommees"
          icon={Clock}
          color="text-blue-500"
        />
        <StatCard
          label="Transcriptions"
          value={`${stats.total_transcriptions}`}
          sub="total"
          icon={BarChart3}
          color="text-indigo-500"
        />
        <StatCard
          label="Taux erreur 24h"
          value={`${stats.error_rate_24h}%`}
          sub={`${stats.queue_size} jobs en queue`}
          icon={AlertTriangle}
          color={stats.error_rate_24h > 10 ? 'text-red-500' : stats.error_rate_24h > 5 ? 'text-amber-500' : 'text-green-500'}
        />
      </div>

      {/* Backends Health */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-500" /> Santé des backends
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BackendCard
            name="Whisper (STT)"
            status={stats.backends.whisper.status}
            detail={stats.backends.whisper.note || ''}
          />
          <BackendCard
            name="Ollama (LLM)"
            status={stats.backends.ollama.status}
            detail={stats.backends.ollama.models?.slice(0, 3).join(', ') || 'Aucun modèle'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-3">File d'attente ({stats.queue_size})</h2>
          {stats.queue_preview.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun job en cours</p>
          ) : (
            <div className="space-y-2">
              {stats.queue_preview.map(job => (
                <div key={job.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[job.status] || 'bg-slate-400'}`} />
                    <span className="truncate">{job.file_path || job.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
                    <span>{PRIORITY_LABELS[job.priority] || job.priority}</span>
                    <span className="capitalize">{job.status}</span>
                  </div>
                </div>
              ))}
              {stats.queue_size > 5 && (
                <p className="text-xs text-slate-400 text-center">
                  +{stats.queue_size - 5} autres jobs
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent Billing */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-3">Derniers événements billing</h2>
          {billing.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun événement</p>
          ) : (
            <div className="space-y-2">
              {billing.slice(0, 8).map(evt => (
                <div key={evt.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${evt.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>{evt.event_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {evt.amount_cents != null && (
                      <span className="font-medium">{(evt.amount_cents / 100).toFixed(0)} EUR</span>
                    )}
                    {evt.created_at && (
                      <span>{new Date(evt.created_at).toLocaleDateString('fr')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
        <Icon className={`w-4 h-4 ${color}`} /> {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function BackendCard({ name, status, detail }: {
  name: string; status: string; detail: string;
}) {
  const isOk = status === 'ok';
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      isOk
        ? 'border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10'
        : 'border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10'
    }`}>
      {isOk
        ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      }
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

export default AdminDashboard;
