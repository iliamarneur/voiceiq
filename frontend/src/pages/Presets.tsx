import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import axios from 'axios';
import { AudioPreset, Profile, UserDictionary } from '../types';

const AUDIO_TYPES = [
  { value: '', label: 'Auto-detect' },
  { value: 'meeting', label: 'Reunion' },
  { value: 'meeting_noisy', label: 'Reunion bruyante' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'lecture', label: 'Cours magistral' },
  { value: 'phone_call', label: 'Appel telephonique' },
  { value: 'interview', label: 'Entretien' },
  { value: 'conference', label: 'Conference' },
  { value: 'dictation', label: 'Dictee / Note vocale' },
];

const VAD_LEVELS = [
  { value: 'low', label: 'Basse (peu de coupures)' },
  { value: 'medium', label: 'Moyenne (equilibre)' },
  { value: 'high', label: 'Haute (filtre les bruits)' },
];

function PresetsPage() {
  const [presets, setPresets] = useState<AudioPreset[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dictionaries, setDictionaries] = useState<UserDictionary[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const emptyForm = {
    name: '', description: '', profile_id: 'generic', audio_type: '',
    vad_sensitivity: 'medium', min_silence_ms: 500, dictionary_id: null as string | null,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [pRes, prRes, dRes] = await Promise.all([
      axios.get('/api/presets'),
      axios.get('/api/profiles'),
      axios.get('/api/dictionaries').catch(() => ({ data: [] })),
    ]);
    setPresets(pRes.data);
    setProfiles(prRes.data);
    setDictionaries(dRes.data);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (preset: AudioPreset) => {
    setForm({
      name: preset.name, description: preset.description || '',
      profile_id: preset.profile_id, audio_type: preset.audio_type || '',
      vad_sensitivity: preset.vad_sensitivity, min_silence_ms: preset.min_silence_ms,
      dictionary_id: preset.dictionary_id,
    });
    setEditing(preset.id);
    setCreating(false);
  };

  const savePreset = async () => {
    const payload = { ...form, audio_type: form.audio_type || null };
    if (editing) {
      const res = await axios.put(`/api/presets/${editing}`, payload);
      setPresets(prev => prev.map(p => p.id === editing ? res.data : p));
    } else {
      const res = await axios.post('/api/presets', payload);
      setPresets(prev => [res.data, ...prev]);
    }
    setEditing(null);
    setCreating(false);
    setForm(emptyForm);
  };

  const deletePreset = async (id: string) => {
    await axios.delete(`/api/presets/${id}`);
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  const isEditing = editing !== null || creating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Presets Audio</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Pre-configurez vos parametres audio pour chaque type d'enregistrement
          </p>
        </div>
        {!isEditing && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Nouveau preset
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isEditing && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-4">{editing ? 'Modifier le preset' : 'Nouveau preset'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Reunion Teams" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optionnel" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Profil metier</label>
              <select value={form.profile_id} onChange={e => setForm({ ...form, profile_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Type d'audio</label>
              <select value={form.audio_type} onChange={e => setForm({ ...form, audio_type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                {AUDIO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sensibilite VAD</label>
              <select value={form.vad_sensitivity} onChange={e => setForm({ ...form, vad_sensitivity: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                {VAD_LEVELS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Silence min (ms)</label>
              <input type="number" value={form.min_silence_ms} onChange={e => setForm({ ...form, min_silence_ms: parseInt(e.target.value) || 500 })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Dictionnaire associe</label>
              <select value={form.dictionary_id || ''} onChange={e => setForm({ ...form, dictionary_id: e.target.value || null })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option value="">Aucun dictionnaire</option>
                {dictionaries.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={savePreset} disabled={!form.name.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
              <Save className="w-4 h-4" /> Sauvegarder
            </button>
            <button onClick={() => { setEditing(null); setCreating(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
              <X className="w-4 h-4" /> Annuler
            </button>
          </div>
        </motion.div>
      )}

      {/* Presets list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map(preset => (
          <motion.div
            key={preset.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{preset.name}</h3>
                {preset.description && <p className="text-xs text-slate-500 mt-0.5">{preset.description}</p>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    {profiles.find(p => p.id === preset.profile_id)?.name || preset.profile_id}
                  </span>
                  {preset.audio_type && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      {preset.audio_type}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500">
                    VAD: {preset.vad_sensitivity}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500">
                    {preset.min_silence_ms}ms
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(preset)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deletePreset(preset.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {presets.length === 0 && !creating && (
        <div className="text-center py-16">
          <Settings2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Aucun preset audio</p>
          <p className="text-xs text-slate-400 mt-1">Creez un preset pour pre-configurer vos parametres d'upload</p>
        </div>
      )}
    </motion.div>
  );
}

export default PresetsPage;
