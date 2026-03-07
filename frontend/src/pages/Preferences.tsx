import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Loader2, BookOpen, Mic, ListOrdered, FileText, Palette } from 'lucide-react';
import axios from 'axios';
import { UserPreferences, AudioPreset, UserDictionary, Profile } from '../types';

function PreferencesPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [presets, setPresets] = useState<AudioPreset[]>([]);
  const [dictionaries, setDictionaries] = useState<UserDictionary[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    } catch (e) { console.error(e); }
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
          <h1 className="text-2xl font-bold">Vos preferences</h1>
          <p className="text-sm text-slate-500">Personnalisez votre experience VoiceIQ</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Style */}
        <Section icon={FileText} title="Style de resume" description="Choisissez le niveau de detail et le ton de vos resumes">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Niveau de detail</label>
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
                    {level === 'short' ? 'Court' : level === 'balanced' ? 'Equilibre' : 'Detaille'}
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
        <Section icon={Palette} title="Profil par defaut" description="Le profil utilise automatiquement a l'upload">
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
        <Section icon={ListOrdered} title="Priorite par defaut" description="La priorite appliquee aux nouveaux uploads">
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
        <Section icon={Mic} title="Preset par defaut" description="Le preset audio applique automatiquement">
          <select
            value={prefs.default_preset_id || ''}
            onChange={e => setPrefs({ ...prefs, default_preset_id: e.target.value || null })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Aucun preset par defaut</option>
            {presets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Section>

        {/* Recap */}
        <Section icon={BookOpen} title="Vos ressources" description="Recap de vos dictionnaires et presets">
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
              <p className="text-sm text-slate-500">Presets audio</p>
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
            {saving ? 'Enregistrement...' : saved ? 'Enregistre !' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </motion.div>
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
