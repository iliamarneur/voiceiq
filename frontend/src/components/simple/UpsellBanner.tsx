import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, X } from 'lucide-react';

function UpsellBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mt-8 rounded-xl border border-slate-700 bg-slate-800/80 p-6 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      <h3 className="font-semibold text-slate-200 mb-3">
        Vous avez des fichiers à transcrire régulièrement ?
      </h3>

      <div className="space-y-2 mb-4">
        {[
          'Dès 0.06 EUR/min (7x moins cher que le one-shot)',
          'Profils métiers (réunion, cours, médical, juridique)',
          'Chat IA pour poser des questions sur vos transcriptions',
          'Exports avancés (PDF, PowerPoint, sous-titres)',
        ].map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Link
          to="/plans"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg transition-all text-sm"
        >
          Découvrir les abonnements <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          C'est tout, merci.
        </button>
      </div>
    </div>
  );
}

export default UpsellBanner;
