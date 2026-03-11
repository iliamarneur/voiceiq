import React from 'react';
import { Stethoscope, Building2, FlaskConical, Factory, GraduationCap, Briefcase } from 'lucide-react';
import GeoLanding from './GeoLanding';

export default function Lyon() {
  return (
    <GeoLanding
      path="/transcription-lyon-auvergne-rhone-alpes"
      city="Lyon"
      region="Auvergne-Rhône-Alpes"
      meta={{
        title: 'Transcription Audio IA à Lyon & Auvergne-Rhône-Alpes — ClearRecap',
        description: 'Transcription audio locale pour le secteur santé, pharma et industrie lyonnais. Déploiement on-premise, compatible HDS. Biopôle de Lyon, CHU, laboratoires.',
      }}
      hero={{
        headline: 'Transcription Audio IA à Lyon & Auvergne-Rhône-Alpes',
        sub: 'ClearRecap s\'installe sur vos serveurs lyonnais. Idéal pour le Biopôle, les CHU, les laboratoires pharma et l\'industrie régionale. Données de santé traitées 100 % en local.',
      }}
      ecosystem={{
        title: 'Lyon, capitale de la santé et de l\'industrie',
        description: 'La métropole lyonnaise est le premier pôle français de santé et biopharma. ClearRecap répond aux exigences HDS des établissements de santé régionaux.',
        sectors: [
          {
            icon: Stethoscope,
            name: 'CHU & hôpitaux',
            detail: 'Transcription de consultations, dictées médicales, staffs. Profil Médical avec note SOAP automatique, conforme HDS.',
          },
          {
            icon: FlaskConical,
            name: 'Biopharma & laboratoires',
            detail: 'Comptes-rendus de réunions R&D, comités scientifiques. Données confidentielles traitées localement.',
          },
          {
            icon: Factory,
            name: 'Industrie & chimie',
            detail: 'Vallée de la chimie, plasturgie. Transcription de réunions de production, audits qualité, CHSCT.',
          },
          {
            icon: GraduationCap,
            name: 'Universités & grandes écoles',
            detail: 'ENS Lyon, INSA, EM Lyon. Transcription de cours, séminaires de recherche, soutenances.',
          },
          {
            icon: Building2,
            name: 'Collectivités',
            detail: 'Métropole de Lyon, conseils municipaux. Souveraineté numérique des données publiques.',
          },
          {
            icon: Briefcase,
            name: 'Services aux entreprises',
            detail: 'Part-Dieu, pôle tertiaire. Transcription de réunions, formation, RH.',
          },
        ],
      }}
      poles={[
        'Lyonbiopôle',
        'Minalogic',
        'Axelera (chimie-environnement)',
        'Lyon French Tech',
        'Imaginove',
      ]}
      partnerCTA="Nos partenaires intégrateurs en Auvergne-Rhône-Alpes déploient ClearRecap dans les établissements de santé lyonnais, les laboratoires et les entreprises industrielles de la région."
    />
  );
}
