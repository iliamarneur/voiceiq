import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, TrendingUp } from 'lucide-react';

type CTAVariant = 'essai' | 'pro' | 'enterprise';

interface CTABannerProps {
  variant?: CTAVariant;
  className?: string;
}

const VARIANTS: Record<CTAVariant, {
  headline: string;
  subline: string;
  cta: string;
  link: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}> = {
  essai: {
    headline: 'Transcrivez votre premier fichier',
    subline: 'Dès 3€, sans abonnement, sans inscription obligatoire.',
    cta: 'Essayer maintenant',
    link: '/oneshot',
    icon: Zap,
    gradient: 'from-indigo-600 to-violet-600',
  },
  pro: {
    headline: 'Passez au Pro — 3 000 minutes/mois',
    subline: 'Toutes les analyses IA, export PowerPoint, file prioritaire. 49€/mois.',
    cta: 'Découvrir le plan Pro',
    link: '/plans',
    icon: TrendingUp,
    gradient: 'from-violet-600 to-purple-600',
  },
  enterprise: {
    headline: '100% dans vos locaux — sur devis',
    subline: 'Installation on-premise, minutes illimitées, aucune donnée externe.',
    cta: 'Demander un devis',
    link: '/contact',
    icon: ArrowRight,
    gradient: 'from-slate-800 to-slate-900',
  },
};

export default function CTABanner({ variant = 'essai', className = '' }: CTABannerProps) {
  const v = VARIANTS[variant];
  const isMailto = v.link.startsWith('mailto:');
  const Icon = v.icon;

  const buttonContent = (
    <span className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors shadow-md">
      <Icon className="w-4 h-4" />
      {v.cta}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </span>
  );

  return (
    <div className={`rounded-2xl bg-gradient-to-r ${v.gradient} p-8 text-white text-center ${className}`}>
      <h3 className="text-xl font-bold mb-2">{v.headline}</h3>
      <p className="text-white/80 text-sm mb-6 max-w-lg mx-auto">{v.subline}</p>
      {isMailto ? (
        <a href={v.link}>{buttonContent}</a>
      ) : (
        <Link to={v.link}>{buttonContent}</Link>
      )}
    </div>
  );
}
