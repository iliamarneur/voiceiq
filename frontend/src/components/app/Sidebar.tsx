import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Plus, Zap, FileText, BookMarked,
  Settings2, CreditCard, SlidersHorizontal, Info, Mic2, Clock,
  Sun, Moon, BarChart3, Cpu, LogOut, User,
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
  adminOnly?: boolean;
}

const SECTIONS: SidebarSection[] = [
  {
    items: [
      { to: '/app', icon: LayoutDashboard, label: 'Tableau de bord' },
      { to: '/app/new', icon: Plus, label: 'Enregistrer' },
      { to: '/app/upload', icon: Upload, label: 'Importer un fichier' },
      { to: '/app/oneshot', icon: Zap, label: 'À la demande' },
    ],
  },
  {
    title: 'Outils',
    items: [
      { to: '/app/templates', icon: FileText, label: 'Modèles', gate: 'templates' },
      { to: '/app/dictionaries', icon: BookMarked, label: 'Dictionnaires' },
      { to: '/app/presets', icon: Settings2, label: 'Configurations', gate: 'presets' },
    ],
  },
  {
    title: 'Compte',
    items: [
      { to: '/app/plans', icon: CreditCard, label: 'Offres & Utilisation' },
      { to: '/app/preferences', icon: SlidersHorizontal, label: 'Préférences' },
      { to: '/app/about', icon: Info, label: 'Découvrir ClearRecap' },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    items: [
      { to: '/app/admin', icon: BarChart3, label: 'Monitoring' },
      { to: '/app/models', icon: Cpu, label: 'Intelligence artificielle' },
    ],
  },
];

interface MinutesInfo {
  minutes_remaining: number;
  minutes_included: number;
  extra_minutes_balance: number;
  plan_name: string;
}

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  toggleDark: () => void;
  minutesInfo: MinutesInfo | null;
  planFeatures: string[];
  userInfo?: UserInfo | null;
  isAdmin?: boolean;
  onLogout?: () => void;
}

function GateBadge({ gate, planFeatures }: { gate: string; planFeatures: string[] }) {
  if (planFeatures.includes(gate)) return null;
  return (
    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
      Pro
    </span>
  );
}

export default function Sidebar({ open, onClose, dark, toggleDark, minutesInfo, planFeatures, userInfo, isAdmin, onLogout }: SidebarProps) {
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
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">ClearRecap</h1>
          <p className="text-xs text-slate-400">v7 - Offres & Minutes</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {SECTIONS.map((section, si) => {
          // Hide admin section for non-admin users
          if (section.adminOnly && !isAdmin) return null;
          return (
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
          );
        })}
      </nav>

      {/* Footer: user info + minutes gauge + dark mode + logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        {minutesInfo && minutesInfo.plan_name ? (
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
              <p className="text-[10px] text-slate-400 mt-0.5">+{minutesInfo.extra_minutes_balance} min supplémentaires</p>
            )}
          </NavLink>
        ) : (
          <NavLink to="/app/plans" onClick={onClose} className="block px-2 mb-2">
            <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Aucun abonnement</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">Choisir un plan →</p>
            </div>
          </NavLink>
        )}

        {/* User info */}
        {userInfo && (
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                {userInfo.name || userInfo.email.split('@')[0]}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{userInfo.email}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {dark ? 'Clair' : 'Sombre'}
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
