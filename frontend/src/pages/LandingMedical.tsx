import React from 'react';
import { Stethoscope, ShieldAlert, Clock, FileText, AlertTriangle, ClipboardList } from 'lucide-react';
import VerticalLanding from '../components/Landing/VerticalLanding';

export default function LandingMedical() {
  return (
    <VerticalLanding
      path="/transcription-medicale"
      metaTitle="Transcription Médicale Locale — Note SOAP, RGPD & Confidentialité"
      metaDescription="Transcription médicale 100% locale. Note SOAP structurée, prescriptions, plan de suivi. Vos données patient ne quittent jamais votre réseau."
      heroIcon={Stethoscope}
      heroIconGradient="from-rose-500 to-pink-600"
      headline="Transcription Médicale 100% Locale"
      subheadline="Générez des notes SOAP structurées, des prescriptions et des plans de suivi automatiquement. Vos données patient ne quittent jamais votre réseau."
      badge="100% Local • RGPD Natif • Aucune donnée externe"
      painPoints={[
        {
          icon: Clock,
          title: 'Rédaction chronophage',
          description: 'Les comptes rendus médicaux prennent des heures. ClearRecap génère automatiquement des notes SOAP structurées à partir de vos consultations audio.',
        },
        {
          icon: ShieldAlert,
          title: 'Confidentialité des données de santé',
          description: 'Envoyer des données patient dans le cloud pose des risques RGPD majeurs. ClearRecap traite tout en local — aucun transfert international.',
        },
        {
          icon: AlertTriangle,
          title: 'Risque d\'erreurs de transcription',
          description: 'Les solutions génériques ne comprennent pas le vocabulaire médical. Le profil Médical de ClearRecap est optimisé pour la terminologie clinique.',
        },
      ]}
      featuresTitle="Analyses IA spécialisées Médical"
      featuresGradient="from-rose-500 to-pink-600"
      features={[
        { name: 'Note SOAP structurée', description: 'Subjectif, Objectif, Assessment, Plan — générée automatiquement' },
        { name: 'Résumé clinique', description: 'Synthèse concise de la consultation pour le dossier patient' },
        { name: 'Prescriptions extraites', description: 'Médicaments, posologies et durées identifiés dans le discours' },
        { name: 'Red flags / Points de vigilance', description: 'Signaux d\'alerte cliniques détectés automatiquement' },
        { name: 'Plan de suivi', description: 'Prochains rendez-vous, examens à prévoir, actions patient' },
        { name: 'Anonymisation PII', description: 'Rédaction automatique des informations personnellement identifiables' },
        { name: 'Points clés cliniques', description: 'Les éléments essentiels de la consultation en un coup d\'œil' },
        { name: 'Diarisation des locuteurs', description: 'Distinction médecin / patient pour une lecture claire' },
        { name: 'Export multi-format', description: 'PDF, Markdown, JSON — intégration facile dans votre SI de santé' },
      ]}
      faqItems={[
        {
          question: 'ClearRecap est-il conforme au RGPD pour les données de santé ?',
          answer: 'Oui. ClearRecap fonctionne à 100% en local sur votre infrastructure. Aucune donnée audio ou transcription ne quitte votre réseau. Cela élimine les problématiques de transfert international (articles 44-49 du RGPD) et simplifie drastiquement la conformité HDS.',
        },
        {
          question: 'La note SOAP est-elle fiable pour un usage clinique ?',
          answer: 'La note SOAP est générée par IA comme aide à la rédaction. Elle doit être relue et validée par le praticien avant intégration au dossier patient. ClearRecap accélère la rédaction, mais ne remplace pas le jugement médical.',
        },
        {
          question: 'Peut-on utiliser ClearRecap dans un hôpital ou un cabinet ?',
          answer: 'Oui. L\'offre on-premise permet une installation sur vos serveurs internes, derrière votre pare-feu. Aucune connexion internet n\'est nécessaire pour le traitement. L\'IA (Whisper + Ollama) tourne intégralement en local.',
        },
        {
          question: 'Quel matériel faut-il pour l\'installation on-premise ?',
          answer: 'Un serveur avec GPU NVIDIA (8 Go VRAM minimum, 16+ Go recommandé), Docker et 32 Go de RAM. L\'installation se fait via Docker Compose en quelques heures.',
        },
        {
          question: 'ClearRecap gère-t-il le vocabulaire médical spécialisé ?',
          answer: 'Whisper large-v3 a une excellente couverture du vocabulaire médical français. Vous pouvez également ajouter des dictionnaires personnalisés pour les termes spécifiques à votre spécialité.',
        },
      ]}
    />
  );
}
