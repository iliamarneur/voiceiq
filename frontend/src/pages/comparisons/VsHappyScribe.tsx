import React from 'react';
import ComparisonPage from '../../components/Landing/ComparisonPage';

export default function VsHappyScribe() {
  return (
    <ComparisonPage
      path="/comparatif/clearrecap-vs-happyscribe"
      metaTitle="ClearRecap vs HappyScribe : Comparatif Complet 2026"
      metaDescription="Comparaison détaillée entre ClearRecap (local) et HappyScribe (cloud). Prix, fonctionnalités, confidentialité, analyses IA."
      headline="ClearRecap vs HappyScribe"
      intro="Deux approches fondamentalement différentes de la transcription audio. HappyScribe mise sur le cloud et la transcription humaine, ClearRecap sur le 100% local et l'analyse IA métier."
      competitorName="HappyScribe"
      rows={[
        { label: 'Hébergement', clearrecap: '100% local (votre serveur)', competitor: 'Cloud (serveurs tiers)' },
        { label: 'Données envoyées au cloud', clearrecap: 'Jamais', competitor: 'Oui, systématiquement' },
        { label: 'Conformité RGPD', clearrecap: 'Par design (aucun transfert)', competitor: 'Via DPA et clauses contractuelles' },
        { label: 'Prix d\'entrée', clearrecap: '3€ (one-shot)', competitor: '9$/mois minimum' },
        { label: 'Engagement minimum', clearrecap: 'Aucun (one-shot)', competitor: 'Abonnement mensuel' },
        { label: 'Langues', clearrecap: '12 langues', competitor: '120+ langues' },
        { label: 'Transcription humaine', clearrecap: false, competitor: true },
        { label: 'Profils métier (Médical, Juridique...)', clearrecap: '5 profils spécialisés', competitor: 'Non' },
        { label: 'Analyses IA (résumé, actions, SOAP...)', clearrecap: '9 analyses par profil', competitor: 'Résumé basique' },
        { label: 'Chat avec la transcription', clearrecap: true, competitor: false },
        { label: 'Diarisation des locuteurs', clearrecap: true, competitor: true },
        { label: 'Export PowerPoint', clearrecap: true, competitor: false },
        { label: 'Installation on-premise', clearrecap: true, competitor: false },
        { label: 'Fonctionne sans internet', clearrecap: true, competitor: false },
        { label: 'CLOUD Act', clearrecap: 'Non concerné (local)', competitor: 'Potentiellement soumis' },
      ]}
      whyClearRecap={[
        '100% local : vos données ne quittent jamais votre réseau. Aucun transfert vers des serveurs tiers, aucun risque CLOUD Act.',
        '5 profils métier spécialisés : Médical (Note SOAP), Juridique (obligations, échéances), Business (CR, actions, KPIs), Éducation (quiz, fiches), Générique.',
        '9 analyses IA par transcription : bien au-delà de la simple transcription, ClearRecap génère résumé, actions, quiz, fiches, diapositives et plus.',
        'Dès 3€ sans abonnement : le mode one-shot permet de transcrire un fichier sans engagement. HappyScribe impose un abonnement mensuel.',
        'Installation on-premise : déployez sur vos propres serveurs pour une maîtrise totale de vos données. Idéal pour les secteurs santé et juridique.',
      ]}
      conclusion="HappyScribe est une excellente solution cloud avec une large couverture linguistique et une option de transcription humaine. ClearRecap s'adresse aux organisations qui ne peuvent pas ou ne veulent pas envoyer leurs données audio dans le cloud, et qui ont besoin d'analyses IA spécialisées par métier."
    />
  );
}
