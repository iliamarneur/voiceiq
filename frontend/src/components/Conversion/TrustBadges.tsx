import React from 'react';
import { Server, Shield, Lock, Zap } from 'lucide-react';

interface TrustBadgesProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
}

const BADGES = [
  { icon: Server, label: '100% Local', sublabel: 'Sur votre infrastructure' },
  { icon: Shield, label: 'RGPD Natif', sublabel: 'Conforme par design' },
  { icon: Lock, label: 'Aucune Donnée Externe', sublabel: 'Zéro transfert' },
  { icon: Zap, label: 'GPU Accéléré', sublabel: 'Traitement rapide' },
];

export default function TrustBadges({ className = '', variant = 'light', size = 'md' }: TrustBadgesProps) {
  const isSmall = size === 'sm';
  const isDark = variant === 'dark';

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {BADGES.map(badge => (
        <div
          key={badge.label}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-colors ${
            isDark
              ? 'border-white/10 bg-white/5 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
          } ${isSmall ? 'px-3 py-2' : ''}`}
        >
          <badge.icon className={`shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'} ${isSmall ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <div>
            <p className={`font-semibold leading-tight ${isSmall ? 'text-xs' : 'text-sm'}`}>{badge.label}</p>
            {!isSmall && (
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{badge.sublabel}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
