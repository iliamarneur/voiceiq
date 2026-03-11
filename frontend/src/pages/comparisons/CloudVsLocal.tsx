import React from 'react';
import ComparisonPage from '../../components/Landing/ComparisonPage';

export default function CloudVsLocal() {
  return (
    <ComparisonPage
      path="/comparatif/transcription-cloud-vs-locale"
      metaTitle="Transcription Cloud vs Locale — Avantages et Risques"
      metaDescription="Analyse des avantages et risques de la transcription cloud vs locale. RGPD, CLOUD Act, confidentialité, coûts et performances comparés."
      headline="Transcription Cloud vs Locale"
      intro="Cloud ou local ? Deux modèles aux implications très différentes pour la confidentialité de vos données, la conformité réglementaire et le coût total de possession."
      competitorName="Solutions Cloud"
      rows={[
        { label: 'Localisation des données', clearrecap: 'Sur votre infrastructure', competitor: 'Serveurs tiers (souvent US)' },
        { label: 'Transfert international', clearrecap: 'Aucun', competitor: 'UE → US fréquent' },
        { label: 'RGPD articles 44-49', clearrecap: 'Non concerné (pas de transfert)', competitor: 'DPA + clauses contractuelles requises' },
        { label: 'CLOUD Act', clearrecap: 'Non concerné', competitor: 'Risque si hébergeur US' },
        { label: 'Données de santé (HDS)', clearrecap: 'Conformité simplifiée', competitor: 'Certification HDS requise' },
        { label: 'Connexion internet requise', clearrecap: 'Non', competitor: 'Oui, obligatoire' },
        { label: 'Latence de traitement', clearrecap: 'GPU local = rapide', competitor: 'Variable (réseau + charge)' },
        { label: 'Coût sur 3 ans (PME)', clearrecap: 'Licence ou abo dès 19€/mois', competitor: '10-50€/mois/utilisateur' },
        { label: 'Contrôle des mises à jour', clearrecap: 'Total (vous décidez)', competitor: 'Imposées par l\'éditeur' },
        { label: 'Réversibilité', clearrecap: 'Données toujours chez vous', competitor: 'Migration complexe' },
        { label: 'Personnalisation IA', clearrecap: 'Profils métier + dictionnaires', competitor: 'Généralement limitée' },
        { label: 'Nombre d\'utilisateurs', clearrecap: 'Illimité (on-premise)', competitor: 'Facturation par siège' },
      ]}
      whyClearRecap={[
        'Souveraineté totale : vos données audio contiennent potentiellement des noms, données de santé, opinions et informations confidentielles. En local, elles ne quittent jamais votre réseau.',
        'RGPD simplifié : pas de transfert international = pas de DPA complexe, pas de clauses contractuelles à négocier, pas de risque de non-conformité.',
        'CLOUD Act éliminé : les solutions cloud hébergées aux US sont soumises au CLOUD Act, qui permet aux autorités américaines d\'accéder à vos données. Le local élimine ce risque.',
        'Coût prévisible : pas de facturation à l\'usage qui explose, pas de surprise. Licence fixe ou abonnement transparent.',
        'Performance constante : GPU local = latence réduite, pas de dépendance réseau, pas de file d\'attente sur des serveurs partagés.',
        'Idéal secteurs sensibles : santé (HDS), juridique (secret professionnel), défense (souveraineté), éducation (données mineurs).',
      ]}
      conclusion="Le cloud offre simplicité de déploiement et scalabilité. Le local offre confidentialité, souveraineté et conformité réglementaire native. Pour les organisations qui traitent des données sensibles — santé, juridique, défense, éducation — le 100% local de ClearRecap élimine les risques liés au transfert de données."
    />
  );
}
