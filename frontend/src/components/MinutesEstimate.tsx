import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import { SubscriptionInfo } from '../types';

interface MinutesEstimateProps {
  files: File[];
}

function MinutesEstimate({ files }: MinutesEstimateProps) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    axios.get('/api/subscription')
      .then(res => setSubscription(res.data))
      .catch(() => {});
  }, []);

  if (!subscription || files.length === 0) return null;

  // Estimate duration from file size (rough: ~1 MB per minute for MP3)
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const estimatedMinutes = Math.max(1, Math.ceil(totalBytes / (1024 * 1024)));
  const remaining = subscription.minutes_remaining;
  const afterUpload = remaining - estimatedMinutes;
  const needsExtra = afterUpload < 0;
  const extraAvailable = subscription.extra_minutes_balance;
  const totalAvailable = remaining + extraAvailable;
  const canProcess = totalAvailable >= estimatedMinutes;

  return (
    <div className={`mt-4 p-4 rounded-xl border ${
      !canProcess
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : needsExtra
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Consommation estimee
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-slate-500">Minutes estimees</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">~{estimatedMinutes} min</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Disponible</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {remaining} min
            {extraAvailable > 0 && <span className="text-xs text-slate-400 font-normal"> +{extraAvailable}</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Solde apres</p>
          <p className={`text-lg font-bold ${
            !canProcess ? 'text-red-600' : needsExtra ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {canProcess ? (needsExtra ? `${totalAvailable - estimatedMinutes}` : `${afterUpload}`) : 'Insuffisant'}
          </p>
        </div>
      </div>
      {!canProcess && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Il manque {estimatedMinutes - totalAvailable} minutes pour traiter ce fichier.</span>
          </div>
          <Link
            to="/plans"
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors font-medium whitespace-nowrap"
          >
            <ShoppingCart className="w-3 h-3" /> Ajouter des minutes
          </Link>
        </div>
      )}
      {needsExtra && canProcess && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {estimatedMinutes - remaining} minutes seront prises de vos minutes extra.
        </p>
      )}
      <p className="mt-2 text-xs text-slate-400">
        Estimation basee sur la taille du fichier. Le decompte final sera calcule sur la duree reelle.
      </p>
    </div>
  );
}

export default MinutesEstimate;
