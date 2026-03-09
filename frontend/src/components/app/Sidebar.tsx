import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Plus, Zap, FileText, BookMarked,
  Settings2, CreditCard, SlidersHorizontal, Info, Mic2, Clock,
  Sun, Moon, BarChart3, Cpu,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  gate?: string;       // feature key — shows badge if not in plan
}

interface SidebarSection {
  title?: string;
  items: NavItem[];
}

const SECTIONS: SidebarSection[] = [
  {
    items: [
      { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/app/new', icon: Plus, label: 'Nouveau' },
      { to: '/app/upload', icon: Upload, label: 'Upload' },
      { to: '/app/oneshot', icon: Zap, label: 'One-shot' },
    ],
  },
  {
    title: 'Outils',
    items: [
      { to: '/app/templates', icon: FileText, label: 'Templates', gate: 'templates' },
      { to: '/app/dictionaries', icon: BookMarked, label: 'Dictionnaires' },
      { to: '/app/presets', icon: Settings2, label: 'Presets', gate: 'presets' },
    ],
  },
  {
    title: 'Compte',
    items: [
      { to: '/app/plans', icon: CreditCard, label: 'Plans & Usage' },
      { to: '/app/preferences', icon: SlidersHorizontal, label: 'Préférences' },
      { to: '/app/about', icon: Info, label: 'À propos' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: '/app/admin', icon: BarChart3, label: 'Monitoring' },
      { to: '/app/models', icon: Cpu, label: 'Modèles & IA' },
    ],
  },
];

interface MinutesInfo {
  minutes_remaining: number;
  minutes_included: number;
  extra_minutes_balance: number;
  plan_name: string;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  toggleDark: () => void;
  minutesInfo: MinutesInfo | null;
  planFeatures: string[];
}

function GateBadge({ gate, planFeatures }: { gate: string; planFeatures: string[] }) {
  if (planFeatures.includes(gate)) return null;
  return (
    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
      Pro
    </span>
  );
}

export default function Sidebar({ open, onClose, dark, toggleDark, minutesInfo, planFeatures }: SidebarProps) {
  const usageRatio = minutesInfo && minutesInfo.minutes_included > 0
    ? (minutesInfo.minutes_included - minutesInfo.minutes_remaining) / minutesInfo.minutes_included
    : 0;

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
      transform transition-transform duration-300 lg:translate-x-0 lg:static lg:flex flex-col
      ${open ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">VoiceIQ</h1>
          <p className="text-xs text-slate-400">v7 - Offres & Minutes</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, gate }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/app'}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                  {gate && <GateBadge gate={gate} planFeatures={planFeatures} />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: minutes gauge + dark mode */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        {minutesInfo && (
          <NavLink to="/app/plans" onClick={onClose} className="block px-2 mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {minutesInfo.plan_name}
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {minutesInfo.minutes_remaining} min
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
              <div
                className={`h-full rounded-full transition-all ${
                  usageRatio >= 0.9 ? 'bg-red-500'
                  : usageRatio >= 0.75 ? 'bg-amber-500'
                  : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, (minutesInfo.minutes_remaining / Math.max(minutesInfo.minutes_included, 1)) * 100)}%` }}
              />
            </div>
            {minutesInfo.extra_minutes_balance > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">+{minutesInfo.extra_minutes_balance} min extra</p>
            )}
          </NavLink>
        )}
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
