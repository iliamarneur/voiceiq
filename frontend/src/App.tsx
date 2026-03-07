import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Upload, Sun, Moon, Mic2, Menu, FileText, Info, BookMarked, Settings2, SlidersHorizontal, Plus, Cpu } from 'lucide-react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/Upload';
import TranscriptionView from './pages/TranscriptionView';
import TemplatesPage from './pages/Templates';
import DictionariesPage from './pages/Dictionaries';
import PresetsPage from './pages/Presets';
import About from './pages/About';
import PreferencesPage from './pages/Preferences';
import NewEntryPage from './pages/NewEntry';
import RecordPage from './pages/Record';
import DictatePage from './pages/Dictate';

function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [llmModels, setLlmModels] = useState<{name: string; size_gb: number}[]>([]);
  const [currentModel, setCurrentModel] = useState('');

  useEffect(() => {
    axios.get('/api/llm/models').then(res => {
      setLlmModels(res.data.models || []);
      setCurrentModel(res.data.current || '');
    }).catch(() => {});
  }, []);

  const changeModel = async (model: string) => {
    try {
      await axios.put('/api/llm/model', { model });
      setCurrentModel(model);
    } catch {}
  };

  const toggleDark = () => {
    setDark(!dark);
    localStorage.setItem('theme', !dark ? 'dark' : 'light');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/new', icon: Plus, label: 'Nouveau' },
    { to: '/upload', icon: Upload, label: 'Upload' },
    { to: '/templates', icon: FileText, label: 'Templates' },
    { to: '/dictionaries', icon: BookMarked, label: 'Dictionnaires' },
    { to: '/presets', icon: Settings2, label: 'Presets' },
    { to: '/preferences', icon: SlidersHorizontal, label: 'Preferences' },
    { to: '/about', icon: Info, label: 'A propos' },
  ];

  return (
    <div className={dark ? 'dark' : ''}>
      <Router>
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
          {/* Sidebar */}
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
            transform transition-transform duration-300 lg:translate-x-0 lg:static lg:flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">VoiceIQ</h1>
                <p className="text-xs text-slate-400">v6 - Multi-Entrees</p>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
              {llmModels.length > 0 && (
                <div className="px-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Modele LLM
                  </label>
                  <select
                    value={currentModel}
                    onChange={(e) => changeModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {llmModels.map(m => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.size_gb} GB)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={toggleDark}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
              >
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {dark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </aside>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {/* Mobile header */}
            <div className="lg:hidden flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-bold text-indigo-600">VoiceIQ v6</h1>
            </div>

            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/new" element={<NewEntryPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/record" element={<RecordPage />} />
                <Route path="/dictate" element={<DictatePage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/dictionaries" element={<DictionariesPage />} />
                <Route path="/presets" element={<PresetsPage />} />
                <Route path="/preferences" element={<PreferencesPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/transcription/:id" element={<TranscriptionView />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </Router>
    </div>
  );
}

export default App;
