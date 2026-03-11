import React from 'react';
import { Building2, Landmark, Briefcase, Shield, Scale, Users } from 'lucide-react';
import GeoLanding from './GeoLanding';

export default function Paris() {
  return (
    <GeoLanding
      path="/transcription-paris-ile-de-france"
      city="Paris"
      region="Île-de-France"
      meta={{
        title: 'Transcription Audio Souveraine à Paris & Île-de-France — ClearRecap',
        description: 'Transcription audio IA 100 % locale pour les entreprises parisiennes. Installation on-premise à La Défense, cabinets, institutions publiques. Conforme RGPD, non soumis au CLOUD Act.',
      }}
      hero={{
        headline: 'Transcription Audio Souveraine à Paris & Île-de-France',
        sub: 'Déployez ClearRecap sur votre infrastructure parisienne. Transcription Whisper + analyses IA Ollama, 100 % local. Idéal pour les sièges sociaux, cabinets d\'avocats et institutions publiques.',
      }}
      ecosystem={{
        title: 'L\'écosystème francilien à votre service',
        description: 'Paris et l\'Île-de-France concentrent les sièges sociaux du CAC 40, les grands cabinets juridiques et les institutions publiques. ClearRecap répond aux exigences de confidentialité de ces organisations.',
        sectors: [
          {
            icon: Building2,
            name: 'Sièges sociaux & La Défense',
            detail: 'Transcription de comités de direction, CODIR, conseils d\'administration. Données stratégiques traitées en local.',
          },
          {
            icon: Scale,
            name: 'Cabinets d\'avocats',
            detail: 'Transcription d\'audiences, entretiens clients, notes de plaidoirie. Profil Juridique avec synthèse, obligations et échéances.',
          },
          {
            icon: Landmark,
            name: 'Institutions publiques',
            detail: 'Ministères, préfectures, collectivités. Souveraineté numérique garantie, aucune dépendance cloud américain.',
          },
          {
            icon: Briefcase,
            name: 'Cabinets de conseil',
            detail: 'Entretiens clients, workshops stratégiques. Export PPTX pour les présentations, extraction d\'actions et KPIs.',
          },
          {
            icon: Shield,
            name: 'Défense & sécurité',
            detail: 'OIV et OSE franciliens. Traitement on-premise compatible SecNumCloud, aucun transfert de données.',
          },
          {
            icon: Users,
            name: 'Startups & scale-ups',
            detail: 'Station F, incubateurs. Transcription de pitchs, réunions produit et interviews utilisateurs.',
          },
        ],
      }}
      poles={[
        'Systematic Paris-Region',
        'Finance Innovation',
        'Cap Digital',
        'Medicen Paris Region',
        'ASTech (aéronautique)',
      ]}
      partnerCTA="Nos partenaires intégrateurs en Île-de-France assurent l'installation, la configuration et le support sur site de ClearRecap dans vos locaux parisiens. Déploiement possible en 48h."
    />
  );
}
