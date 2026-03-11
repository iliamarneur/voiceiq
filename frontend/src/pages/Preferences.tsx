import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Loader2, BookOpen, Mic, ListOrdered, FileText, Palette, Shield, Download, Trash2, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { UserPreferences, AudioPreset, UserDictionary, Profile } from '../types';

function PreferencesPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [presets, setPresets] = useState<AudioPreset[]>([]);
  const [dictionaries, setDictionaries] = useState<UserDictionary[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/preferences').catch(() => ({ data: null })),
      axios.get('/api/presets').catch(() => ({ data: [] })),
      axios.get('/api/dictionaries').catch(() => ({ data: [] })),
      axios.get('/api/profiles').catch(() => ({ data: [] })),
    ]).then(([pRes, presRes, dictRes, profRes]) => {
      setPrefs(pRes.data || { id: 'default', summary_detail: 'balanced', summary_tone: 'neutral', default_profile: 'generic', default_priority: 'P1', default_preset_id: null });
      setPresets(presRes.data);
      setDictionaries(dictRes.data);
      setProfiles(profRes.data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await axios.put('/api/preferences', prefs);
      setPrefs(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      setSaveError('Impossible d\'enregistrer vos préférences. Veuillez réessayer.');
      setTimeout(() => setSaveError(''), 4000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Vos préférences</h1>
          <p className="text-sm text-slate-500">Personnalisez votre expérience ClearRecap</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Style */}
        <Section icon={FileText} title="Style de résumé" description="Choisissez le niveau de détail et le ton de vos résumés">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Niveau de détail</label>
              <div className="flex gap-2">
                {(['short', 'balanced', 'detailed'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setPrefs({ ...prefs, summary_detail: level })}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      prefs.summary_detail === level
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {level === 'short' ? 'Court' : level === 'balanced' ? 'Équilibré' : 'Détaillé'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Ton</label>
              <div className="flex gap-2">
                {(['formal', 'neutral', 'friendly'] as const).map(tone => (
                  <button
                    key={tone}
                    onClick={() => setPrefs({ ...prefs, summary_tone: tone })}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      prefs.summary_tone === tone
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {tone === 'formal' ? 'Formel' : tone === 'neutral' ? 'Neutre' : 'Amical'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Default Profile */}
        <Section icon={Palette} title="Profil par défaut" description="Le profil utilisé automatiquement à l'upload">
          <select
            value={prefs.default_profile}
            onChange={e => setPrefs({ ...prefs, default_profile: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name} - {p.description}</option>
            ))}
          </select>
        </Section>

        {/* Default Priority */}
        <Section icon={ListOrdered} title="Priorité par défaut" description="La priorité appliquée aux nouveaux uploads">
          <div className="flex gap-3">
            {[
              { value: 'P0', label: 'P0 Urgent', color: 'from-red-500 to-rose-500' },
              { value: 'P1', label: 'P1 Normal', color: 'from-blue-500 to-indigo-500' },
              { value: 'P2', label: 'P2 Basse', color: 'from-slate-400 to-slate-500' },
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setPrefs({ ...prefs, default_priority: p.value })}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  prefs.default_priority === p.value
                    ? `bg-gradient-to-r ${p.color} text-white shadow-lg`
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Default Preset */}
        <Section icon={Mic} title="Configuration par défaut" description="La configuration audio appliquée automatiquement">
          <select
            value={prefs.default_preset_id || ''}
            onChange={e => setPrefs({ ...prefs, default_preset_id: e.target.value || null })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Aucune configuration par défaut</option>
            {presets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Section>

        {/* Recap */}
        <Section icon={BookOpen} title="Vos ressources" description="Récap de vos dictionnaires et configurations">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-indigo-600">{dictionaries.length}</p>
              <p className="text-sm text-slate-500">Dictionnaires</p>
              <p className="text-xs text-slate-400 mt-1">
                {dictionaries.reduce((acc, d) => acc + (d.entries?.length || 0), 0)} termes au total
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-purple-600">{presets.length}</p>
              <p className="text-sm text-slate-500">Configurations audio</p>
            </div>
          </div>
        </Section>

        {/* Save */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl'
            } disabled:opacity-50`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Save className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </div>

        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2">
            {saveError}
          </p>
        )}

        {/* RGPD / Data Privacy */}
        <RgpdSection />
      </div>
    </motion.div>
  );
}

function RgpdSection() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await axios.get('/api/account/export');
      const blob = new Blob([JSON.stringify(resp.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clearrecap-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
    setExporting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const resp = await axios.delete('/api/account');
      setDeleteResult(`Compte supprimé. ${resp.data.message || ''}`);
      setConfirmDelete(false);
    } catch {
      setDeleteResult('Erreur lors de la suppression.');
    }
    setDeleting(false);
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-indigo-500" />
        <div>
          <h3 className="font-semibold">Vos données personnelles</h3>
          <p className="text-xs text-slate-500">RGPD — Export et suppression de vos données</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Export */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
          <div>
            <p className="font-medium text-sm">Exporter mes données</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Téléchargez toutes vos données au format JSON (Art. 20 RGPD)
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exporter
          </button>
        </div>

        {/* Delete */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50">
          <div>
            <p className="font-medium text-sm text-red-700 dark:text-red-400">Supprimer mon compte</p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
              Supprime toutes vos données de façon irréversible (Art. 17 RGPD)
            </p>
          </div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Confirmer la suppression
              </button>
            </div>
          )}
        </div>

        {deleteResult && (
          <p className={`text-sm px-4 py-2 rounded-xl ${
            deleteResult.includes('Erreur')
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600'
              : 'bg-green-50 dark:bg-green-900/20 text-green-600'
          }`}>
            {deleteResult}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, description, children }: {
  icon: any; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-indigo-500" />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default PreferencesPage;
