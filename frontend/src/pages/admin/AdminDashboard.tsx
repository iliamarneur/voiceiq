import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Clock, AlertTriangle, Loader2, Server,
  CheckCircle, XCircle, CreditCard, RefreshCw,
  Users, TrendingUp, DollarSign, Zap, Activity,
  ArrowUpRight, ArrowDownRight, Eye, Crown,
  Filter, Mail, UserMinus, ChevronDown, ChevronRight,
} from 'lucide-react';
import axios from 'axios';

interface AdminStats {
  // Revenue
  mrr_cents: number;
  mrr_eur: number;
  oneshot_revenue_cents: number;
  oneshot_revenue_eur: number;
  oneshot_count: number;
  pack_revenue_cents: number;
  pack_revenue_eur: number;
  total_revenue_eur: number;
  // API costs
  api_costs: {
    total_audio_minutes: number;
    total_analyses: number;
    openai_stt_minutes: number;
    whisper_cost_usd: number;
    llm_cost_usd: number;
    total_cost_usd: number;
    note: string;
  };
  // Users
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  users_by_plan: { plan_id: string; count: number }[];
  // Conversion
  conversion: {
    total_users: number;
    subscribed_users: number;
    no_subscription_users: number;
    subscription_rate: number;
    oneshot_users: number;
    anonymous_sessions: number;
  };
  // Usage
  total_minutes_this_month: number;
  total_transcriptions: number;
  top_users: {
    user_id: string;
    email: string;
    name: string;
    minutes: number;
    transcriptions: number;
  }[];
  usage_by_source: Record<string, { count: number; minutes: number }>;
  usage_by_profile: Record<string, { count: number; minutes: number }>;
  // Health
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
  user_id: string;
  created_at: string | null;
}

interface BillingEvent {
  id: string;
  user_id: string;
  event_type: string;
  amount_cents: number | null;
  status: string;
  event_data: any;
  created_at: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  plan_id: string;
  created_at: string | null;
}

interface FunnelData {
  daily_signups: { date: string; count: number }[];
  daily_transcriptions: { date: string; count: number; minutes: number }[];
  daily_revenue: { date: string; oneshot_eur: number; pack_eur: number; total_eur: number }[];
  funnel_steps: { step: string; label: string; count: number }[];
  cohort_retention: { cohort: string; registered: number; week_1: number; week_2: number; week_3: number; week_4: number }[];
  plan_distribution: { plan_id: string; plan_name: string; users: number; mrr_eur: number }[];
  oneshot_stats: {
    total_orders: number;
    paid_orders: number;
    conversion_rate: number;
    by_tier: { tier: string; count: number; revenue_eur: number }[];
  };
  contact_stats: { total: number; by_category: Record<string, number>; new_unread: number };
  churn_indicators: { inactive_30d: number; cancelled_subscriptions: number; quota_exceeded: number };
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

const PLAN_COLORS: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  team: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [billing, setBilling] = useState<BillingEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'usage' | 'billing' | 'funnel'>('overview');

  const fetchData = async () => {
    try {
      const [statsResp, billingResp, usersResp, funnelResp] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/billing?limit=20'),
        axios.get('/api/admin/users?limit=30'),
        axios.get('/api/admin/funnel'),
      ]);
      setStats(statsResp.data);
      setBilling(billingResp.data);
      setUsers(usersResp.data);
      setFunnel(funnelResp.data);
    } catch (err: any) {
      console.error('Admin stats error:', err?.response?.status, err?.response?.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
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

  const margin = stats.total_revenue_eur - stats.api_costs.total_cost_usd;
  const marginPercent = stats.total_revenue_eur > 0
    ? Math.round((margin / stats.total_revenue_eur) * 100)
    : 0;

  const tabs = [
    { id: 'overview' as const, label: 'Vue globale' },
    { id: 'funnel' as const, label: 'Funnel' },
    { id: 'users' as const, label: 'Utilisateurs' },
    { id: 'usage' as const, label: 'Usage' },
    { id: 'billing' as const, label: 'Billing' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
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
          Rafraichir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab stats={stats} margin={margin} marginPercent={marginPercent} />
      )}
      {activeTab === 'funnel' && funnel && (
        <FunnelTab funnel={funnel} />
      )}
      {activeTab === 'users' && (
        <UsersTab stats={stats} users={users} />
      )}
      {activeTab === 'usage' && (
        <UsageTab stats={stats} />
      )}
      {activeTab === 'billing' && (
        <BillingTab stats={stats} billing={billing} />
      )}
    </motion.div>
  );
}


/* ─── Overview Tab ───────────────────────────────────────── */

function OverviewTab({ stats, margin, marginPercent }: {
  stats: AdminStats; margin: number; marginPercent: number;
}) {
  return (
    <div className="space-y-6">
      {/* KPI Cards Row 1 — Revenue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenu total"
          value={`${stats.total_revenue_eur.toFixed(0)} EUR`}
          sub="ce mois"
          icon={DollarSign}
          color="text-emerald-500"
        />
        <StatCard
          label="MRR"
          value={`${stats.mrr_eur.toFixed(0)} EUR`}
          sub="abonnements actifs"
          icon={CreditCard}
          color="text-blue-500"
        />
        <StatCard
          label="Couts API"
          value={`${stats.api_costs.total_cost_usd.toFixed(2)} $`}
          sub={`Whisper: ${stats.api_costs.whisper_cost_usd}$ | LLM: ${stats.api_costs.llm_cost_usd}$`}
          icon={Zap}
          color="text-orange-500"
        />
        <StatCard
          label="Marge"
          value={`${margin.toFixed(0)} EUR`}
          sub={`${marginPercent}% marge`}
          icon={TrendingUp}
          color={margin >= 0 ? 'text-emerald-500' : 'text-red-500'}
        />
      </div>

      {/* KPI Cards Row 2 — Platform */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Utilisateurs"
          value={`${stats.total_users}`}
          sub={`+${stats.new_users_7d} (7j) / +${stats.new_users_30d} (30j)`}
          icon={Users}
          color="text-indigo-500"
        />
        <StatCard
          label="Conversion"
          value={`${stats.conversion.subscription_rate}%`}
          sub={`${stats.conversion.subscribed_users} abonnés / ${stats.conversion.total_users} total`}
          icon={ArrowUpRight}
          color="text-purple-500"
        />
        <StatCard
          label="Minutes ce mois"
          value={`${stats.total_minutes_this_month}`}
          sub={`${stats.total_transcriptions} transcriptions`}
          icon={Clock}
          color="text-blue-500"
        />
        <StatCard
          label="Erreurs 24h"
          value={`${stats.error_rate_24h}%`}
          sub={`${stats.queue_size} jobs en queue`}
          icon={AlertTriangle}
          color={stats.error_rate_24h > 10 ? 'text-red-500' : stats.error_rate_24h > 5 ? 'text-amber-500' : 'text-green-500'}
        />
      </div>

      {/* Revenue Breakdown + Backends Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Revenus ce mois
          </h2>
          <div className="space-y-3">
            <RevenueRow label="Abonnements (MRR)" value={stats.mrr_eur} color="bg-blue-500" />
            <RevenueRow label={`One-shots (${stats.oneshot_count})`} value={stats.oneshot_revenue_eur} color="bg-purple-500" />
            <RevenueRow label="Packs minutes" value={stats.pack_revenue_eur} color="bg-amber-500" />
            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{stats.total_revenue_eur.toFixed(2)} EUR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Backends Health */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-500" /> Sante des backends
          </h2>
          <div className="space-y-3">
            <BackendCard
              name="Whisper (STT)"
              status={stats.backends.whisper.status}
              detail={stats.backends.whisper.note || ''}
            />
            <BackendCard
              name="Ollama (LLM)"
              status={stats.backends.ollama.status}
              detail={stats.backends.ollama.models?.slice(0, 3).join(', ') || 'Aucun modele'}
            />
          </div>
          {/* API Costs Detail */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Couts API estimes</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Whisper STT</span>
                <span className="font-medium">{stats.api_costs.whisper_cost_usd.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LLM analyses</span>
                <span className="font-medium">{stats.api_costs.llm_cost_usd.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audio traite</span>
                <span className="font-medium">{stats.api_costs.total_audio_minutes} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Analyses</span>
                <span className="font-medium">{stats.api_costs.total_analyses}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Preview */}
      {stats.queue_preview.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-3">File d'attente ({stats.queue_size})</h2>
          <div className="space-y-2">
            {stats.queue_preview.map(job => (
              <div key={job.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[job.status] || 'bg-slate-400'}`} />
                  <span className="truncate">{job.file_path || job.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
                  <span className="text-slate-400">{job.user_id?.slice(0, 8)}</span>
                  <span>{PRIORITY_LABELS[job.priority] || job.priority}</span>
                  <span className="capitalize">{job.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── Users Tab ──────────────────────────────────────────── */

function UsersTab({ stats, users }: { stats: AdminStats; users: AdminUser[] }) {
  return (
    <div className="space-y-6">
      {/* Conversion funnel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MiniCard label="Sessions anonymes" value={stats.conversion.anonymous_sessions} />
        <MiniCard label="Total inscrits" value={stats.conversion.total_users} />
        <MiniCard label="Abonnés" value={stats.conversion.subscribed_users} />
        <MiniCard label="Sans abonnement" value={stats.conversion.no_subscription_users} />
        <MiniCard label="One-shot users" value={stats.conversion.oneshot_users} />
      </div>

      {/* Users by plan */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" /> Repartition par plan
        </h2>
        <div className="flex gap-3 flex-wrap">
          {stats.users_by_plan.map(p => (
            <div key={p.plan_id} className={`px-4 py-2 rounded-xl text-sm font-medium ${PLAN_COLORS[p.plan_id] || 'bg-slate-100 text-slate-700'}`}>
              {p.plan_id}: {p.count}
            </div>
          ))}
          {stats.users_by_plan.length === 0 && (
            <p className="text-sm text-slate-400">Aucun abonnement actif</p>
          )}
        </div>
      </div>

      {/* Recent users table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" /> Derniers inscrits
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="px-4 py-3 font-medium text-slate-500">Nom</th>
                <th className="px-4 py-3 font-medium text-slate-500">Role</th>
                <th className="px-4 py-3 font-medium text-slate-500">Plan</th>
                <th className="px-4 py-3 font-medium text-slate-500">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[u.plan_id] || ''}`}>
                      {u.plan_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Aucun utilisateur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


/* ─── Usage Tab ──────────────────────────────────────────── */

function UsageTab({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Minutes ce mois"
          value={`${stats.total_minutes_this_month}`}
          sub="minutes facturees"
          icon={Clock}
          color="text-blue-500"
        />
        <StatCard
          label="Audio traite"
          value={`${stats.api_costs.total_audio_minutes} min`}
          sub={`dont ${stats.api_costs.openai_stt_minutes} min OpenAI`}
          icon={Activity}
          color="text-purple-500"
        />
        <StatCard
          label="Analyses LLM"
          value={`${stats.api_costs.total_analyses}`}
          sub="ce mois"
          icon={Zap}
          color="text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage by source */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-4">Usage par source</h2>
          <div className="space-y-3">
            {Object.entries(stats.usage_by_source).map(([source, data]) => (
              <div key={source} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="capitalize">{source}</span>
                </div>
                <div className="flex gap-4 text-slate-500">
                  <span>{data.count} trans.</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{data.minutes} min</span>
                </div>
              </div>
            ))}
            {Object.keys(stats.usage_by_source).length === 0 && (
              <p className="text-sm text-slate-400">Aucune donnee</p>
            )}
          </div>
        </div>

        {/* Usage by profile */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-4">Usage par profil</h2>
          <div className="space-y-3">
            {Object.entries(stats.usage_by_profile).map(([profile, data]) => (
              <div key={profile} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="capitalize">{profile}</span>
                </div>
                <div className="flex gap-4 text-slate-500">
                  <span>{data.count} trans.</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{data.minutes} min</span>
                </div>
              </div>
            ))}
            {Object.keys(stats.usage_by_profile).length === 0 && (
              <p className="text-sm text-slate-400">Aucune donnee</p>
            )}
          </div>
        </div>
      </div>

      {/* Top users */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Top utilisateurs (ce mois)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">#</th>
                <th className="px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="px-4 py-3 font-medium text-slate-500">Nom</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Minutes</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Transcriptions</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_users.map((u, i) => (
                <tr key={u.user_id} className="border-t border-slate-100 dark:border-slate-700/50">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.name || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">{u.minutes}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{u.transcriptions}</td>
                </tr>
              ))}
              {stats.top_users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Aucun usage ce mois</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


/* ─── Billing Tab ────────────────────────────────────────── */

function BillingTab({ stats, billing }: { stats: AdminStats; billing: BillingEvent[] }) {
  return (
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard label="MRR" value={`${stats.mrr_eur.toFixed(0)} EUR`} />
        <MiniCard label="One-shots" value={`${stats.oneshot_revenue_eur.toFixed(0)} EUR (${stats.oneshot_count})`} />
        <MiniCard label="Packs" value={`${stats.pack_revenue_eur.toFixed(0)} EUR`} />
        <MiniCard label="Total" value={`${stats.total_revenue_eur.toFixed(0)} EUR`} />
      </div>

      {/* Billing events */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-500" /> Derniers evenements billing
        </h2>
        {billing.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun evenement</p>
        ) : (
          <div className="space-y-2">
            {billing.map(evt => (
              <div key={evt.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${evt.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <span className="font-medium">{evt.event_type}</span>
                    <span className="text-slate-400 ml-2 text-xs">{evt.user_id?.slice(0, 8)}...</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {evt.amount_cents != null && (
                    <span className="font-medium text-sm">{(evt.amount_cents / 100).toFixed(2)} EUR</span>
                  )}
                  {evt.created_at && (
                    <span>{new Date(evt.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── Funnel Tab ────────────────────────────────────────── */

const FUNNEL_COLORS = [
  'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
];

function SparkBar({ data, valueKey, maxOverride }: {
  data: { date: string;[k: string]: any }[];
  valueKey: string;
  maxOverride?: number;
}) {
  const values = data.map(d => d[valueKey] as number);
  const max = maxOverride ?? Math.max(...values, 1);
  const last7 = data.slice(-7);
  const sum7 = last7.reduce((s, d) => s + (d[valueKey] as number), 0);
  const prev7 = data.slice(-14, -7);
  const sumPrev = prev7.reduce((s, d) => s + (d[valueKey] as number), 0);
  const trend = sumPrev > 0 ? Math.round(((sum7 - sumPrev) / sumPrev) * 100) : 0;

  return (
    <div>
      <div className="flex items-end gap-[2px] h-16">
        {data.map((d, i) => (
          <div
            key={d.date}
            className="flex-1 bg-indigo-500/80 hover:bg-indigo-400 rounded-t transition-all cursor-default group relative"
            style={{ height: `${Math.max((d[valueKey] as number) / max * 100, 2)}%` }}
            title={`${d.date}: ${d[valueKey]}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-xs text-slate-400">
        <span>{data[0]?.date?.slice(5)}</span>
        <span className={trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-400' : ''}>
          {trend > 0 ? '+' : ''}{trend}% vs sem. prec.
        </span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

function FunnelTab({ funnel }: { funnel: FunnelData }) {
  const maxFunnel = Math.max(...funnel.funnel_steps.map(s => s.count), 1);

  const totalRev7d = funnel.daily_revenue.slice(-7).reduce((s, d) => s + d.total_eur, 0);
  const totalTx7d = funnel.daily_transcriptions.slice(-7).reduce((s, d) => s + d.count, 0);
  const totalSignups7d = funnel.daily_signups.slice(-7).reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Inscriptions 7j"
          value={`${totalSignups7d}`}
          sub="derniers 7 jours"
          icon={Users}
          color="text-indigo-500"
        />
        <StatCard
          label="Transcriptions 7j"
          value={`${totalTx7d}`}
          sub="derniers 7 jours"
          icon={Activity}
          color="text-blue-500"
        />
        <StatCard
          label="Revenu 7j"
          value={`${totalRev7d.toFixed(0)} EUR`}
          sub="one-shots + packs"
          icon={DollarSign}
          color="text-emerald-500"
        />
        <StatCard
          label="Churn risk"
          value={`${funnel.churn_indicators.inactive_30d}`}
          sub={`${funnel.churn_indicators.cancelled_subscriptions} resil. | ${funnel.churn_indicators.quota_exceeded} quota`}
          icon={UserMinus}
          color={funnel.churn_indicators.inactive_30d > 5 ? 'text-red-500' : 'text-slate-500'}
        />
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-500" /> Entonnoir de conversion
        </h2>
        <div className="space-y-3">
          {funnel.funnel_steps.map((step, i) => {
            const pct = Math.max((step.count / maxFunnel) * 100, 3);
            const dropoff = i > 0 && funnel.funnel_steps[i - 1].count > 0
              ? Math.round((1 - step.count / funnel.funnel_steps[i - 1].count) * 100)
              : 0;
            return (
              <div key={step.step} className="flex items-center gap-3">
                <div className="w-36 text-sm text-slate-600 dark:text-slate-400 flex-shrink-0 text-right">
                  {step.label}
                </div>
                <div className="flex-1 relative">
                  <div
                    className={`h-8 rounded-lg ${FUNNEL_COLORS[i % FUNNEL_COLORS.length]} flex items-center px-3 transition-all`}
                    style={{ width: `${pct}%`, minWidth: '60px' }}
                  >
                    <span className="text-white text-sm font-bold">{step.count}</span>
                  </div>
                </div>
                {dropoff > 0 && (
                  <div className="w-16 text-xs text-red-400 flex-shrink-0">
                    -{dropoff}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sparkline Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Signups */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Inscriptions / jour (30j)</h3>
          <SparkBar data={funnel.daily_signups} valueKey="count" />
        </div>
        {/* Daily Transcriptions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Transcriptions / jour (30j)</h3>
          <SparkBar data={funnel.daily_transcriptions} valueKey="count" />
        </div>
        {/* Daily Revenue */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Revenu / jour (30j)</h3>
          <SparkBar data={funnel.daily_revenue} valueKey="total_eur" />
        </div>
      </div>

      {/* Cohort Retention + Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cohort Retention */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Retention par cohorte
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500">Cohorte</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-center">Inscrits</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-center">S+1</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-center">S+2</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-center">S+3</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-center">S+4</th>
                </tr>
              </thead>
              <tbody>
                {funnel.cohort_retention.map(c => (
                  <tr key={c.cohort} className="border-t border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-3 font-medium text-xs">{c.cohort}</td>
                    <td className="px-4 py-3 text-center font-bold">{c.registered}</td>
                    {[c.week_1, c.week_2, c.week_3, c.week_4].map((val, wi) => {
                      const pct = c.registered > 0 ? Math.round((val / c.registered) * 100) : 0;
                      const intensity = pct === 0 ? '' : pct >= 60 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : pct >= 30 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
                      return (
                        <td key={wi} className={`px-4 py-3 text-center text-xs font-medium ${intensity}`}>
                          {c.registered > 0 ? `${val} (${pct}%)` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {funnel.cohort_retention.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Pas de donnees</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" /> Distribution des plans
          </h2>
          {funnel.plan_distribution.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun abonnement actif</p>
          ) : (
            <div className="space-y-4">
              {funnel.plan_distribution.map(p => {
                const totalUsers = funnel.plan_distribution.reduce((s, x) => s + x.users, 0);
                const pct = totalUsers > 0 ? Math.round((p.users / totalUsers) * 100) : 0;
                return (
                  <div key={p.plan_id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-medium px-2 py-0.5 rounded ${PLAN_COLORS[p.plan_id] || 'bg-slate-100 text-slate-700'}`}>
                        {p.plan_name}
                      </span>
                      <span className="text-slate-500">{p.users} users ({pct}%) &middot; {p.mrr_eur} EUR/mois</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${p.plan_id === 'team' ? 'bg-amber-500' : p.plan_id === 'pro' ? 'bg-purple-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between text-sm font-semibold">
                <span>MRR total</span>
                <span>{funnel.plan_distribution.reduce((s, p) => s + p.mrr_eur, 0).toFixed(0)} EUR</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* One-shot Stats + Contact + Churn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* One-shot Funnel */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-500" /> One-shot
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{funnel.oneshot_stats.total_orders}</p>
              <p className="text-xs text-slate-400">Commandes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{funnel.oneshot_stats.paid_orders}</p>
              <p className="text-xs text-slate-400">Payees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{funnel.oneshot_stats.conversion_rate}%</p>
              <p className="text-xs text-slate-400">Conversion</p>
            </div>
          </div>
          {funnel.oneshot_stats.by_tier.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
              {funnel.oneshot_stats.by_tier.map(t => (
                <div key={t.tier} className="flex justify-between text-sm">
                  <span className="text-slate-500">{t.tier}</span>
                  <span>{t.count} &middot; <span className="font-medium">{t.revenue_eur} EUR</span></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Stats */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" /> Contacts
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{funnel.contact_stats.total}</p>
              <p className="text-xs text-slate-400">Total</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${funnel.contact_stats.new_unread > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {funnel.contact_stats.new_unread}
              </p>
              <p className="text-xs text-slate-400">Non lus</p>
            </div>
          </div>
          {Object.keys(funnel.contact_stats.by_category).length > 0 && (
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
              {Object.entries(funnel.contact_stats.by_category).map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-slate-500 capitalize">{cat}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Churn Indicators */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <UserMinus className="w-4 h-4 text-red-500" /> Risques churn
          </h2>
          <div className="space-y-4">
            <ChurnRow
              label="Inactifs 30j"
              value={funnel.churn_indicators.inactive_30d}
              desc="Inscrits depuis >30j, aucune activite"
              severity={funnel.churn_indicators.inactive_30d > 10 ? 'high' : funnel.churn_indicators.inactive_30d > 3 ? 'medium' : 'low'}
            />
            <ChurnRow
              label="Resiliations"
              value={funnel.churn_indicators.cancelled_subscriptions}
              desc="Abonnements annules"
              severity={funnel.churn_indicators.cancelled_subscriptions > 5 ? 'high' : funnel.churn_indicators.cancelled_subscriptions > 0 ? 'medium' : 'low'}
            />
            <ChurnRow
              label="Quota depasse"
              value={funnel.churn_indicators.quota_exceeded}
              desc="Abonnes ayant consume 100% du forfait"
              severity={funnel.churn_indicators.quota_exceeded > 3 ? 'high' : funnel.churn_indicators.quota_exceeded > 0 ? 'medium' : 'low'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChurnRow({ label, value, desc, severity }: {
  label: string; value: number; desc: string; severity: 'low' | 'medium' | 'high';
}) {
  const colors = {
    low: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    medium: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    high: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  };
  return (
    <div className={`p-3 rounded-lg ${colors[severity]}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xl font-bold">{value}</span>
      </div>
      <p className="text-xs opacity-70 mt-0.5">{desc}</p>
    </div>
  );
}


/* ─── Shared Components ──────────────────────────────────── */

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
        <Icon className={`w-4 h-4 ${color}`} /> {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function RevenueRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
      <span className="font-medium">{value.toFixed(2)} EUR</span>
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
