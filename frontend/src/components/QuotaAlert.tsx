import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, XCircle, Ban, ShoppingCart, ArrowUpCircle, X } from 'lucide-react';
import axios from 'axios';
import { QuotaAlert as QuotaAlertType, AlertsResponse } from '../types';

function QuotaAlertBanner() {
  const [alertsData, setAlertsData] = useState<AlertsResponse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('quota_dismissed');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    const fetchAlerts = () => {
      axios.get<AlertsResponse>('/api/subscription/alerts')
        .then(res => setAlertsData(res.data))
        .catch(() => {});
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = (level: string) => {
    const next = new Set(dismissed).add(level);
    setDismissed(next);
    try { sessionStorage.setItem('quota_dismissed', JSON.stringify([...next])); } catch {}
  };

  const alerts = alertsData?.alerts || [];
  const visible = alerts.filter(a => !dismissed.has(a.level));
  if (visible.length === 0) return null;

  const minutesRemaining = alertsData?.minutes_remaining ?? 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {visible.map((alert) => (
        <div
          key={alert.level}
          className={`p-4 rounded-xl shadow-lg border backdrop-blur-sm ${
            alert.level === 'blocked'
              ? 'bg-red-950/95 border-red-500/50 text-red-100'
              : alert.level === 'critical'
              ? 'bg-red-900/95 border-red-500/40 text-red-100'
              : 'bg-amber-900/95 border-amber-500/40 text-amber-100'
          }`}
        >
          <div className="flex items-start gap-3">
            {alert.level === 'blocked' ? (
              <Ban className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            ) : alert.level === 'critical' ? (
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {alert.level === 'blocked'
                  ? 'Quota épuisé. Vos transcriptions sont en pause.'
                  : alert.level === 'critical'
                  ? `Plus que ${minutesRemaining} minutes. Rechargez pour continuer.`
                  : `${minutesRemaining} minutes restantes sur votre forfait.`
                }
              </p>
              <div className="mt-2 flex gap-2">
                {alert.level === 'warning' ? (
                  <Link
                    to="/plans"
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                  >
                    <ShoppingCart className="w-3 h-3" /> Ajouter des minutes
                  </Link>
                ) : (
                  <Link
                    to="/plans"
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors font-semibold"
                  >
                    <ShoppingCart className="w-3 h-3" /> Recharger maintenant
                  </Link>
                )}
                <Link
                  to="/plans"
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 text-white/60 hover:text-white/80 transition-colors"
                >
                  Voir les plans
                </Link>
              </div>
            </div>
            <button
              onClick={() => dismiss(alert.level)}
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default QuotaAlertBanner;
