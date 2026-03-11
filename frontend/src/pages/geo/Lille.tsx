import React from 'react';
import { Scale, Monitor, Building2, ShoppingCart, GraduationCap, Briefcase } from 'lucide-react';
import GeoLanding from './GeoLanding';

export default function Lille() {
  return (
    <GeoLanding
      path="/transcription-lille-euratechnologies"
      city="Lille"
      region="Hauts-de-France"
      meta={{
        title: 'Transcription Audio IA à Lille & Euratechnologies — ClearRecap',
        description: 'Transcription audio locale pour le numérique, la legaltech et le commerce lillois. Déploiement on-premise, conforme RGPD. Euratechnologies, La Catho, CHU Lille.',
      }}
      hero={{
        headline: 'Transcription Audio IA à Lille & Euratechnologies',
        sub: 'ClearRecap se déploie sur vos serveurs lillois. Parfait pour les startups legaltech d\'Euratechnologies, les cabinets juridiques et le secteur du commerce et de la distribution.',
      }}
      ecosystem={{
        title: 'Lille, hub du numérique et de la legaltech',
        description: 'Euratechnologies est le premier incubateur français. La métropole lilloise est un carrefour européen avec une forte concentration de legaltech, e-commerce et services.',
        sectors: [
          {
            icon: Scale,
            name: 'Legaltech & cabinets',
            detail: 'Transcription d\'audiences, entretiens clients, médiations. Profil Juridique avec extraction des obligations et échéances.',
          },
          {
            icon: Monitor,
            name: 'Numérique & startups',
            detail: 'Euratechnologies, French Tech Lille. Transcription de standups, rétrospectives, interviews utilisateurs.',
          },
          {
            icon: ShoppingCart,
            name: 'Commerce & distribution',
            detail: 'Sièges de la grande distribution (Auchan, Decathlon). Transcription de comités stratégiques et réunions fournisseurs.',
          },
          {
            icon: GraduationCap,
            name: 'Universités & écoles',
            detail: 'Université de Lille, La Catho, EDHEC. Transcription de cours, conférences, séminaires de recherche.',
          },
          {
            icon: Building2,
            name: 'Collectivités',
            detail: 'MEL (Métropole Européenne de Lille), Région Hauts-de-France. Souveraineté des données publiques.',
          },
          {
            icon: Briefcase,
            name: 'Services transfrontaliers',
            detail: 'Proximité Belgique et Pays-Bas. Transcription multilingue (français, néerlandais, anglais) pour les échanges transfrontaliers.',
          },
        ],
      }}
      poles={[
        'Euratechnologies',
        'French Tech Lille',
        'Eurasanté',
        'PICOM (commerce connecté)',
        'Pôle i-Trans (transports)',
      ]}
      partnerCTA="Nos partenaires intégrateurs dans les Hauts-de-France déploient ClearRecap chez les startups d'Euratechnologies, les cabinets juridiques et les entreprises de la métropole lilloise."
    />
  );
}
