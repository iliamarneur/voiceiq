/**
 * Centralized SEO data: structured data schemas, hreflang config, and page meta definitions.
 */

const BASE_URL = 'https://clearrecap.com';

// ──────────────────────────────────────────
// hreflang configuration for francophone markets
// ──────────────────────────────────────────

export function getHreflangAlternates(path: string) {
  return [
    { lang: 'fr', href: `${BASE_URL}/fr${path}` },
    { lang: 'fr-FR', href: `${BASE_URL}/fr-fr${path}` },
    { lang: 'fr-BE', href: `${BASE_URL}/fr-be${path}` },
    { lang: 'fr-CH', href: `${BASE_URL}/fr-ch${path}` },
    { lang: 'fr-CA', href: `${BASE_URL}/fr-ca${path}` },
    { lang: 'x-default', href: `${BASE_URL}${path}` },
  ];
}

export function getCanonical(path: string) {
  return `${BASE_URL}${path}`;
}

// ──────────────────────────────────────────
// Schema.org — Organization
// ──────────────────────────────────────────

export const SCHEMA_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ClearRecap',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description: 'Plateforme de transcription et d\'analyse audio 100% locale',
  sameAs: [
    'https://www.linkedin.com/company/clearrecap',
    'https://twitter.com/clearrecap',
    'https://github.com/clearrecap',
  ],
};

// ──────────────────────────────────────────
// Schema.org — SoftwareApplication (home page)
// ──────────────────────────────────────────

export const SCHEMA_SOFTWARE_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ClearRecap',
  description:
    'Plateforme 100% locale de transcription et d\'analyse audio par IA. Déployez sur votre infrastructure, gardez vos données.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Linux, Windows, macOS (Docker)',
  offers: [
    {
      '@type': 'Offer',
      name: 'One-shot',
      price: '3',
      priceCurrency: 'EUR',
      description: 'Transcription sans abonnement dès 3€',
    },
    {
      '@type': 'Offer',
      name: 'Basic',
      price: '19',
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        billingDuration: 'P1M',
      },
      description: '500 minutes/mois',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '49',
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        billingDuration: 'P1M',
      },
      description: '3000 minutes/mois',
    },
    {
      '@type': 'Offer',
      name: 'Équipe+',
      price: '99',
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        billingDuration: 'P1M',
      },
      description: '10000 minutes/mois',
    },
  ],
  featureList: [
    'Transcription locale via Whisper (faster-whisper large-v3)',
    '5 profils verticaux (Générique, Business, Éducation, Médical, Juridique)',
    '9 analyses IA par profil',
    '100% local — aucune donnée envoyée à l\'extérieur',
    'GPU accéléré',
    'Multi-langue (12 langues)',
    'Export multi-format (PPTX, SRT, VTT, JSON, MD, PDF)',
    'Diarisation des locuteurs',
    'Chat avec transcription',
    'Dictée en temps réel',
  ],
  softwareVersion: '7.2.0',
  dateModified: '2026-03-11',
};

// ──────────────────────────────────────────
// Schema.org — FAQPage (home page / FAQ page)
// ──────────────────────────────────────────

export const SCHEMA_FAQ_HOME = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Mes données sont-elles envoyées dans le cloud ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Non. ClearRecap fonctionne à 100% en local sur votre infrastructure. Aucune donnée audio, transcription ou analyse ne quitte votre réseau. C\'est la conformité RGPD par design.',
      },
    },
    {
      '@type': 'Question',
      name: 'Quels profils métier sont disponibles ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ClearRecap propose 5 profils verticaux : Générique, Business, Éducation, Médical et Juridique. Chaque profil active un pipeline d\'analyse spécifique avec des prompts optimisés pour votre contexte métier.',
      },
    },
    {
      '@type': 'Question',
      name: 'Peut-on utiliser ClearRecap sans abonnement ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui. Le mode one-shot permet de transcrire un fichier dès 3€ sans aucun engagement. 6 paliers sont disponibles de 3€ à 18€ selon la durée du fichier.',
      },
    },
    {
      '@type': 'Question',
      name: 'ClearRecap est-il conforme au RGPD pour les données de santé ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Le déploiement 100% local de ClearRecap élimine les problématiques de transfert international de données. Vos données audio médicales restent sur votre infrastructure, avec chiffrement et contrôle d\'accès granulaire via l\'authentification JWT et l\'isolation multi-utilisateur.',
      },
    },
    {
      '@type': 'Question',
      name: 'Quelles langues sont supportées ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ClearRecap supporte 12 langues : français, anglais, espagnol, allemand, italien, portugais, néerlandais, russe, chinois, japonais, coréen et arabe. La détection automatique de la langue est également disponible.',
      },
    },
  ],
};

// ──────────────────────────────────────────
// Page meta definitions
// ──────────────────────────────────────────

export const PAGE_META = {
  home: {
    title: 'ClearRecap — Transcription audio locale & analyse IA métier',
    description:
      'Transcrivez et analysez vos fichiers audio en local. 5 profils métier (Médical, Juridique, Business, Éducation). 100% RGPD. Dès 3€.',
  },
  pricing: {
    title: 'Tarifs ClearRecap — Transcription audio dès 3€ sans abonnement',
    description:
      'Plans Basic (19€), Pro (49€), Équipe+ (99€) ou one-shot dès 3€. Transcription Whisper locale + analyses IA. Sans engagement.',
  },
  blog: {
    title: 'Blog ClearRecap — Guides transcription audio & IA locale',
    description:
      'Guides, analyses et bonnes pratiques autour de la transcription audio locale, conformité RGPD, et intelligence artificielle métier.',
  },
  faq: {
    title: 'FAQ ClearRecap — Transcription Audio Locale',
    description:
      'Toutes les réponses sur ClearRecap : confidentialité, profils métier, pricing, langues supportées, déploiement Docker.',
  },
  oneshot: {
    title: 'Transcription à l\'unité — ClearRecap dès 3€',
    description:
      'Transcrivez un fichier audio sans abonnement. 6 paliers de 3€ à 18€ selon la durée. 100% local, conforme RGPD.',
  },
} as const;
