import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Menu, LogOut } from 'lucide-react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/Upload';
import TranscriptionView from './pages/TranscriptionView';
import TemplatesPage from './pages/Templates';
import DictionariesPage from './pages/Dictionaries';
import PresetsPage from './pages/Presets';
import About from './pages/About';
import AboutMarketing from './pages/AboutMarketing';
import PreferencesPage from './pages/Preferences';
import NewEntryPage from './pages/NewEntry';
import RecordPage from './pages/Record';
import DictatePage from './pages/Dictate';
import PlansUsagePage from './pages/PlansUsage';
import OneshotPage from './pages/Oneshot';
import ModelsPage from './pages/Models';
import AdminDashboard from './pages/admin/AdminDashboard';
import SEOStrategy from './pages/admin/SEOStrategy';
import QuotaAlertBanner from './components/QuotaAlert';
import Sidebar from './components/app/Sidebar';
import { usePlanFeatures } from './hooks/usePlanFeatures';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// Simple mode (public, no auth)
import SimpleLayout from './layouts/SimpleLayout';
import OneShotSimple from './pages/simple/OneShotSimple';
import TranscriptionWaiting from './pages/simple/TranscriptionWaiting';
import TranscriptionResult from './pages/simple/TranscriptionResult';
import PlansPublic from './pages/simple/PlansPublic';
// Payment pages
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
// Blog pages (public)
import BlogList from './pages/BlogList';
import BlogArticle from './pages/BlogArticle';
// SEO landing pages (public)
import LandingMedical from './pages/LandingMedical';
import LandingJuridique from './pages/LandingJuridique';
import LandingBusiness from './pages/LandingBusiness';
import LandingEducation from './pages/LandingEducation';
import FAQ from './pages/FAQ';
// Comparison pages (public)
import VsHappyScribe from './pages/comparisons/VsHappyScribe';
import VsOtterAI from './pages/comparisons/VsOtterAI';
import CloudVsLocal from './pages/comparisons/CloudVsLocal';
// TCO Calculator page
import TCOCalculatorPage from './pages/TCOCalculatorPage';
// GEO citation-ready pages
import GlossaireTranscription from './pages/GlossaireTranscription';
import GuideRGPDTranscription from './pages/GuideRGPDTranscription';
// Phase 7 — Strategic pages
import Integrations from './pages/Integrations';
import Partners from './pages/Partners';
import Compliance from './pages/Compliance';
// Geo landing pages
import GeoParis from './pages/geo/Paris';
import GeoLyon from './pages/geo/Lyon';
import GeoToulouse from './pages/geo/Toulouse';
import GeoLille from './pages/geo/Lille';
import GeoSophia from './pages/geo/SophiaAntipolis';

/** Route guard — redirects to /login if not authenticated (only when auth is enabled) */
function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading, authEnabled } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-400 text-sm">Chargement...</div>
      </div>
    );
  }
  if (authEnabled && !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppShell() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [minutesInfo, setMinutesInfo] = useState<{minutes_remaining: number; minutes_included: number; extra_minutes_balance: number; plan_name: string} | null>(null);
  const { features } = usePlanFeatures();
  const { user, logout } = useAuth();

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
          userInfo={user ? { name: user.name, email: user.email, role: user.role } : null}
          isAdmin={user?.role === 'admin'}
          onLogout={logout}
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
            <h1 className="font-bold text-indigo-600">ClearRecap</h1>
            <div className="flex-1" />
            {user && (
              <button onClick={logout} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Déconnexion">
                <LogOut className="w-4 h-4" />
              </button>
            )}
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
              <Route path="about" element={user?.role === 'admin' ? <About /> : <AboutMarketing />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="seo-strategy" element={<SEOStrategy />} />
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
    <AuthProvider>
      <Router>
        <Routes>
          {/* ========== Simple mode (public, no sidebar) ========== */}
          {/* Landing page — full-width, no SimpleLayout wrapper */}
          <Route index element={<AboutMarketing />} />

          {/* SEO vertical landing pages (full-width, no SimpleLayout) */}
          <Route path="transcription-medicale" element={<LandingMedical />} />
          <Route path="transcription-juridique" element={<LandingJuridique />} />
          <Route path="transcription-reunion" element={<LandingBusiness />} />
          <Route path="transcription-education" element={<LandingEducation />} />
          <Route path="faq" element={<FAQ />} />

          {/* Comparison pages (full-width) */}
          <Route path="comparatif/clearrecap-vs-happyscribe" element={<VsHappyScribe />} />
          <Route path="comparatif/clearrecap-vs-otter-ai" element={<VsOtterAI />} />
          <Route path="comparatif/transcription-cloud-vs-locale" element={<CloudVsLocal />} />

          {/* TCO Calculator */}
          <Route path="calculateur-tco" element={<TCOCalculatorPage />} />

          {/* GEO citation-ready pages */}
          <Route path="glossaire-transcription" element={<GlossaireTranscription />} />
          <Route path="guide-rgpd-transcription" element={<GuideRGPDTranscription />} />

          {/* Phase 7 — Strategic pages */}
          <Route path="integrations" element={<Integrations />} />
          <Route path="partenaires" element={<Partners />} />
          <Route path="conformite" element={<Compliance />} />

          {/* Geo landing pages */}
          <Route path="transcription-paris-ile-de-france" element={<GeoParis />} />
          <Route path="transcription-lyon-auvergne-rhone-alpes" element={<GeoLyon />} />
          <Route path="transcription-toulouse-aerospace" element={<GeoToulouse />} />
          <Route path="transcription-lille-euratechnologies" element={<GeoLille />} />
          <Route path="transcription-sophia-antipolis" element={<GeoSophia />} />

          <Route element={<SimpleLayout />}>
            <Route path="oneshot" element={<OneShotSimple />} />
            <Route path="processing/:jobId" element={<TranscriptionWaiting />} />
            <Route path="result/:id" element={<TranscriptionResult />} />
            <Route path="plans" element={<PlansPublic />} />
            <Route path="blog" element={<BlogList />} />
            <Route path="blog/:slug" element={<BlogArticle />} />
          </Route>

          {/* ========== Payment callback pages ========== */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          {/* ========== Auth pages ========== */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ========== App mode (sidebar, authenticated) ========== */}
          <Route path="/app/*" element={<RequireAuth><AppShell /></RequireAuth>} />

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
    </AuthProvider>
  );
}

export default App;
