import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type'); // 'plan' | 'oneshot'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Paiement annulé
        </h1>

        <p className="text-slate-500 mb-6">
          Votre paiement n'a pas été effectué. Aucun montant n'a été débité.
        </p>

        <div className="flex flex-col gap-3">
          {type === 'plan' && (
            <Link
              to="/app/plans"
              className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Réessayer
            </Link>
          )}

          {type === 'oneshot' && (
            <Link
              to="/oneshot"
              className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Réessayer
            </Link>
          )}

          {!type && (
            <Link
              to="/app/plans"
              className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Voir les offres
            </Link>
          )}

          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Retour à l'accueil
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default PaymentCancel;
