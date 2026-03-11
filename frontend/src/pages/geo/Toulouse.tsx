import React from 'react';
import { Plane, Shield, Rocket, Building2, GraduationCap, Satellite } from 'lucide-react';
import GeoLanding from './GeoLanding';

export default function Toulouse() {
  return (
    <GeoLanding
      path="/transcription-toulouse-aerospace"
      city="Toulouse"
      region="Occitanie"
      meta={{
        title: 'Transcription Audio Souveraine à Toulouse — Aerospace Valley — ClearRecap',
        description: 'Transcription audio on-premise pour l\'aéronautique, la défense et le spatial à Toulouse. Souveraineté numérique garantie. Compatible SecNumCloud.',
      }}
      hero={{
        headline: 'Transcription Audio Souveraine à Toulouse — Aerospace Valley',
        sub: 'Déployez ClearRecap dans vos installations toulousaines. Conçu pour les exigences de confidentialité de l\'aéronautique, la défense et le spatial. Aucune donnée ne quitte vos serveurs.',
      }}
      ecosystem={{
        title: 'Toulouse, capital de l\'aéronautique et du spatial',
        description: 'Toulouse et Aerospace Valley concentrent les acteurs majeurs de l\'aéronautique, du spatial et de la défense. ClearRecap garantit la souveraineté numérique exigée par ces secteurs.',
        sectors: [
          {
            icon: Plane,
            name: 'Aéronautique',
            detail: 'Airbus, sous-traitants aéro. Transcription de revues de conception, comités techniques, audits qualité. Données ITAR protégées.',
          },
          {
            icon: Shield,
            name: 'Défense',
            detail: 'DGA, industriels de défense. Transcription confidentielle, compatible SecNumCloud. Aucun cloud américain impliqué.',
          },
          {
            icon: Satellite,
            name: 'Spatial',
            detail: 'CNES, Thales Alenia Space. Transcription de réunions de mission, revues de projet, communications ground-to-space.',
          },
          {
            icon: Rocket,
            name: 'Startups deeptech',
            detail: 'IoT Valley, Toulouse White Biotechnology. Transcription de pitchs investisseurs et réunions R&D.',
          },
          {
            icon: GraduationCap,
            name: 'Recherche & universités',
            detail: 'ISAE-SUPAERO, ENAC, Université Toulouse. Transcription de séminaires, soutenances, conférences.',
          },
          {
            icon: Building2,
            name: 'Institutions régionales',
            detail: 'Conseil régional Occitanie, métropole. Souveraineté des données publiques.',
          },
        ],
      }}
      poles={[
        'Aerospace Valley',
        'CNES Toulouse',
        'IoT Valley',
        'Agri Sud-Ouest Innovation',
        'Cancer-Bio-Santé',
      ]}
      partnerCTA="Nos partenaires intégrateurs en Occitanie installent ClearRecap dans les environnements sécurisés de l'aéronautique et de la défense toulousaine, avec habilitation sur site."
      features={[
        'Transcription Whisper large-v3 — précision 95%+ sur le vocabulaire technique aéro',
        'Déploiement air-gapped possible (aucune connexion internet requise)',
        'Compatible SecNumCloud 3.2 — déploiement on-premise pour OIV/OSE',
        'Non soumis au CLOUD Act — aucun composant américain',
        '9 analyses IA par profil, traitement GPU local',
        'Diarisation automatique jusqu\'à 20 locuteurs',
      ]}
    />
  );
}
