import React from 'react';
import { GraduationCap, Clock, BookOpen, Brain, PenTool, FileQuestion } from 'lucide-react';
import VerticalLanding from '../components/Landing/VerticalLanding';

export default function LandingEducation() {
  return (
    <VerticalLanding
      path="/transcription-education"
      metaTitle="Transcription Pédagogique — Cours, Quiz & Fiches de Révision IA"
      metaDescription="Transcrivez vos cours et conférences. Quiz QCM, fiches de révision, carte mentale générés automatiquement."
      heroIcon={GraduationCap}
      heroIconGradient="from-emerald-500 to-teal-600"
      headline="Transformez vos cours en supports de révision"
      subheadline="Quiz QCM, fiches de révision, carte des concepts et exercices générés automatiquement à partir de vos cours et conférences."
      badge="100% Local • RGPD Natif • Idéal établissements"
      painPoints={[
        {
          icon: Clock,
          title: 'Prise de notes vs écoute active',
          description: 'Les étudiants choisissent entre écouter et noter. ClearRecap transcrit le cours et génère automatiquement des supports de révision.',
        },
        {
          icon: FileQuestion,
          title: 'Créer des QCM prend du temps',
          description: 'Les enseignants passent des heures à créer des quiz. L\'IA génère des QCM pertinents directement à partir du contenu du cours.',
        },
        {
          icon: Brain,
          title: 'Synthèse difficile des cours longs',
          description: 'Un cours de 3 heures est difficile à résumer. ClearRecap génère fiches de révision, carte mentale et points clés automatiquement.',
        },
      ]}
      featuresTitle="Analyses IA spécialisées Éducation"
      featuresGradient="from-emerald-500 to-teal-600"
      features={[
        { name: 'Fiches de révision', description: 'Points essentiels du cours structurés en fiches synthétiques' },
        { name: 'Quiz QCM automatique', description: 'Questions à choix multiples générées à partir du contenu' },
        { name: 'Carte des concepts', description: 'Visualisation des liens entre les notions abordées' },
        { name: 'Exercices pratiques', description: 'Questions ouvertes et exercices d\'application générés par l\'IA' },
        { name: 'Résumé structuré', description: 'Synthèse du cours avec les points clés par section' },
        { name: 'Chapitrage thématique', description: 'Découpage automatique par thème pour naviguer dans le cours' },
        { name: 'Glossaire des termes', description: 'Définitions des termes techniques et concepts clés' },
        { name: 'Support de cours', description: 'Document formaté prêt à distribuer aux étudiants' },
        { name: 'Export multi-format', description: 'PDF, Markdown, PowerPoint — adaptés aux usages pédagogiques' },
      ]}
      faqItems={[
        {
          question: 'ClearRecap convient-il pour des cours de 3 heures ?',
          answer: 'Oui. ClearRecap traite des fichiers audio et vidéo jusqu\'à 3 heures. Le chapitrage automatique découpe le cours en sections thématiques pour faciliter la navigation.',
        },
        {
          question: 'Les quiz générés sont-ils de bonne qualité ?',
          answer: 'Les quiz QCM sont générés par IA comme support de révision. Ils couvrent les points clés du cours et doivent être revus par l\'enseignant avant utilisation en évaluation formelle.',
        },
        {
          question: 'Peut-on déployer ClearRecap dans un établissement scolaire ?',
          answer: 'Oui. L\'offre on-premise permet une installation sur les serveurs de l\'établissement. Le plan Équipe+ (99€/mois pour 10 000 minutes) est conçu pour les usages éducatifs intensifs.',
        },
        {
          question: 'Les données des étudiants sont-elles protégées ?',
          answer: 'ClearRecap fonctionne à 100% en local. Aucune donnée ne quitte le réseau de l\'établissement. L\'isolation multi-utilisateur garantit que chaque enseignant n\'accède qu\'à ses propres transcriptions.',
        },
        {
          question: 'ClearRecap supporte-t-il les cours en anglais ?',
          answer: 'Oui. ClearRecap supporte 12 langues dont le français et l\'anglais. La détection automatique de la langue est disponible, idéale pour les cours bilingues.',
        },
      ]}
    />
  );
}
