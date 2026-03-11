import React from 'react';
import { Briefcase, Clock, BarChart3, ListChecks, Users, TrendingUp } from 'lucide-react';
import VerticalLanding from '../components/Landing/VerticalLanding';

export default function LandingBusiness() {
  return (
    <VerticalLanding
      path="/transcription-reunion"
      metaTitle="Transcription de Réunions — CR Automatique & Actions IA"
      metaDescription="Transformez vos réunions en comptes rendus structurés. Actions, KPIs, risques détectés par IA. 100% local."
      heroIcon={Briefcase}
      heroIconGradient="from-blue-500 to-indigo-600"
      headline="Transformez vos réunions en actions concrètes"
      subheadline="Comptes rendus structurés, actions assignées, KPIs et risques détectés automatiquement par l'IA. Tout reste dans votre réseau."
      badge="100% Local • RGPD Natif • Aucune donnée externe"
      painPoints={[
        {
          icon: Clock,
          title: '30 min de CR pour 1h de réunion',
          description: 'La rédaction manuelle des comptes rendus de réunion consomme un temps considérable. ClearRecap génère un CR structuré en quelques minutes.',
        },
        {
          icon: ListChecks,
          title: 'Actions perdues entre deux réunions',
          description: 'Les décisions et actions se perdent dans les notes. L\'IA extrait automatiquement chaque action avec sa priorité et son responsable.',
        },
        {
          icon: TrendingUp,
          title: 'Pas de vision consolidée',
          description: 'Les KPIs mentionnés, les risques évoqués et les décisions prises restent éparpillés. ClearRecap les structure dans un format exploitable.',
        },
      ]}
      featuresTitle="Analyses IA spécialisées Business"
      featuresGradient="from-blue-500 to-indigo-600"
      features={[
        { name: 'Compte rendu structuré', description: 'CR professionnel avec contexte, participants, décisions et prochaines étapes' },
        { name: 'Actions assignées', description: 'Chaque action extraite avec responsable, priorité et échéance' },
        { name: 'KPIs et métriques', description: 'Chiffres clés et indicateurs mentionnés identifiés et mis en avant' },
        { name: 'Risques détectés', description: 'Points de vigilance et risques business signalés par l\'IA' },
        { name: 'Email de suivi', description: 'Brouillon d\'email récapitulatif prêt à envoyer aux participants' },
        { name: 'Diapositives executive', description: 'Slides de synthèse générées pour le reporting management' },
        { name: 'Diarisation des locuteurs', description: 'Qui a dit quoi — attribution claire des interventions' },
        { name: 'Chapitrage automatique', description: 'Découpage thématique de la réunion pour une navigation rapide' },
        { name: 'Export multi-format', description: 'PDF, PowerPoint, Markdown, JSON — intégration dans vos outils' },
      ]}
      faqItems={[
        {
          question: 'Peut-on transcrire des réunions de plusieurs heures ?',
          answer: 'Oui. ClearRecap traite des fichiers audio et vidéo jusqu\'à 3 heures. Les réunions plus longues peuvent être découpées en segments.',
        },
        {
          question: 'Comment l\'IA attribue-t-elle les actions aux participants ?',
          answer: 'La diarisation identifie les différents locuteurs, et le profil Business extrait les actions avec leur contexte. Le responsable est identifié quand il est nommé dans la conversation.',
        },
        {
          question: 'Les données de nos réunions confidentielles sont-elles en sécurité ?',
          answer: 'Oui. ClearRecap fonctionne à 100% en local. Aucun fichier audio, aucune transcription, aucune analyse ne quitte votre réseau. Idéal pour les comités de direction, les réunions stratégiques et les discussions confidentielles.',
        },
        {
          question: 'Peut-on intégrer ClearRecap avec nos outils existants ?',
          answer: 'ClearRecap offre une API REST complète et des exports en JSON, Markdown, PDF et PowerPoint. L\'intégration avec Nextcloud, Rocket.Chat et d\'autres outils est prévue dans la roadmap.',
        },
      ]}
    />
  );
}
