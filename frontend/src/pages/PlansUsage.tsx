import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Clock, Zap, TrendingUp, Package, Check, Crown, Users, Briefcase, Star } from 'lucide-react';
import axios from 'axios';
import { PlanInfo, SubscriptionInfo, UsageSummary } from '../types';

const FEATURE_LABELS: Record<string, string> = {
  transcription: 'Transcription',
  summary: 'Résumé',
  keypoints: 'Points clés',
  actions: 'Plan d\'actions',
  flashcards: 'Fiches de révision',
  quiz: 'Quiz',
  chat: 'Discussion IA',
  dictation: 'Dictée vocale',
  mindmap: 'Carte mentale',
  slides: 'Diapositives',
  infographic: 'Infographie',
  tables: 'Tableaux',
  export_txt: 'Export TXT',
  export_pdf: 'Export PDF',
  export_md: 'Export Markdown',
  export_pptx: 'Export PowerPoint',
  templates: 'Modèles personnalisés',
  presets: 'Configurations audio',
  priority_queue: 'File prioritaire',
  multi_workspace: 'Multi-espaces',
  shared_presets: 'Configurations partagées',
  batch_export: 'Export groupé',
};

function PlansUsagePage() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      axios.get('/api/plans').then(r => setPlans(r.data)),
      axios.get('/api/subscription').then(r => setSubscription(r.data)),
      axios.get('/api/usage/summary').then(r => setUsage(r.data)),
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
      // If Stripe returns a checkout URL, redirect to it
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }
      // Stub mode: plan applied immediately
      setSubscription(res.data);
      const usageRes = await axios.get('/api/usage/summary');
      setUsage(usageRes.data);
    } catch (e: any) {
      setActionError(e.response?.data?.detail || 'Erreur lors du changement de plan');
    }
    setChanging(false);
  };

  const [cancelling, setCancelling] = useState(false);

  const cancelSubscription = async () => {
    setCancelling(true);
    setActionError(null);
    try {
      await axios.post('/api/subscription/cancel');
      // Refresh subscription info
      const subRes = await axios.get('/api/subscription');
      setSubscription(subRes.data);
    } catch (e: any) {
      setActionError(e.response?.data?.detail || 'Erreur lors de l\'annulation');
    }
    setCancelling(false);
  };

  const openBillingPortal = async () => {
    try {
      const res = await axios.post('/api/billing/portal');
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        setActionError('Portail Stripe non disponible (mode développement).');
      }
    } catch (e: any) {
      setActionError(e.response?.data?.detail || 'Impossible d\'ouvrir le portail de gestion.');
    }
  };

  const planIcons: Record<string, any> = {
    basic: Briefcase,
    pro: Crown,
    team: Users,
  };

  const planColors: Record<string, string> = {
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
          {/* Subscription management buttons */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={openBillingPortal}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors"
            >
              Gérer mon abonnement
            </button>
            {subscription.status === 'active' && (
              <button
                onClick={cancelSubscription}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-red-500/30 transition-colors"
              >
                {cancelling ? 'Annulation...' : 'Annuler l\'abonnement'}
              </button>
            )}
            {subscription.status === 'cancelling' && (
              <span className="px-4 py-2 text-sm opacity-70">
                Annulation prévue en fin de période
              </span>
            )}
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
        <h2 className="text-xl font-bold mb-4">Choisir une offre</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* One-shot card */}
          <div className="relative rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-all hover:border-slate-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-lg">À la demande</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">Dès 3</span>
              <span className="text-slate-500 text-sm"> EUR</span>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
              Sans abonnement
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              paiement à l'unité
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
              {['transcription', 'summary', 'keypoints'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  {FEATURE_LABELS[f] || f}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                Jusqu'à 180 min/fichier
              </li>
            </ul>
            <Link
              to="/"
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-sm block text-center"
            >
              Transcrire un fichier
            </Link>
          </div>

          {/* Subscription plans */}
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
                  <span className="text-2xl font-bold">{(plan.price_cents / 100).toFixed(0)}</span>
                  <span className="text-slate-500 text-sm"> EUR/mois</span>
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

    </motion.div>
  );
}

export default PlansUsagePage;
