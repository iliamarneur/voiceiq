import React from 'react';
import { Cpu, Wifi, FlaskConical, Building2, GraduationCap, Globe } from 'lucide-react';
import GeoLanding from './GeoLanding';

export default function SophiaAntipolis() {
  return (
    <GeoLanding
      path="/transcription-sophia-antipolis"
      city="Sophia Antipolis"
      region="Provence-Alpes-Côte d'Azur"
      meta={{
        title: 'Transcription Audio IA à Sophia Antipolis — R&D & Startups IA — ClearRecap',
        description: 'Transcription audio on-premise pour la R&D, les startups IA et les télécoms de Sophia Antipolis. Traitement local GPU, conforme RGPD.',
      }}
      hero={{
        headline: 'Transcription Audio IA à Sophia Antipolis',
        sub: 'ClearRecap tourne sur vos GPU à Sophia. Idéal pour les centres R&D, les startups IA et les acteurs des télécoms de la technopole. Traitement 100 % local, zéro cloud.',
      }}
      ecosystem={{
        title: 'Sophia Antipolis, technopole de l\'innovation',
        description: 'Première technopole d\'Europe, Sophia Antipolis concentre 2 500 entreprises dans les domaines de l\'IA, des télécoms et de la R&D. ClearRecap s\'intègre naturellement dans cet écosystème tech-first.',
        sectors: [
          {
            icon: Cpu,
            name: 'IA & Machine Learning',
            detail: 'Startups IA, centres R&D. Transcription de brainstormings, revues de modèles, conférences internes. ClearRecap utilise les mêmes technologies (Whisper, transformers).',
          },
          {
            icon: Wifi,
            name: 'Télécoms & 5G',
            detail: 'Orange, Huawei, Samsung. Transcription de réunions techniques, standards 3GPP, comités de normalisation.',
          },
          {
            icon: FlaskConical,
            name: 'R&D & innovation',
            detail: 'INRIA, CNRS, I3S. Transcription de séminaires de recherche, soutenances, workshops scientifiques.',
          },
          {
            icon: Globe,
            name: 'International',
            detail: 'Environnement multilingue (40 nationalités). Transcription en 12 langues avec détection automatique.',
          },
          {
            icon: GraduationCap,
            name: 'Formation & universités',
            detail: 'Polytech Nice, EURECOM, SKEMA. Transcription de cours et formations continues.',
          },
          {
            icon: Building2,
            name: 'Consortium W3C',
            detail: 'Le bureau européen du W3C est à Sophia. Transcription de réunions de standardisation web.',
          },
        ],
      }}
      poles={[
        'SCS (Solutions Communicantes Sécurisées)',
        'Eurobiomed',
        'French Tech Côte d\'Azur',
        'INRIA Sophia Antipolis',
        'ETSI (European Telecommunications Standards Institute)',
      ]}
      partnerCTA="Nos partenaires intégrateurs sur la Côte d'Azur installent ClearRecap dans les centres R&D et les startups de Sophia Antipolis. Déploiement GPU optimisé pour vos workstations."
      features={[
        'Transcription Whisper large-v3 — idéal pour les équipes R&D multilingues',
        'GPU accéléré — exploitez vos cartes NVIDIA existantes (RTX 3060+)',
        'API REST FastAPI — intégration facile dans vos pipelines CI/CD',
        'Docker Compose — déploiement en une commande',
        '12 langues avec détection automatique — parfait pour Sophia (40 nationalités)',
        'Export JSON structuré — compatible avec vos outils d\'analyse de données',
      ]}
    />
  );
}
