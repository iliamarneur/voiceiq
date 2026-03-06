import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit3, Save, X, FileText } from 'lucide-react';
import axios from 'axios';
import { Template } from '../types';

const ANALYSIS_TYPES = [
  'summary', 'keypoints', 'actions', 'flashcards',
  'quiz', 'mindmap', 'slides', 'infographic', 'tables'
];

function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', type: 'summary', instructions: '' });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/templates');
      setTemplates(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await axios.put(`/api/templates/${editing.id}`, form);
      } else {
        await axios.post('/api/templates', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', type: 'summary', instructions: '' });
      fetchTemplates();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, type: t.type, instructions: t.instructions });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await axios.delete(`/api/templates/${id}`);
    fetchTemplates();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Instruction Templates</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Save and reuse custom analysis prompts</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', type: 'summary', instructions: '' }); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editing ? 'Edit Template' : 'New Template'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Detailed Meeting Notes"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Analysis Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {ANALYSIS_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custom Instructions</label>
              <textarea
                value={form.instructions}
                onChange={e => setForm({ ...form, instructions: e.target.value })}
                rows={4}
                placeholder="e.g., Focus on action items and deadlines. Use bullet points. Include responsible persons."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!form.name || !form.instructions}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              <Save className="w-4 h-4" /> {editing ? 'Update' : 'Save'} Template
            </button>
          </div>
        </motion.div>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No templates yet</h3>
          <p className="text-slate-500 mb-4">Create reusable instruction templates for your analyses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{t.name}</h3>
                <p className="text-sm text-slate-500 truncate mt-0.5">{t.instructions}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                {t.type}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(t)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default TemplatesPage;
