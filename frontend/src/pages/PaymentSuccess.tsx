import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type'); // 'plan' | 'oneshot'
  const planId = searchParams.get('plan_id');
  const orderId = searchParams.get('order_id');
  const jobId = searchParams.get('job_id');
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(5);
  const [confirming, setConfirming] = useState(false);

  // Confirm payment for plan or oneshot
  useEffect(() => {
    if (type === 'plan' && planId && sessionId) {
      setConfirming(true);
      axios.post('/api/subscription/confirm-payment', {
        session_id: sessionId,
        plan_id: planId,
      }).then(() => {
        setConfirming(false);
      }).catch(() => {
        setConfirming(false);
      });
    } else if (type === 'oneshot' && jobId) {
      setConfirming(true);
      axios.post('/api/oneshot/confirm-payment', {
        job_id: jobId,
        session_id: sessionId,
      }).then(() => {
        setConfirming(false);
      }).catch(() => {
        setConfirming(false);
      });
    }
  }, [type, planId, jobId, sessionId]);

  useEffect(() => {
    if (confirming) return; // wait for confirmation before countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (type === 'plan') {
            navigate('/app/plans');
          } else if (type === 'oneshot' && jobId) {
            navigate(`/processing/${jobId}`);
          } else {
            navigate('/');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [type, planId, orderId, jobId, navigate, confirming]);

  const planLabels: Record<string, string> = {
    basic: 'Basic (Solo)',
    pro: 'Pro (PME)',
    team: 'Équipe+ (Éducation)',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Paiement confirmé
        </h1>

        {type === 'plan' && planId && (
          <p className="text-slate-500 mb-6">
            Votre abonnement <strong>{planLabels[planId] || planId}</strong> est maintenant actif.
            Bienvenue !
          </p>
        )}

        {type === 'oneshot' && (
          <p className="text-slate-500 mb-6">
            {confirming
              ? 'Lancement de votre transcription...'
              : 'Votre transcription est en cours. Vous recevrez le résultat dans quelques minutes.'}
          </p>
        )}

        {!type && (
          <p className="text-slate-500 mb-6">
            Votre paiement a bien été enregistré. Merci !
          </p>
        )}

        <p className="text-sm text-slate-400 mb-6">
          {confirming ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Préparation...
            </span>
          ) : (
            `Redirection automatique dans ${countdown}s...`
          )}
        </p>

        <div className="flex flex-col gap-3">
          {type === 'plan' && (
            <Link
              to="/app/plans"
              className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              Voir mon abonnement <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          {type === 'oneshot' && jobId && (
            <Link
              to={`/processing/${jobId}`}
              className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              Voir ma transcription <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default PaymentSuccess;
