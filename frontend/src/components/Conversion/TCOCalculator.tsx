import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calculator, ArrowRight, Building2, Cloud, TrendingDown } from 'lucide-react';

interface TCOCalculatorProps {
  className?: string;
}

// Cost assumptions (configurable)
const CLOUD_COST_PER_MINUTE = 0.12; // €/min average (Otter/HappyScribe/Sonix)
const CLEARRECAP_LICENSE_ANNUAL = 12000;
const CLEARRECAP_SETUP = 3500;
const HARDWARE_COST = 7500; // GPU server, amortized over 5 years
const MAINTENANCE_ANNUAL = 1500;

type Period = 1 | 3 | 5;

const SECTORS = [
  { id: 'medical', label: 'Médical' },
  { id: 'juridique', label: 'Juridique' },
  { id: 'business', label: 'Business' },
  { id: 'education', label: 'Éducation' },
  { id: 'autre', label: 'Autre' },
];

export default function TCOCalculator({ className = '' }: TCOCalculatorProps) {
  const [hoursPerMonth, setHoursPerMonth] = useState(50);
  const [users, setUsers] = useState(10);
  const [sector, setSector] = useState('business');
  const [years, setYears] = useState<Period>(3);

  const result = useMemo(() => {
    const minutesPerMonth = hoursPerMonth * 60;
    const totalMonths = years * 12;

    // Cloud cost: per-minute pricing * users (each user has their own minutes)
    const cloudMonthly = minutesPerMonth * users * CLOUD_COST_PER_MINUTE;
    const cloudTotal = cloudMonthly * totalMonths;

    // ClearRecap on-premise: setup + hardware + (license + maintenance) * years
    const clearrecapTotal =
      CLEARRECAP_SETUP +
      HARDWARE_COST +
      (CLEARRECAP_LICENSE_ANNUAL + MAINTENANCE_ANNUAL) * years;

    const savings = cloudTotal - clearrecapTotal;
    const savingsPercent = cloudTotal > 0 ? Math.round((savings / cloudTotal) * 100) : 0;

    // Break-even month
    const monthlyCloudCost = cloudMonthly;
    const monthlyClearrecapCost = (CLEARRECAP_LICENSE_ANNUAL + MAINTENANCE_ANNUAL) / 12;
    const initialInvestment = CLEARRECAP_SETUP + HARDWARE_COST;
    const monthlySaving = monthlyCloudCost - monthlyClearrecapCost;
    const breakEvenMonth = monthlySaving > 0 ? Math.ceil(initialInvestment / monthlySaving) : 999;

    return {
      cloudTotal: Math.round(cloudTotal),
      clearrecapTotal: Math.round(clearrecapTotal),
      savings: Math.round(savings),
      savingsPercent,
      breakEvenMonth,
      cloudMonthly: Math.round(cloudMonthly),
    };
  }, [hoursPerMonth, users, years]);

  const maxCost = Math.max(result.cloudTotal, result.clearrecapTotal);
  const cloudBarWidth = maxCost > 0 ? (result.cloudTotal / maxCost) * 100 : 0;
  const localBarWidth = maxCost > 0 ? (result.clearrecapTotal / maxCost) * 100 : 0;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden ${className}`}>
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Calculateur TCO — Cloud vs On-Premise</h3>
            <p className="text-sm text-slate-500">Comparez le coût total de possession sur 1, 3 ou 5 ans</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Heures audio/mois
            </label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={hoursPerMonth}
              onChange={e => setHoursPerMonth(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-center text-sm font-bold text-indigo-600 mt-1">{hoursPerMonth}h</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Utilisateurs
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={users}
              onChange={e => setUsers(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-center text-sm font-bold text-indigo-600 mt-1">{users}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Secteur
            </label>
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {SECTORS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Période
            </label>
            <div className="flex gap-2">
              {([1, 3, 5] as Period[]).map(y => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    years === y
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {y} an{y > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bar comparison */}
        <div className="space-y-4 mb-8">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Cloud className="w-4 h-4 text-slate-400" />
                Solutions Cloud
              </span>
              <span className="text-sm font-bold text-slate-800">
                {result.cloudTotal.toLocaleString('fr-FR')}€
              </span>
            </div>
            <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
              <motion.div
                className="h-full bg-slate-400 rounded-lg"
                initial={{ width: 0 }}
                animate={{ width: `${cloudBarWidth}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{result.cloudMonthly.toLocaleString('fr-FR')}€/mois × {years * 12} mois</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                <Building2 className="w-4 h-4 text-indigo-600" />
                ClearRecap On-Premise
              </span>
              <span className="text-sm font-bold text-indigo-700">
                {result.clearrecapTotal.toLocaleString('fr-FR')}€
              </span>
            </div>
            <div className="h-8 bg-indigo-50 rounded-lg overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500 rounded-lg"
                initial={{ width: 0 }}
                animate={{ width: `${localBarWidth}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Setup {CLEARRECAP_SETUP.toLocaleString('fr-FR')}€ + hardware {HARDWARE_COST.toLocaleString('fr-FR')}€ + licence {CLEARRECAP_LICENSE_ANNUAL.toLocaleString('fr-FR')}€/an</p>
          </div>
        </div>

        {/* Result */}
        {result.savings > 0 ? (
          <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <TrendingDown className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-emerald-700">
              Économie de {result.savings.toLocaleString('fr-FR')}€
            </p>
            <p className="text-sm text-emerald-600 mt-1">
              soit {result.savingsPercent}% sur {years} an{years > 1 ? 's' : ''} — rentabilisé en {result.breakEvenMonth} mois
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <p className="text-sm text-blue-700">
              Pour ce volume, un abonnement SaaS ClearRecap (dès 19€/mois) est plus adapté que l'on-premise.
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          {result.savings > 0
            ? 'Intéressé par l\'installation on-premise ?'
            : 'Commencez avec un abonnement SaaS.'}
        </p>
        {result.savings > 0 ? (
          <a
            href="mailto:contact@clearrecap.fr?subject=Demande de devis ClearRecap On-Premise"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-500 transition-colors"
          >
            Demander un devis
            <ArrowRight className="w-4 h-4" />
          </a>
        ) : (
          <Link
            to="/plans"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-500 transition-colors"
          >
            Voir les plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Methodology */}
      <details className="px-6 py-4 border-t border-slate-100">
        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
          Hypothèses et méthodologie
        </summary>
        <div className="mt-3 text-xs text-slate-400 space-y-1">
          <p>• Coût cloud moyen : {CLOUD_COST_PER_MINUTE}€/minute (moyenne Otter.ai, HappyScribe, Sonix)</p>
          <p>• Licence ClearRecap on-premise : {CLEARRECAP_LICENSE_ANNUAL.toLocaleString('fr-FR')}€/an</p>
          <p>• Installation + formation : {CLEARRECAP_SETUP.toLocaleString('fr-FR')}€ (one-time)</p>
          <p>• Serveur GPU : {HARDWARE_COST.toLocaleString('fr-FR')}€ (amorti sur 5 ans)</p>
          <p>• Maintenance annuelle : {MAINTENANCE_ANNUAL.toLocaleString('fr-FR')}€/an</p>
          <p>• Ces chiffres sont indicatifs. Contactez-nous pour un devis personnalisé.</p>
        </div>
      </details>
    </div>
  );
}
