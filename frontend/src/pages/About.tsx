import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Mic2, Upload, FileText, ListChecks, CheckSquare, BookOpen, HelpCircle,
  Network, Presentation, BarChart3, Table2, MessageSquare, BookMarked,
  Languages, Search, Play, Files, RefreshCw, Download, Globe, Sparkles,
  Zap, Shield, Clock, Volume2
} from 'lucide-react';

const VERSION = '3.0.0';
const LAST_UPDATED = '2026-03-06';

interface Feature {
  icon: any;
  title: string;
  description: string;
  version: string;
  category: 'core' | 'analysis' | 'v2' | 'v3' | 'export';
}

const FEATURES: Feature[] = [
  // Core
  { icon: Mic2, title: 'Transcription Whisper', description: 'Transcription audio locale via faster-whisper (large-v3 GPU / medium CPU) avec detection automatique de la langue et filtre VAD.', version: '1.0', category: 'core' },
  { icon: Upload, title: 'Upload Audio & Video', description: 'Glissez-deposez vos fichiers audio (MP3, WAV, M4A, FLAC, OGG, AAC, OPUS) ou video (MP4, MKV, AVI, MOV, WMV, WEBM). L\'audio est extrait automatiquement des videos.', version: '2.1', category: 'core' },
  { icon: Files, title: 'Upload par lot', description: 'Uploadez plusieurs fichiers simultanement avec suivi individuel du statut de chaque fichier.', version: '2.0', category: 'v2' },
  { icon: Zap, title: 'Gros fichiers (2 Go max)', description: 'Support des fichiers volumineux grace a l\'ecriture par chunks de 8 Mo. Films, podcasts longs et enregistrements de conferences acceptes.', version: '2.1', category: 'v2' },
  { icon: Search, title: 'Recherche & Filtres', description: 'Recherchez dans vos transcriptions par texte, filtrez par langue et parcourez votre historique.', version: '1.0', category: 'core' },
  { icon: Zap, title: 'Traitement non-bloquant', description: 'Whisper tourne dans un thread pool dedie : l\'API reste reactive pendant les transcriptions longues.', version: '2.0', category: 'v2' },

  // 9 Analyses
  { icon: FileText, title: 'Resume structure', description: 'Titre, introduction, points principaux et conclusion generes automatiquement par IA.', version: '1.0', category: 'analysis' },
  { icon: ListChecks, title: 'Points cles', description: 'Extraction des points cles thematiques avec regroupement par sujet.', version: '1.0', category: 'analysis' },
  { icon: CheckSquare, title: 'Actions & Decisions', description: 'Items d\'action, decisions prises et questions ouvertes extraits du contenu.', version: '1.0', category: 'analysis' },
  { icon: BookOpen, title: 'Fiches de revision', description: 'Flashcards interactives question/reponse — cliquez pour reveler la reponse.', version: '1.0', category: 'analysis' },
  { icon: HelpCircle, title: 'Quiz QCM', description: 'Quiz a choix multiples avec verification des reponses et explications detaillees.', version: '1.0', category: 'analysis' },
  { icon: Network, title: 'Carte mentale', description: 'Mindmap hierarchique generee a partir du contenu, avec arborescence visuelle coloree.', version: '1.0', category: 'analysis' },
  { icon: Presentation, title: 'Slides', description: 'Presentation en diapositives avec navigation Previous/Next et mode plein ecran.', version: '1.0', category: 'analysis' },
  { icon: BarChart3, title: 'Infographie', description: 'Visualisation en barres animees des donnees extraites du contenu.', version: '1.0', category: 'analysis' },
  { icon: Table2, title: 'Tableaux', description: 'Donnees structurees en tableaux avec en-tetes et lignes extraites automatiquement.', version: '1.0', category: 'analysis' },

  // V2 Features
  { icon: MessageSquare, title: 'Chat avec transcription', description: 'Posez des questions sur le contenu et obtenez des reponses avec citations. Historique persistant entre sessions.', version: '2.0', category: 'v2' },
  { icon: Play, title: 'Lecteur audio synchronise', description: 'Cliquez sur un segment pour ecouter le passage. Le segment actif est surligne en temps reel.', version: '2.0', category: 'v2' },
  { icon: BookMarked, title: 'Chapitrage automatique', description: 'Chapitres generes par IA avec titres, timestamps et resumes. Cliquez pour naviguer.', version: '2.0', category: 'v2' },
  { icon: Languages, title: 'Traduction automatique', description: 'Traduisez la transcription en francais, anglais, espagnol, allemand ou italien. Resultats caches.', version: '2.0', category: 'v2' },
  { icon: BookOpen, title: 'Glossaire technique', description: 'Extraction automatique des termes techniques et acronymes avec definitions contextuelles. Recherche integree.', version: '2.0', category: 'v2' },
  { icon: Sparkles, title: 'Templates d\'instructions', description: 'Sauvegardez et reutilisez vos prompts personnalises pour chaque type d\'analyse.', version: '2.0', category: 'v2' },
  { icon: RefreshCw, title: 'Regeneration d\'analyses', description: 'Regenerez individuellement ou toutes les analyses avec des instructions personnalisees.', version: '1.0', category: 'core' },

  // Export
  { icon: Download, title: 'Export multi-format', description: 'Exportez en JSON, Markdown, TXT, SRT, VTT et PPTX. PDF disponible avec WeasyPrint.', version: '1.0', category: 'export' },

  // V3 Features
  { icon: Sparkles, title: '5 Profils verticaux', description: 'Generique, Business, Education, Medical, Juridique. Chaque profil active un pipeline d\'analyse specifique avec prompts optimises.', version: '3.0', category: 'v3' },
  { icon: Sparkles, title: 'Business (9 analyses)', description: 'CR, actions assignees, KPIs, risques/blocages, email de suivi, slides executive, carte des parties prenantes, tableaux de bord.', version: '3.0', category: 'v3' },
  { icon: Sparkles, title: 'Education (9 analyses)', description: 'Resume pedagogique, fiches de revision, quiz par section, carte des concepts, glossaire, chapitrage, notions essentielles, exercices pratiques, support de cours.', version: '3.0', category: 'v3' },
  { icon: Sparkles, title: 'Medical (7 analyses)', description: 'Note SOAP structuree, resume clinique, redaction PII (RGPD/HIPAA), prescriptions/traitements, points de vigilance/red flags, plan de suivi, points cles cliniques.', version: '3.0', category: 'v3' },
  { icon: Sparkles, title: 'Juridique (7 analyses)', description: 'Synthese juridique, clauses/stipulations, obligations par partie, echeances/delais, risques juridiques, references legales, actions/decisions.', version: '3.0', category: 'v3' },
  { icon: Sparkles, title: 'Rendus visuels dedies', description: 'Chaque type d\'analyse a son propre rendu visuel : tableaux SOAP colores, cartes de risques, chronologies d\'echeances, tableaux de prescriptions, etc.', version: '3.0', category: 'v3' },
  { icon: Sparkles, title: 'Hot-reload des profils', description: 'Ajoutez de nouveaux profils en deposant un fichier JSON dans le dossier profiles/ et rechargez via API sans redemarrer.', version: '3.0', category: 'v3' },
  { icon: Sparkles, title: 'Templates par profil', description: 'Chaque profil definit ses propres templates (Fiches Anki, CR Express, Note d\'audience, Courrier confrere...) et exports disponibles.', version: '3.0', category: 'v3' },
];

const CATEGORIES = [
  { key: 'core', label: 'Fonctionnalites principales', color: 'from-indigo-500 to-blue-500' },
  { key: 'analysis', label: '9 Analyses IA', color: 'from-purple-500 to-pink-500' },
  { key: 'v2', label: 'Nouveautes v2', color: 'from-emerald-500 to-teal-500' },
  { key: 'v3', label: 'Nouveautes v3 — Profils Verticaux', color: 'from-rose-500 to-orange-500' },
  { key: 'export', label: 'Export', color: 'from-amber-500 to-orange-500' },
];

function About() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 lg:p-8 max-w-5xl mx-auto"
    >
      {/* Hero */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30"
        >
          <Mic2 className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">VoiceIQ</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-4">
          Transformez vos fichiers audio en connaissances exploitables
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">
            v{VERSION}
          </span>
          <span className="text-slate-400">
            Mis a jour le {new Date(LAST_UPDATED).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="mb-12 p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <strong>VoiceIQ</strong> est une plateforme 100% locale de transcription et d'analyse audio.
          Uploadez un fichier audio, obtenez une transcription precise via Whisper, puis
          des analyses IA adaptees a votre contexte metier grace aux profils verticaux (Education, Business, Generique).
          Chaque profil active un pipeline d'analyse specifique avec des prompts optimises.
          Le tout sans aucune donnee envoyee a l'exterieur.
        </p>
        <div className="flex items-center gap-6 mt-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> 100% local</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> GPU accelere</span>
          <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Multi-langue</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Temps reel</span>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">Stack technique</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Backend', value: 'Python 3.12 + FastAPI' },
            { label: 'Transcription', value: 'faster-whisper (local)' },
            { label: 'LLM', value: 'Ollama (mistral-nemo)' },
            { label: 'Frontend', value: 'React 18 + TypeScript' },
            { label: 'UI', value: 'Tailwind CSS + Framer Motion' },
            { label: 'Database', value: 'SQLite (aiosqlite)' },
            { label: 'Export', value: 'PPTX, SRT, VTT, JSON, MD' },
            { label: 'Deploy', value: 'Docker Compose' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features by Category */}
      {CATEGORIES.map(({ key, label, color }) => {
        const categoryFeatures = FEATURES.filter(f => f.category === key);
        return (
          <div key={key} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${color}`} />
              <h2 className="text-xl font-bold">{label}</h2>
              <span className="text-sm text-slate-400">({categoryFeatures.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryFeatures.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{feature.title}</h3>
                      {feature.version === '3.0' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                          V3
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      {/* CTA */}
      <div className="text-center mt-12 mb-8">
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
        >
          <Mic2 className="w-5 h-5" />
          Commencer une transcription
        </Link>
        <p className="text-xs text-slate-400 mt-4">
          {FEATURES.length} fonctionnalites disponibles &middot; v{VERSION}
        </p>
      </div>
    </motion.div>
  );
}

export default About;
