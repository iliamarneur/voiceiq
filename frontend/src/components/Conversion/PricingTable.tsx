import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Zap, ShoppingBag } from 'lucide-react';

interface PricingTableProps {
  className?: string;
  showOneshot?: boolean;
  ctaBase?: string;
}

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    subtitle: 'Solo / Freelance',
    monthlyPrice: 19,
    annualPrice: 15,
    minutes: '500 min/mois',
    features: [
      '11 analyses IA',
      'Chat IA avec transcription',
      'Dictée vocale',
      'Export TXT, PDF, Markdown',
    ],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'PME / Équipe',
    monthlyPrice: 49,
    annualPrice: 39,
    minutes: '3 000 min/mois',
    features: [
      'Toutes les analyses IA',
      'Export PowerPoint',
      'Modèles et profils custom',
      'File de traitement prioritaire',
      'Diarisation avancée',
    ],
    highlight: true,
    badge: 'Recommandé',
  },
  {
    id: 'equipe',
    name: 'Équipe+',
    subtitle: 'Éducation / Institution',
    monthlyPrice: 99,
    annualPrice: 79,
    minutes: '10 000 min/mois',
    features: [
      'Tout Pro inclus',
      'Multi-espaces de travail',
      'Profils partagés',
      'Export par lot',
      'Support prioritaire',
    ],
    highlight: false,
  },
];

const ONESHOT_TIERS = [
  { name: 'Court', duration: '30 min', price: 3 },
  { name: 'Standard', duration: '1h', price: 6 },
  { name: 'Long', duration: '1h30', price: 9 },
  { name: 'XLong', duration: '2h', price: 12 },
  { name: 'XXLong', duration: '2h30', price: 15 },
  { name: 'XXXLong', duration: '3h', price: 18 },
];

export default function PricingTable({ className = '', showOneshot = true, ctaBase = '/plans' }: PricingTableProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <div className={className}>
      {/* Toggle mensuel / annuel */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-medium ${!annual ? 'text-slate-800' : 'text-slate-400'}`}>Mensuel</span>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-indigo-600' : 'bg-slate-300'}`}
          aria-label="Basculer facturation annuelle"
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm font-medium ${annual ? 'text-slate-800' : 'text-slate-400'}`}>
          Annuel
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
            -20%
          </span>
        </span>
      </div>

      {/* One-shot */}
      {showOneshot && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold">À l'unité — sans abonnement</h3>
              <p className="text-xs text-slate-500">Payez uniquement ce que vous transcrivez</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {ONESHOT_TIERS.map(tier => (
              <div key={tier.name} className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
                <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">{tier.name}</p>
                <p className="text-xl font-extrabold mt-0.5">{tier.price}€</p>
                <p className="text-xs text-slate-500">≤ {tier.duration}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              to="/oneshot"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-500 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Transcrire sans compte
            </Link>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map(plan => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          return (
            <div
              key={plan.id}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                plan.highlight
                  ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 bg-white'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white shadow">
                  {plan.badge}
                </span>
              )}
              <p className="text-sm font-semibold text-slate-600">{plan.name}</p>
              <p className="text-xs text-slate-400 mb-3">{plan.subtitle}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold">{price}</span>
                <span className="text-sm text-slate-400">€/mois</span>
              </div>
              {annual && (
                <p className="text-xs text-emerald-600 font-medium mb-1">
                  Facturé {price * 12}€/an (au lieu de {plan.monthlyPrice * 12}€)
                </p>
              )}
              <p className="text-sm text-slate-500 mb-4">{plan.minutes}</p>
              <p className="text-xs text-slate-400 mb-4">Sans engagement</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={ctaBase}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Choisir {plan.name}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
