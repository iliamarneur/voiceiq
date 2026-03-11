import React from 'react';
import ComparisonPage from '../../components/Landing/ComparisonPage';

export default function VsOtterAI() {
  return (
    <ComparisonPage
      path="/comparatif/clearrecap-vs-otter-ai"
      metaTitle="ClearRecap vs Otter.ai : Comparatif Complet 2026"
      metaDescription="Comparaison détaillée entre ClearRecap (100% local) et Otter.ai (cloud US). Prix, confidentialité, analyses IA, langues supportées."
      headline="ClearRecap vs Otter.ai"
      intro="Otter.ai est la référence américaine pour les notes de réunion IA. ClearRecap propose une alternative 100% locale, francophone, avec des analyses métier spécialisées."
      competitorName="Otter.ai"
      rows={[
        { label: 'Hébergement', clearrecap: '100% local', competitor: 'Cloud US' },
        { label: 'Données envoyées au cloud', clearrecap: 'Jamais', competitor: 'Oui (serveurs US)' },
        { label: 'Soumis au CLOUD Act', clearrecap: 'Non', competitor: 'Oui' },
        { label: 'Conformité RGPD', clearrecap: 'Par design', competitor: 'Complexe (transfert UE→US)' },
        { label: 'Langue principale', clearrecap: 'Français (12 langues)', competitor: 'Anglais principalement' },
        { label: 'Qualité français', clearrecap: 'Whisper large-v3 optimisé', competitor: 'Limitée' },
        { label: 'Prix d\'entrée', clearrecap: '3€ (one-shot)', competitor: '16,99$/mois' },
        { label: 'Engagement minimum', clearrecap: 'Aucun', competitor: 'Abonnement mensuel' },
        { label: 'Profils métier', clearrecap: '5 profils spécialisés', competitor: 'Réunions uniquement' },
        { label: 'Analyses IA spécialisées', clearrecap: '9 analyses par profil', competitor: 'Notes de réunion IA' },
        { label: 'Note SOAP (médical)', clearrecap: true, competitor: false },
        { label: 'Synthèse juridique', clearrecap: true, competitor: false },
        { label: 'Quiz & fiches révision', clearrecap: true, competitor: false },
        { label: 'Installation on-premise', clearrecap: true, competitor: false },
        { label: 'Fonctionne hors ligne', clearrecap: true, competitor: false },
        { label: 'Transcription en direct', clearrecap: 'Dictée en temps réel', competitor: 'Réunions en direct' },
      ]}
      whyClearRecap={[
        'Francophone natif : ClearRecap utilise Whisper large-v3 optimisé pour le français. Otter.ai est conçu pour l\'anglais et offre une qualité limitée en français.',
        'CLOUD Act éliminé : Otter.ai stocke vos données sur des serveurs américains soumis au CLOUD Act. ClearRecap traite tout en local — aucun transfert hors de votre réseau.',
        '5 profils métier vs réunions uniquement : Otter.ai est centré sur les notes de réunion. ClearRecap couvre médical, juridique, business, éducation et générique.',
        'Dès 3€ sans abonnement vs 16,99$/mois : ClearRecap offre un mode one-shot sans engagement. Otter.ai impose un abonnement mensuel minimum.',
        'On-premise pour les secteurs sensibles : santé, défense, juridique — ClearRecap s\'installe sur vos serveurs, Otter.ai est exclusivement cloud.',
      ]}
      conclusion="Otter.ai excelle pour les réunions en direct en anglais dans un environnement cloud. ClearRecap est le choix pour les organisations francophones qui exigent la confidentialité de leurs données, des analyses métier spécialisées et un déploiement 100% local."
    />
  );
}
