import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Mic2 } from 'lucide-react';

function SimpleLayout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            VoiceIQ
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/app" className="text-slate-400 hover:text-white transition-colors">
            Se connecter
          </Link>
          <Link to="/plans" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            Les plans
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-600 py-6 border-t border-slate-800/50">
        VoiceIQ — Vos données restent 100% locales.
      </footer>
    </div>
  );
}

export default SimpleLayout;
