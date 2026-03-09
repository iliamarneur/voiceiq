import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Clock, Zap, TrendingUp, Package, Check, Crown, Users, GraduationCap, Briefcase, Plus, Star, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { PlanInfo, SubscriptionInfo, UsageSummary, ExtraPack, OneshotTier } from '../types';

const FEATURE_LABELS: Record<string, string> = {
  transcription: 'Transcription',
  summary: 'Résumé',
  keypoints: 'Points clés',
  actions: 'Plan d\'actions',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  chat: 'Chat IA',
  dictation: 'Dictée vocale',
  mindmap: 'Carte mentale',
  slides: 'Slides',
  infographic: 'Infographie',
  tables: 'Tableaux',
  export_txt: 'Export TXT',
  export_pdf: 'Export PDF',
  export_md: 'Export Markdown',
  export_pptx: 'Export PowerPoint',
  templates: 'Templates personnalisés',
  presets: 'Presets audio',
  priority_queue: 'File prioritaire',
  multi_workspace: 'Multi-espaces',
  shared_presets: 'Presets partagés',
  batch_export: 'Export groupe',
};

function PlansUsagePage() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [extraPacks, setExtraPacks] = useState<ExtraPack[]>([]);
  const [oneshotTiers, setOneshotTiers] = useState<OneshotTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      axios.get('/api/plans').then(r => setPlans(r.data)),
      axios.get('/api/subscription').then(r => setSubscription(r.data)),
      axios.get('/api/usage/summary').then(r => setUsage(r.data)),
      axios.get('/api/subscription/extra-packs').then(r => setExtraPacks(r.data)),
      axios.get('/api/oneshot/tiers').then(r => setOneshotTiers(r.data)),
    ]).catch(e => {
      console.error('PlansUsage load error:', e);
      setLoadError('Impossible de charger les informations. Vérifiez que le backend est démarré.');
    }).finally(() => setLoading(false));
  }, []);

  const changePlan = async (planId: string) => {
    setChanging(true);
    setActionError(null);
    try {
      const res = await axios.put('/api/subscription/plan', { plan_id: planId });
      setSubscription(res.data);
      const usageRes = await axios.get('/api/usage/summary');
      setUsage(usageRes.data);
    } catch (e: any) {
      setActionError(e.response?.data?.detail || 'Erreur lors du changement de plan');
    }
    setChanging(false);
  };

  const buyExtraMinutes = async (pack: string) => {
    setActionError(null);
    try {
      await axios.post('/api/subscription/add-minutes', { pack });
      const [subRes, usageRes] = await Promise.all([
        axios.get('/api/subscription'),
        axios.get('/api/usage/summary'),
      ]);
      setSubscription(subRes.data);
      setUsage(usageRes.data);
    } catch (e: any) {
      setActionError(e.response?.data?.detail || 'Erreur lors de l\'achat de minutes');
    }
  };

  const planIcons: Record<string, any> = {
    free: Clock,
    basic: Briefcase,
    pro: Crown,
    team: Users,
  };

  const planColors: Record<string, string> = {
    free: 'from-slate-400 to-slate-500',
    basic: 'from-blue-500 to-indigo-600',
    pro: 'from-purple-500 to-pink-600',
    team: 'from-amber-500 to-orange-600',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
          {loadError}
        </div>
      </div>
    );
  }

  const usagePercent = subscription
    ? Math.min(100, Math.round((subscription.minutes_used / Math.max(subscription.minutes_included, 1)) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold">Plans & Consommation</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez votre abonnement et suivez votre usage</p>
      </div>

      {/* Error Banner */}
      {actionError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 text-sm font-bold">✕</button>
        </div>
      )}

      {/* Current Subscription Banner */}
      {subscription && (
        <div className={`rounded-2xl p-6 bg-gradient-to-r ${planColors[subscription.plan_id] || 'from-indigo-500 to-purple-600'} text-white shadow-lg`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm opacity-80">Plan actuel</p>
              <h2 className="text-2xl font-bold">{subscription.plan_name}</h2>
              <p className="text-sm opacity-80 mt-1">
                Période : {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString('fr') : '—'}
                {' → '}
                {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('fr') : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{subscription.minutes_remaining}</p>
              <p className="text-sm opacity-80">minutes restantes</p>
              {subscription.extra_minutes_balance > 0 && (
                <p className="text-sm mt-1 bg-white/20 rounded-full px-3 py-0.5 inline-block">
                  +{subscription.extra_minutes_balance} min extra
                </p>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm opacity-80 mb-1">
              <span>{subscription.minutes_used} min utilisées</span>
              <span>{subscription.minutes_included} min incluses</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-400' : usagePercent > 70 ? 'bg-amber-400' : 'bg-white'}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
              <TrendingUp className="w-4 h-4" /> Transcriptions
            </div>
            <p className="text-2xl font-bold">{usage.total_transcriptions}</p>
            <p className="text-xs text-slate-400">ce mois</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
              <Clock className="w-4 h-4" /> Audio total
            </div>
            <p className="text-2xl font-bold">{usage.total_audio_minutes}</p>
            <p className="text-xs text-slate-400">minutes</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
              <Package className="w-4 h-4" /> Par mode
            </div>
            {Object.entries(usage.by_source).length > 0 ? (
              <div className="text-sm space-y-0.5">
                {Object.entries(usage.by_source).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500 capitalize">{k}</span>
                    <span className="font-medium">{v} min</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Aucun usage</p>
            )}
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
              <Briefcase className="w-4 h-4" /> Par profil
            </div>
            {Object.entries(usage.by_profile).length > 0 ? (
              <div className="text-sm space-y-0.5">
                {Object.entries(usage.by_profile).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500 capitalize">{k}</span>
                    <span className="font-medium">{v} min</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Aucun usage</p>
            )}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">Choisir un plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const Icon = planIcons[plan.id] || CreditCard;
            const isActive = subscription?.plan_id === plan.id;
            const isRecommended = plan.id === 'pro';
            const pricePerMin = plan.price_cents > 0 && plan.minutes_included > 0
              ? (plan.price_cents / plan.minutes_included).toFixed(1)
              : null;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-5 transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
                    : isRecommended
                    ? 'border-purple-500 bg-white dark:bg-slate-800 shadow-lg shadow-purple-500/10 scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                {isRecommended && !isActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3" /> Recommandé
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${planColors[plan.id] || 'from-slate-400 to-slate-500'} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <div className="mt-2">
                  {plan.price_cents === 0 ? (
                    <span className="text-2xl font-bold">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">{(plan.price_cents / 100).toFixed(0)}</span>
                      <span className="text-slate-500 text-sm"> EUR/mois</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                  {plan.minutes_included} min incluses
                </p>
                {pricePerMin && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    soit {pricePerMin} c/min
                  </p>
                )}
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                  {plan.features.slice(0, 8).map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {FEATURE_LABELS[f] || f}
                    </li>
                  ))}
                  {plan.features.length > 8 && (
                    <li className="text-xs text-slate-400">+{plan.features.length - 8} autres fonctionnalités</li>
                  )}
                </ul>
                <button
                  onClick={() => !isActive && changePlan(plan.id)}
                  disabled={isActive || changing}
                  className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 cursor-default'
                      : isRecommended
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg shadow-sm'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                  }`}
                >
                  {isActive ? 'Plan actuel' : 'Choisir ce plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Extra Minutes */}
      <div>
        <h2 className="text-xl font-bold mb-2">Recharger des minutes</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Ajoutez des minutes à votre solde actuel, sans changer de plan.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {extraPacks.map((pack, i) => {
            const bestValue = i === extraPacks.length - 1;
            return (
              <div key={pack.pack} className={`rounded-xl border p-5 relative ${
                bestValue
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}>
                {bestValue && (
                  <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    Meilleur prix
                  </span>
                )}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">Pack {pack.pack}</h3>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-1">
                    {(pack.price_cents / pack.minutes * 100).toFixed(1)} c/min
                  </span>
                </div>
                <p className="text-3xl font-bold">{pack.minutes} <span className="text-base font-normal text-slate-500">min</span></p>
                <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mt-1">{(pack.price_cents / 100).toFixed(0)} EUR</p>
                <button
                  onClick={() => buyExtraMinutes(pack.pack)}
                  className="mt-3 w-full py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Acheter
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* One-shot info */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Transcription One-Shot</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Besoin d'une seule transcription ? Pas besoin d'abonnement.
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg transition-all"
          >
            Essayer <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {oneshotTiers.map(t => (
            <div key={t.tier} className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{(t.price_cents / 100).toFixed(0)} EUR</p>
              <p className="text-sm font-medium mt-1">{t.tier} — {t.max_duration_minutes} min max</p>
              <p className="text-xs text-slate-400 mt-1">
                {t.includes.map((f: string) => FEATURE_LABELS[f] || f).join(', ')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default PlansUsagePage;
