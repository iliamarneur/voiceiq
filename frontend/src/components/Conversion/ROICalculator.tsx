import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, ArrowRight, Clock, TrendingUp } from 'lucide-react';

interface ROICalculatorProps {
  className?: string;
}

export default function ROICalculator({ className = '' }: ROICalculatorProps) {
  const [meetingsPerWeek, setMeetingsPerWeek] = useState(5);
  const [avgDurationMin, setAvgDurationMin] = useState(60);

  const result = useMemo(() => {
    const monthlyMinutes = meetingsPerWeek * 4.33 * avgDurationMin;
    // Temps de rédaction manuelle : environ 2x la durée de la réunion pour un CR
    const manualTimePerMeeting = avgDurationMin * 2; // minutes
    const manualMonthlyHours = (meetingsPerWeek * 4.33 * manualTimePerMeeting) / 60;
    // ClearRecap : ~5 min de review par CR
    const clearrecapTimePerMeeting = 5;
    const clearrecapMonthlyHours = (meetingsPerWeek * 4.33 * clearrecapTimePerMeeting) / 60;
    const savedHours = manualMonthlyHours - clearrecapMonthlyHours;

    // Coût horaire moyen d'un cadre : ~50€/h
    const savedEuros = savedHours * 50;

    // Plan recommandé
    let recommendedPlan = 'Basic (19€/mois)';
    let planCost = 19;
    if (monthlyMinutes > 3000) {
      recommendedPlan = 'Équipe+ (99€/mois)';
      planCost = 99;
    } else if (monthlyMinutes > 500) {
      recommendedPlan = 'Pro (49€/mois)';
      planCost = 49;
    }

    const roi = planCost > 0 ? Math.round((savedEuros - planCost) / planCost * 100) : 0;

    return {
      monthlyMinutes: Math.round(monthlyMinutes),
      savedHours: Math.round(savedHours),
      savedEuros: Math.round(savedEuros),
      recommendedPlan,
      planCost,
      roi,
    };
  }, [meetingsPerWeek, avgDurationMin]);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 md:p-8 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Calculateur de ROI</h3>
          <p className="text-sm text-slate-500">Estimez le temps et l'argent économisés avec ClearRecap</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Réunions par semaine
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={meetingsPerWeek}
            onChange={e => setMeetingsPerWeek(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span>
            <span className="font-bold text-indigo-600 text-sm">{meetingsPerWeek}</span>
            <span>20</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Durée moyenne (minutes)
          </label>
          <input
            type="range"
            min={15}
            max={180}
            step={15}
            value={avgDurationMin}
            onChange={e => setAvgDurationMin(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>15 min</span>
            <span className="font-bold text-indigo-600 text-sm">{avgDurationMin} min</span>
            <span>3h</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-indigo-50 text-center">
          <Clock className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
          <p className="text-2xl font-extrabold text-slate-800">{result.savedHours}h</p>
          <p className="text-xs text-slate-500">Économisées/mois</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50 text-center">
          <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <p className="text-2xl font-extrabold text-slate-800">{result.savedEuros}€</p>
          <p className="text-xs text-slate-500">Économie/mois</p>
        </div>
        <div className="p-4 rounded-xl bg-violet-50 text-center">
          <p className="text-2xl font-extrabold text-slate-800">{result.monthlyMinutes}</p>
          <p className="text-xs text-slate-500">Minutes/mois</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 text-center">
          <p className="text-2xl font-extrabold text-slate-800">{result.roi > 0 ? '+' : ''}{result.roi}%</p>
          <p className="text-xs text-slate-500">ROI estimé</p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Plan recommandé :</p>
          <p className="font-bold text-slate-800">{result.recommendedPlan}</p>
        </div>
        <Link
          to="/plans"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-500 transition-colors"
        >
          Voir les plans
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
