import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookMarked, Plus, Trash2, Search, Tag } from 'lucide-react';
import axios from 'axios';
import { UserDictionary, DictionaryEntry } from '../types';

const CATEGORIES = [
  { value: 'nom_propre', label: 'Nom propre' },
  { value: 'acronyme', label: 'Acronyme' },
  { value: 'medical', label: 'Medical' },
  { value: 'juridique', label: 'Juridique' },
  { value: 'technique', label: 'Technique' },
  { value: 'general', label: 'General' },
];

function DictionariesPage() {
  const [dictionaries, setDictionaries] = useState<UserDictionary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [newDictName, setNewDictName] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDictionaries();
  }, []);

  useEffect(() => {
    if (selectedId) fetchEntries(selectedId);
    else setEntries([]);
  }, [selectedId]);

  const fetchDictionaries = async () => {
    const res = await axios.get('/api/dictionaries');
    setDictionaries(res.data);
    if (res.data.length > 0 && !selectedId) setSelectedId(res.data[0].id);
  };

  const fetchEntries = async (id: string) => {
    const res = await axios.get(`/api/dictionaries/${id}/entries`);
    setEntries(res.data);
  };

  const createDictionary = async () => {
    if (!newDictName.trim()) return;
    const res = await axios.post('/api/dictionaries', { name: newDictName });
    setDictionaries(prev => [res.data, ...prev]);
    setSelectedId(res.data.id);
    setNewDictName('');
  };

  const deleteDictionary = async (id: string) => {
    await axios.delete(`/api/dictionaries/${id}`);
    setDictionaries(prev => prev.filter(d => d.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addEntry = async () => {
    if (!selectedId || !newTerm.trim() || !newReplacement.trim()) return;
    const res = await axios.post(`/api/dictionaries/${selectedId}/entries`, {
      term: newTerm, replacement: newReplacement, category: newCategory,
    });
    setEntries(prev => [...prev, res.data]);
    setNewTerm('');
    setNewReplacement('');
  };

  const deleteEntry = async (entryId: string) => {
    if (!selectedId) return;
    await axios.delete(`/api/dictionaries/${selectedId}/entries/${entryId}`);
    setEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const filtered = entries.filter(e =>
    e.term.toLowerCase().includes(search.toLowerCase()) ||
    e.replacement.toLowerCase().includes(search.toLowerCase())
  );

  const selected = dictionaries.find(d => d.id === selectedId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-5xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dictionnaires</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Definissez vos termes personnalises pour ameliorer la transcription et les analyses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dictionaries list */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={newDictName}
              onChange={(e) => setNewDictName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createDictionary()}
              placeholder="Nouveau dictionnaire..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
            <button onClick={createDictionary} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {dictionaries.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                selectedId === d.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
              }`}
            >
              <BookMarked className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-slate-400">{d.entries?.length || 0} termes</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteDictionary(d.id); }}
                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}

          {dictionaries.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">Aucun dictionnaire</p>
          )}
        </div>

        {/* Entries */}
        <div className="lg:col-span-2">
          {selected ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold flex-1">{selected.name}</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm w-48"
                  />
                </div>
              </div>

              {/* Add entry form */}
              <div className="flex gap-2 mb-4">
                <input
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="Terme original"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
                <input
                  value={newReplacement}
                  onChange={(e) => setNewReplacement(e.target.value)}
                  placeholder="Remplacement"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <button onClick={addEntry} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                  Ajouter
                </button>
              </div>

              {/* Entries list */}
              <div className="space-y-1">
                {filtered.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-mono text-slate-500 dark:text-slate-400 min-w-0">{entry.term}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-sm font-medium flex-1 min-w-0">{entry.replacement}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500">
                      {entry.category}
                    </span>
                    <button onClick={() => deleteEntry(entry.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-8">
                    {entries.length === 0 ? 'Ajoutez des termes a ce dictionnaire' : 'Aucun resultat'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              Selectionnez ou creez un dictionnaire
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default DictionariesPage;
