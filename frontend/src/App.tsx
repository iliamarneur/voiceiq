import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
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
import PlansUsagePage from './pages/PlansUsage';
import OneshotPage from './pages/Oneshot';
import ModelsPage from './pages/Models';
import AdminDashboard from './pages/admin/AdminDashboard';
import QuotaAlertBanner from './components/QuotaAlert';
import Sidebar from './components/app/Sidebar';
import { usePlanFeatures } from './hooks/usePlanFeatures';
// Simple mode (public, no auth)
import SimpleLayout from './layouts/SimpleLayout';
import OneShotSimple from './pages/simple/OneShotSimple';
import TranscriptionWaiting from './pages/simple/TranscriptionWaiting';
import TranscriptionResult from './pages/simple/TranscriptionResult';
import PlansPublic from './pages/simple/PlansPublic';

function AppShell() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [minutesInfo, setMinutesInfo] = useState<{minutes_remaining: number; minutes_included: number; extra_minutes_balance: number; plan_name: string} | null>(null);
  const { features } = usePlanFeatures();

  useEffect(() => {
    axios.get('/api/subscription').then(res => {
      setMinutesInfo({
        minutes_remaining: res.data.minutes_remaining,
        minutes_included: res.data.minutes_included,
        extra_minutes_balance: res.data.extra_minutes_balance,
        plan_name: res.data.plan_name,
      });
    }).catch(() => {});
  }, []);

  const toggleDark = () => {
    setDark(!dark);
    localStorage.setItem('theme', !dark ? 'dark' : 'light');
  };

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          dark={dark}
          toggleDark={toggleDark}
          minutesInfo={minutesInfo}
          planFeatures={features}
        />

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
            <h1 className="font-bold text-indigo-600">VoiceIQ v7</h1>
          </div>

          <AnimatePresence mode="wait">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="new" element={<NewEntryPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="record" element={<RecordPage />} />
              <Route path="dictate" element={<DictatePage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="dictionaries" element={<DictionariesPage />} />
              <Route path="presets" element={<PresetsPage />} />
              <Route path="plans" element={<PlansUsagePage />} />
              <Route path="oneshot" element={<OneshotPage />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="preferences" element={<PreferencesPage />} />
              <Route path="about" element={<About />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="transcription/:id" element={<TranscriptionView />} />
            </Routes>
          </AnimatePresence>
          <QuotaAlertBanner />
        </main>
      </div>
    </div>
  );
}

function LegacyTranscriptionRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/transcription/${id}`} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* ========== Simple mode (public, no sidebar) ========== */}
        <Route element={<SimpleLayout />}>
          <Route index element={<OneShotSimple />} />
          <Route path="processing/:jobId" element={<TranscriptionWaiting />} />
          <Route path="result/:id" element={<TranscriptionResult />} />
          <Route path="plans" element={<PlansPublic />} />
        </Route>

        {/* ========== App mode (sidebar, authenticated) ========== */}
        <Route path="/app/*" element={<AppShell />} />

        {/* ========== Legacy redirects (old URLs → /app/*) ========== */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/upload" element={<Navigate to="/app/upload" replace />} />
        <Route path="/new" element={<Navigate to="/app/new" replace />} />
        <Route path="/record" element={<Navigate to="/app/record" replace />} />
        <Route path="/dictate" element={<Navigate to="/app/dictate" replace />} />
        <Route path="/templates" element={<Navigate to="/app/templates" replace />} />
        <Route path="/dictionaries" element={<Navigate to="/app/dictionaries" replace />} />
        <Route path="/presets" element={<Navigate to="/app/presets" replace />} />
        <Route path="/oneshot" element={<Navigate to="/app/oneshot" replace />} />
        <Route path="/models" element={<Navigate to="/app/models" replace />} />
        <Route path="/preferences" element={<Navigate to="/app/preferences" replace />} />
        <Route path="/about" element={<Navigate to="/app/about" replace />} />
        <Route path="/transcription/:id" element={<LegacyTranscriptionRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
