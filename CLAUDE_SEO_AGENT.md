# CLAUDE.md — ClearRecap SEO, GEO & Conversion Optimization Agent

## Identité & Mission

Tu es un agent spécialisé en référencement (SEO/GEO), optimisation de conversion (CRO) et growth marketing pour une application SaaS de transcription audio. Tu travailles sur le projet **ClearRecap** — une plateforme 100% locale de transcription et d'analyse audio déployée via Docker Compose.

**Stack technique du projet :**
- Frontend : React 18 + TypeScript + Tailwind CSS + Framer Motion
- Backend : Python 3.12 + FastAPI
- Transcription : faster-whisper (local)
- LLM : Ollama (mistral-nemo)
- Database : SQLite (aiosqlite)
- Deploy : Docker Compose

**Fichier de stratégie de référence :** Lis et intègre INTÉGRALEMENT le fichier `strategie_clearrecap.md` (fourni dans le contexte du projet). Ce fichier contient l'analyse concurrentielle, la stratégie SEO/GEO, le plan de conversion et la stratégie de monétisation. Toutes tes actions doivent s'aligner sur cette stratégie.

---

## Rules (violations = bugs)

- NEVER supprimer ou modifier les fonctionnalités existantes de l'application
- NEVER envoyer de données utilisateur vers des services externes (le 100% local est le coeur de la proposition de valeur)
- NEVER modifier la logique backend de transcription ou d'analyse IA
- NEVER casser les routes API existantes
- ALWAYS créer un backup avant de modifier un fichier existant (`cp fichier fichier.bak`)
- ALWAYS tester que le build React compile sans erreur après chaque modification (`npm run build`)
- ALWAYS utiliser des URLs absolues dans les meta tags et structured data
- ALWAYS respecter l'architecture React existante (composants, routing, state management)

---

## Contexte Projet

- Language : TypeScript (frontend), Python (backend)
- Framework : React 18 (Vite), FastAPI
- Test command : `npm run build && npm run preview`
- Build command : `npm run build`
- Structure : monorepo avec frontend/ et backend/ séparés
- URL de production : `https://clearrecap.com`
- Marché cible : francophone (FR, BE, CH, CA)

---

## Phase 1 — SEO Technique & Fondations (PRIORITAIRE)

### 1.1 Schema Markup JSON-LD

Crée un composant React `src/components/SEO/StructuredData.tsx` qui injecte le schema markup JSON-LD sur chaque page. Utilise `react-helmet-async` (installe-le si absent).

**Schemas requis :**

```typescript
// Schema SoftwareApplication (page d'accueil)
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ClearRecap",
  "description": "Plateforme 100% locale de transcription et d'analyse audio par IA. Déployez sur votre infrastructure, gardez vos données.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Linux, Windows, macOS (Docker)",
  "offers": [
    {
      "@type": "Offer",
      "name": "One-shot",
      "price": "3",
      "priceCurrency": "EUR",
      "description": "Transcription sans abonnement dès 3€"
    },
    {
      "@type": "Offer",
      "name": "Basic",
      "price": "19",
      "priceCurrency": "EUR",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "billingDuration": "P1M"
      },
      "description": "500 minutes/mois"
    },
    {
      "@type": "Offer",
      "name": "Pro",
      "price": "49",
      "priceCurrency": "EUR",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "billingDuration": "P1M"
      },
      "description": "3000 minutes/mois"
    },
    {
      "@type": "Offer",
      "name": "Équipe+",
      "price": "99",
      "priceCurrency": "EUR",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "billingDuration": "P1M"
      },
      "description": "10000 minutes/mois"
    }
  ],
  "featureList": [
    "Transcription locale via Whisper (faster-whisper large-v3)",
    "5 profils verticaux (Générique, Business, Éducation, Médical, Juridique)",
    "9 analyses IA par profil",
    "100% local — aucune donnée envoyée à l'extérieur",
    "GPU accéléré",
    "Multi-langue (12 langues)",
    "Export multi-format (PPTX, SRT, VTT, JSON, MD, PDF)",
    "Diarisation des locuteurs",
    "Chat avec transcription",
    "Dictée en temps réel"
  ],
  "softwareVersion": "7.2.0",
  "dateModified": "2026-03-08"
}
```

```typescript
// Schema FAQPage (page FAQ ou section FAQ de la landing)
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Mes données sont-elles envoyées dans le cloud ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Non. ClearRecap fonctionne à 100% en local sur votre infrastructure. Aucune donnée audio, transcription ou analyse ne quitte votre réseau. C'est la conformité RGPD par design."
      }
    },
    {
      "@type": "Question",
      "name": "Quels profils métier sont disponibles ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ClearRecap propose 5 profils verticaux : Générique, Business, Éducation, Médical et Juridique. Chaque profil active un pipeline d'analyse spécifique avec des prompts optimisés pour votre contexte métier."
      }
    },
    {
      "@type": "Question",
      "name": "Peut-on utiliser ClearRecap sans abonnement ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Oui. Le mode one-shot permet de transcrire un fichier dès 3€ sans aucun engagement. 6 paliers sont disponibles de 3€ à 18€ selon la durée du fichier."
      }
    },
    {
      "@type": "Question",
      "name": "ClearRecap est-il conforme au RGPD pour les données de santé ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Le déploiement 100% local de ClearRecap élimine les problématiques de transfert international de données. Vos données audio médicales restent sur votre infrastructure, avec chiffrement et contrôle d'accès granulaire via l'authentification JWT et l'isolation multi-utilisateur."
      }
    },
    {
      "@type": "Question",
      "name": "Quelles langues sont supportées ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ClearRecap supporte 12 langues : français, anglais, espagnol, allemand, italien, portugais, néerlandais, russe, chinois, japonais, coréen et arabe. La détection automatique de la langue est également disponible."
      }
    }
  ]
}
```

```typescript
// Schema Organization
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ClearRecap",
  "url": "https://clearrecap.com",
  "logo": "https://clearrecap.com/logo.png",
  "description": "Plateforme de transcription et d'analyse audio 100% locale",
  "sameAs": [
    "https://www.linkedin.com/company/clearrecap",
    "https://twitter.com/clearrecap",
    "https://github.com/clearrecap"
  ]
}
```

### 1.2 Meta Tags & Open Graph

Crée un composant `src/components/SEO/MetaTags.tsx` réutilisable qui gère les meta tags pour chaque page via `react-helmet-async` :

```typescript
interface MetaTagsProps {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  ogImage?: string;
  hreflangAlternates?: { lang: string; href: string }[];
  noindex?: boolean;
}
```

**Meta tags par page :**

| Page | Title | Description |
|---|---|---|
| Accueil | ClearRecap — Transcription audio locale & analyse IA métier | Transcrivez et analysez vos fichiers audio en local. 5 profils métier (Médical, Juridique, Business, Éducation). 100% RGPD. Dès 3€. |
| Pricing | Tarifs ClearRecap — Transcription audio dès 3€ sans abonnement | Plans Basic (19€), Pro (49€), Équipe+ (99€) ou one-shot dès 3€. Transcription Whisper locale + analyses IA. Sans engagement. |
| Profil Médical | Transcription Médicale Locale — Note SOAP, RGPD & Confidentialité | Transcription médicale 100% locale. Note SOAP structurée, prescriptions, plan de suivi. Vos données patient ne quittent jamais votre réseau. |
| Profil Juridique | Transcription Juridique Confidentielle — Audiences & Consultations | Transcription juridique sécurisée en local. Synthèse, obligations par partie, risques, échéances. Secret professionnel garanti. |
| Profil Business | Transcription de Réunions — CR Automatique & Actions IA | Transformez vos réunions en comptes rendus structurés. Actions, KPIs, risques détectés par IA. 100% local. |
| Profil Éducation | Transcription Pédagogique — Cours, Quiz & Fiches de Révision IA | Transcrivez vos cours et conférences. Quiz QCM, fiches de révision, carte mentale générés automatiquement. |
| FAQ | FAQ ClearRecap — Transcription Audio Locale | Toutes les réponses sur ClearRecap : confidentialité, profils métier, pricing, langues supportées, déploiement Docker. |

**Implémentation hreflang** pour chaque page (balises dans le `<head>`) :
```html
<link rel="alternate" hreflang="fr" href="https://clearrecap.com/fr/[page]" />
<link rel="alternate" hreflang="fr-FR" href="https://clearrecap.com/fr-fr/[page]" />
<link rel="alternate" hreflang="fr-BE" href="https://clearrecap.com/fr-be/[page]" />
<link rel="alternate" hreflang="fr-CH" href="https://clearrecap.com/fr-ch/[page]" />
<link rel="alternate" hreflang="fr-CA" href="https://clearrecap.com/fr-ca/[page]" />
<link rel="alternate" hreflang="x-default" href="https://clearrecap.com/[page]" />
```

### 1.3 Sitemap XML & robots.txt

Crée un script `scripts/generate-sitemap.ts` qui génère :

**`public/sitemap.xml`** — sitemap avec annotations hreflang :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://clearrecap.com/</loc>
    <lastmod>2026-03-08</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="https://clearrecap.com/fr/" />
    <xhtml:link rel="alternate" hreflang="fr-FR" href="https://clearrecap.com/fr-fr/" />
    <xhtml:link rel="alternate" hreflang="fr-BE" href="https://clearrecap.com/fr-be/" />
    <xhtml:link rel="alternate" hreflang="fr-CH" href="https://clearrecap.com/fr-ch/" />
    <xhtml:link rel="alternate" hreflang="fr-CA" href="https://clearrecap.com/fr-ca/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://clearrecap.com/" />
  </url>
  <!-- Répéter pour chaque page publique -->
</urlset>
```

**`public/robots.txt`** :
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Sitemap: https://clearrecap.com/sitemap.xml
```

---

## Phase 2 — Pages de Conversion & Landing Pages

### 2.1 Pages Verticales (Profils Métier)

Crée 4 pages de landing dédiées aux profils verticaux. Chaque page doit être un composant React indépendant avec son propre routing :

- `/transcription-medicale` → `src/pages/LandingMedical.tsx`
- `/transcription-juridique` → `src/pages/LandingJuridique.tsx`
- `/transcription-reunion` → `src/pages/LandingBusiness.tsx`
- `/transcription-education` → `src/pages/LandingEducation.tsx`

**Structure de chaque page verticale :**

1. **Hero Section** (au-dessus de la fold)
   - Headline spécifique au métier (ex: "Transcription Médicale 100% Locale — Vos données patient ne quittent jamais votre réseau")
   - Sous-titre avec problème résolu (ex: "Générez des notes SOAP structurées, des prescriptions et plans de suivi automatiquement")
   - CTA principal : "Essayer pour 3€" (bouton primaire) + "Voir une démo" (bouton secondaire)
   - Badge "100% Local • RGPD Natif • Aucune donnée externe"

2. **Section Problème/Solution**
   - 3 pain points du métier avec icônes
   - Comment ClearRecap résout chacun

3. **Section Fonctionnalités Métier**
   - Liste des analyses spécifiques au profil (ex: pour Médical → Note SOAP, Résumé clinique, Rédaction PII, Prescriptions, Red flags, Plan de suivi, Points clés cliniques)
   - Captures d'écran ou mockups des analyses

4. **Section Comparaison**
   - Tableau "ClearRecap vs Solutions Cloud" :
     | Critère | ClearRecap | Solutions Cloud |
     |---|---|---|
     | Données | 100% local | Envoyées aux USA/Cloud |
     | RGPD | Conforme par design | Nécessite DPA complexe |
     | Latence | GPU local, rapide | Dépend de la connexion |
     | Profils métier | Analyses spécialisées | Transcription générique |
     | Coût récurrent | Dès 3€ | 10-50€/mois minimum |

5. **Section Social Proof**
   - Témoignages (placeholder à remplir)
   - Chiffres clés (nombre de langues, types d'analyses, etc.)

6. **Section Pricing rapide**
   - Résumé des plans avec CTA vers la page pricing complète

7. **Section FAQ métier**
   - 3-5 questions spécifiques au métier avec schema FAQPage

8. **CTA Final**
   - Reformulation de la proposition de valeur + bouton CTA

### 2.2 Pages Comparatives

Crée des pages de comparaison pour capturer le trafic concurrentiel :

- `/comparatif/clearrecap-vs-happyscribe` → `src/pages/comparisons/VsHappyScribe.tsx`
- `/comparatif/clearrecap-vs-otter-ai` → `src/pages/comparisons/VsOtterAI.tsx`
- `/comparatif/transcription-cloud-vs-locale` → `src/pages/comparisons/CloudVsLocal.tsx`

**Structure de chaque page comparative :**
- Tableau comparatif détaillé (prix, features, confidentialité, langues)
- Section "Pourquoi choisir ClearRecap"
- CTA vers inscription/essai
- Schema markup de type `ComparisonPage` (ou Article avec structured data)

### 2.3 Page FAQ Complète

Crée `/faq` → `src/pages/FAQ.tsx` avec :
- Questions organisées par catégorie (Général, Confidentialité, Pricing, Technique, Profils Métier)
- Schema FAQPage complet
- Accordéons interactifs (accessible, keyboard-navigable)
- Liens internes vers les pages verticales pertinentes

---

## Phase 3 — Optimisation CRO (Conversion Rate Optimization)

### 3.1 Composants de Conversion

Crée les composants suivants dans `src/components/Conversion/` :

**`CTABanner.tsx`** — Bannière CTA réutilisable :
- Variante "essai" : "Transcrivez votre premier fichier — dès 3€, sans abonnement"
- Variante "pro" : "Passez au Pro — 3000 minutes/mois pour 49€"
- A/B testable via une prop `variant`

**`SocialProof.tsx`** — Bloc de preuve sociale :
- Logos clients (placeholder)
- Compteurs animés (langues supportées, analyses disponibles, etc.)
- Témoignages rotatifs

**`TrustBadges.tsx`** — Badges de confiance :
- "100% Local" avec icône serveur
- "RGPD Natif" avec icône bouclier
- "Aucune Donnée Externe" avec icône cadenas
- "GPU Accéléré" avec icône éclair

**`PricingTable.tsx`** — Table de pricing optimisée :
- Plan recommandé mis en évidence visuellement (bordure, badge "Populaire")
- Toggle mensuel/annuel (-20% annuel)
- CTA différencié par plan
- Mention "Sans engagement" visible

**`ROICalculator.tsx`** — Calculateur de ROI interactif :
- Input : nombre de réunions/consultations par semaine, durée moyenne
- Output : temps gagné, coût estimé, plan recommandé
- CTA contextuel basé sur le résultat

### 3.2 Optimisations UX de Conversion

**Navigation & Header :**
- CTA "Essayer" toujours visible dans la navbar (sticky)
- Indicateur du plan actuel pour les utilisateurs connectés
- Lien rapide vers le pricing

**Micro-interactions :**
- Animation d'entrée sur les sections (Framer Motion, déjà dans la stack)
- Feedback visuel immédiat sur les CTAs (hover, loading states)
- Progress bar lors de l'upload pour rassurer l'utilisateur

**Urgency & Scarcity (éthiques) :**
- "Plus de 12 000 minutes transcrites ce mois" (compteur réel depuis l'API)
- "Nouveau : Profil Médical avec Note SOAP automatique" (badge "Nouveau")

---

### 3.3 Calculateur TCO (Total Cost of Ownership)

Crée un composant `src/components/Conversion/TCOCalculator.tsx` — calculateur interactif comparant le coût cloud vs ClearRecap on-premise sur 1, 3 et 5 ans.

**Inputs utilisateur :**
- Nombre d'heures de réunions/consultations par mois (slider : 10-500h)
- Nombre d'utilisateurs (slider : 1-100)
- Secteur d'activité (dropdown : Médical, Juridique, Business, Éducation, Autre)

**Calcul backend (logique côté client) :**
```typescript
interface TCOInputs {
  hoursPerMonth: number;
  users: number;
  sector: string;
  years: 1 | 3 | 5;
}

interface TCOResult {
  cloudCost: number;       // Coût SaaS cloud sur la période
  clearrecapCost: number;  // Coût ClearRecap (licence + hardware amorti + maintenance)
  savings: number;         // Économie en €
  savingsPercent: number;  // Économie en %
  breakEvenMonth: number;  // Mois de rentabilité
}

// Hypothèses de calcul (configurable dans un fichier constants)
const CLOUD_COST_PER_MINUTE = 0.12;  // €/min (moyenne Otter/Sonix/HappyScribe)
const CLEARRECAP_LICENSE_ANNUAL = 12000;  // € licence annuelle on-premise
const CLEARRECAP_SETUP = 3500;  // € installation + formation (one-time)
const HARDWARE_COST = 7500;  // € serveur GPU (amorti sur 5 ans)
const MAINTENANCE_ANNUAL = 1500;  // € maintenance + électricité/an
```

**Affichage :**
- Barres comparatives animées (Framer Motion) cloud vs local
- Tableau récapitulatif avec détail des coûts
- Badge "Économie de XX%" mis en évidence
- Graphique ligne simple montrant le croisement des courbes de coût
- CTA contextuel : "Demander un devis on-premise" si économie > 30%, sinon "Démarrer avec le plan Pro"

**Page dédiée :** Crée aussi `/calculateur-tco` → `src/pages/TCOCalculator.tsx` qui embed le composant avec :
- Explication de la méthodologie
- Schema markup HowTo
- Meta tags optimisés : "Calculateur TCO Transcription Audio — Cloud vs Local"
- Section "Hypothèses et méthodologie" transparente

---

## Phase 4 — Contenu SEO & Blog

### 4.1 Architecture du Blog

Crée la structure pour un blog intégré :

- `/blog` → `src/pages/Blog.tsx` (liste des articles)
- `/blog/:slug` → `src/pages/BlogPost.tsx` (article individuel)

**Le contenu des articles sera fourni en Markdown** dans `content/blog/`. Le composant `BlogPost.tsx` doit :
- Parser le Markdown (utilise `react-markdown` ou `marked`)
- Injecter les meta tags spécifiques à l'article
- Ajouter le schema `Article` JSON-LD
- Inclure des CTAs intégrés au contenu (composant `InlineCTA`)
- Afficher l'auteur, la date, le temps de lecture
- Breadcrumbs pour le SEO

**Articles prioritaires à structurer (créer les fichiers .md vides avec frontmatter) :**

```markdown
---
title: "Transcription Audio et RGPD : Le Guide Complet 2026"
slug: transcription-audio-rgpd-guide-2026
description: "Tout ce que vous devez savoir sur la conformité RGPD pour la transcription audio. Pourquoi le 100% local change tout."
category: souverainete
tags: [rgpd, confidentialite, donnees-sante, cloud-act]
date: 2026-03-11
author: ClearRecap
profile: generique
---
```

```markdown
---
title: "Transcription Médicale Automatique : Note SOAP par IA"
slug: transcription-medicale-note-soap-ia
description: "Comment automatiser vos comptes rendus médicaux avec une transcription locale et une analyse SOAP par IA."
category: medical
tags: [medical, soap, transcription, ia]
date: 2026-03-11
author: ClearRecap
profile: medical
---
```

```markdown
---
title: "ClearRecap vs HappyScribe : Comparatif Complet 2026"
slug: clearrecap-vs-happyscribe-comparatif-2026
description: "Comparaison détaillée entre ClearRecap (local) et HappyScribe (cloud). Prix, fonctionnalités, confidentialité."
category: comparatif
tags: [comparatif, happyscribe, alternative]
date: 2026-03-11
author: ClearRecap
profile: generique
---
```

```markdown
---
title: "Cloud vs Local : Où Vont Vos Données Audio ?"
slug: transcription-cloud-vs-local-donnees
description: "Analyse des risques du cloud pour la transcription audio. CLOUD Act, transferts internationaux, et l'alternative locale."
category: souverainete
tags: [cloud, local, souverainete, cloud-act]
date: 2026-03-11
author: ClearRecap
profile: generique
---
```

```markdown
---
title: "Automatiser les Comptes Rendus de Réunion avec l'IA"
slug: automatiser-comptes-rendus-reunion-ia
description: "Comment transformer automatiquement vos réunions en CR structurés avec actions, décisions et KPIs."
category: business
tags: [reunion, cr, business, productivite]
date: 2026-03-11
author: ClearRecap
profile: business
---
```

```markdown
---
title: "Déployer ClearRecap avec Docker Compose : Guide Technique Complet"
slug: deployer-clearrecap-docker-compose-guide
description: "Guide pas-à-pas pour installer ClearRecap en local avec Docker Compose, GPU NVIDIA et Ollama."
category: technique
tags: [docker, installation, gpu, devops, faster-whisper, ollama]
date: 2026-03-11
author: ClearRecap
profile: generique
---
```

```markdown
---
title: "API de Transcription Locale avec FastAPI et Whisper : Architecture et Intégration"
slug: api-transcription-locale-fastapi-whisper
description: "Comment intégrer l'API de transcription ClearRecap dans votre SI. Endpoints, authentification JWT, webhooks."
category: technique
tags: [api, fastapi, whisper, integration, developpeur]
date: 2026-03-11
author: ClearRecap
profile: generique
---
```

```markdown
---
title: "Certification HDS et Transcription Médicale : Ce Que Vous Devez Savoir en 2026"
slug: certification-hds-transcription-medicale-2026
description: "Le référentiel HDS 2.0, ses implications pour la transcription audio médicale, et pourquoi le local simplifie tout."
category: souverainete
tags: [hds, medical, certification, donnees-sante, rgpd]
date: 2026-03-11
author: ClearRecap
profile: medical
---
```

---

## Phase 5 — Dashboard Admin SEO & Stratégie

### 5.1 Page Admin : SEO & Strategy Tracker

Crée une nouvelle page dans le dashboard admin : `/admin/seo-strategy` → `src/pages/admin/SEOStrategy.tsx`

Cette page affiche un tableau de bord de suivi de l'implémentation SEO/GEO et de la stratégie de conversion. Elle est divisée en sections :

**Section 1 : Checklist d'implémentation SEO**

Affiche un tableau interactif avec l'état de chaque tâche. Les données sont stockées dans `src/data/seo-checklist.json` :

```json
{
  "seo_checklist": [
    {
      "id": "schema-softwareapp",
      "category": "SEO Technique",
      "task": "Schema JSON-LD SoftwareApplication",
      "description": "Schema markup sur la page d'accueil avec pricing et features",
      "status": "done|in-progress|todo",
      "page": "/",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "schema-faq",
      "category": "SEO Technique",
      "task": "Schema JSON-LD FAQPage",
      "description": "Schema FAQ sur la page FAQ et les pages verticales",
      "status": "todo",
      "page": "/faq, /transcription-*",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "schema-organization",
      "category": "SEO Technique",
      "task": "Schema JSON-LD Organization",
      "description": "Schema Organisation avec logo et liens sociaux",
      "status": "todo",
      "page": "Global",
      "priority": "moyenne",
      "notes": ""
    },
    {
      "id": "meta-tags",
      "category": "SEO Technique",
      "task": "Meta Tags & Open Graph par page",
      "description": "Title, description, OG tags, Twitter cards pour chaque page",
      "status": "todo",
      "page": "Toutes",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "hreflang",
      "category": "SEO International",
      "task": "Balises hreflang (fr-FR, fr-BE, fr-CH, fr-CA)",
      "description": "Implémentation hreflang sur toutes les pages publiques",
      "status": "todo",
      "page": "Toutes",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "sitemap",
      "category": "SEO Technique",
      "task": "Sitemap XML avec annotations hreflang",
      "description": "Génération automatique du sitemap avec toutes les variantes",
      "status": "todo",
      "page": "/sitemap.xml",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "robots-txt",
      "category": "SEO Technique",
      "task": "robots.txt optimisé",
      "description": "Fichier robots.txt avec directives et lien sitemap",
      "status": "todo",
      "page": "/robots.txt",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "canonical-urls",
      "category": "SEO Technique",
      "task": "URLs canoniques sur chaque page",
      "description": "Balise rel=canonical sur toutes les pages pour éviter le duplicate content",
      "status": "todo",
      "page": "Toutes",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "landing-medical",
      "category": "Pages Verticales",
      "task": "Landing Transcription Médicale",
      "description": "Page dédiée avec hero, features, FAQ, pricing, CTA",
      "status": "todo",
      "page": "/transcription-medicale",
      "priority": "haute",
      "notes": "Profil Medical : Note SOAP, PII, prescriptions, red flags"
    },
    {
      "id": "landing-juridique",
      "category": "Pages Verticales",
      "task": "Landing Transcription Juridique",
      "description": "Page dédiée avec hero, features, FAQ, pricing, CTA",
      "status": "todo",
      "page": "/transcription-juridique",
      "priority": "haute",
      "notes": "Profil Juridique : synthèse, obligations, risques, échéances"
    },
    {
      "id": "landing-business",
      "category": "Pages Verticales",
      "task": "Landing Transcription Réunions/Business",
      "description": "Page dédiée avec hero, features, FAQ, pricing, CTA",
      "status": "todo",
      "page": "/transcription-reunion",
      "priority": "haute",
      "notes": "Profil Business : CR, actions, KPIs, risques, slides executive"
    },
    {
      "id": "landing-education",
      "category": "Pages Verticales",
      "task": "Landing Transcription Éducation",
      "description": "Page dédiée avec hero, features, FAQ, pricing, CTA",
      "status": "todo",
      "page": "/transcription-education",
      "priority": "haute",
      "notes": "Profil Education : fiches révision, quiz, carte concepts, exercices"
    },
    {
      "id": "page-faq",
      "category": "Pages Conversion",
      "task": "Page FAQ complète",
      "description": "FAQ par catégorie avec schema FAQPage et accordéons",
      "status": "todo",
      "page": "/faq",
      "priority": "moyenne",
      "notes": ""
    },
    {
      "id": "comparatif-happyscribe",
      "category": "Pages Comparatives",
      "task": "ClearRecap vs HappyScribe",
      "description": "Page comparative détaillée",
      "status": "todo",
      "page": "/comparatif/clearrecap-vs-happyscribe",
      "priority": "moyenne",
      "notes": ""
    },
    {
      "id": "comparatif-otter",
      "category": "Pages Comparatives",
      "task": "ClearRecap vs Otter.ai",
      "description": "Page comparative détaillée",
      "status": "todo",
      "page": "/comparatif/clearrecap-vs-otter-ai",
      "priority": "moyenne",
      "notes": ""
    },
    {
      "id": "comparatif-cloud-local",
      "category": "Pages Comparatives",
      "task": "Transcription Cloud vs Locale",
      "description": "Page éducative comparant les deux approches",
      "status": "todo",
      "page": "/comparatif/transcription-cloud-vs-locale",
      "priority": "moyenne",
      "notes": ""
    },
    {
      "id": "cta-components",
      "category": "CRO (Conversion)",
      "task": "Composants CTA réutilisables",
      "description": "CTABanner, SocialProof, TrustBadges, PricingTable, ROICalculator",
      "status": "todo",
      "page": "Global",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "pricing-optimized",
      "category": "CRO (Conversion)",
      "task": "Page pricing optimisée",
      "description": "Toggle annuel/mensuel, plan recommandé, calculateur ROI",
      "status": "todo",
      "page": "/pricing",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "blog-architecture",
      "category": "Content Marketing",
      "task": "Architecture blog avec Markdown",
      "description": "Pages /blog et /blog/:slug avec parsing MD, schema Article, CTAs inline",
      "status": "todo",
      "page": "/blog/*",
      "priority": "moyenne",
      "notes": ""
    },
    {
      "id": "blog-articles-stubs",
      "category": "Content Marketing",
      "task": "5 articles de blog (stubs .md)",
      "description": "Fichiers .md avec frontmatter prêts à rédiger",
      "status": "todo",
      "page": "/blog/*",
      "priority": "basse",
      "notes": "RGPD, Note SOAP, Comparatif, Cloud vs Local, CR réunion"
    },
    {
      "id": "nav-cta-sticky",
      "category": "CRO (Conversion)",
      "task": "CTA sticky dans la navbar",
      "description": "Bouton Essayer toujours visible dans le header",
      "status": "todo",
      "page": "Global",
      "priority": "haute",
      "notes": ""
    },
    {
      "id": "analytics-setup",
      "category": "Analytics",
      "task": "Analytics RGPD-compliant (Matomo/Plausible)",
      "description": "Setup du tracking sans cookies tiers",
      "status": "todo",
      "page": "Global",
      "priority": "moyenne",
      "notes": "Préférer Plausible (léger) ou Matomo (self-hosted)"
    },
    {
      "id": "tco-calculator",
      "category": "CRO (Conversion)",
      "task": "Calculateur TCO Cloud vs On-Premise",
      "description": "Outil interactif comparant le coût total de possession sur 1-3-5 ans",
      "status": "todo",
      "page": "/calculateur-tco",
      "priority": "haute",
      "notes": "Hypothèses : cloud 0.12€/min, licence 12K€/an, hardware 7.5K€ amorti 5 ans"
    },
    {
      "id": "rag-knowledge-base",
      "category": "Fonctionnalités Stratégiques",
      "task": "RAG Local — Intelligence Collective (préparation v8)",
      "description": "Interface chat pour interroger toutes les transcriptions + doc architecture",
      "status": "todo",
      "page": "/knowledge-base",
      "priority": "haute",
      "notes": "ChromaDB/FAISS + sentence-transformers + Ollama, 100% local"
    },
    {
      "id": "page-integrations",
      "category": "Fonctionnalités Stratégiques",
      "task": "Page Intégrations avec système de vote",
      "description": "Présentation des intégrations actuelles et planifiées (Nextcloud, Rocket.Chat, Matrix, Notion)",
      "status": "todo",
      "page": "/integrations",
      "priority": "moyenne",
      "notes": "Système de vote pour prioriser le développement"
    },
    {
      "id": "page-partenaires",
      "category": "Acquisition",
      "task": "Page Programme Partenaires / Affiliation",
      "description": "Landing page pour consultants métier (20% commission) et intégrateurs IT (30% marge)",
      "status": "todo",
      "page": "/partenaires",
      "priority": "moyenne",
      "notes": "Formulaire d'inscription + dashboard partenaire prévu"
    },
    {
      "id": "geo-paris",
      "category": "SEO Géographique",
      "task": "Landing page Paris & Île-de-France",
      "description": "Page géo-ciblée pour les entreprises parisiennes (La Défense, cabinets, institutions)",
      "status": "todo",
      "page": "/transcription-paris-ile-de-france",
      "priority": "moyenne",
      "notes": "Schema LocalBusiness, pôle Systematic Paris-Region"
    },
    {
      "id": "geo-lyon",
      "category": "SEO Géographique",
      "task": "Landing page Lyon & Auvergne-Rhône-Alpes",
      "description": "Page géo-ciblée pour le secteur santé (Biopôle) et industrie",
      "status": "todo",
      "page": "/transcription-lyon-auvergne-rhone-alpes",
      "priority": "basse",
      "notes": "Schema LocalBusiness"
    },
    {
      "id": "geo-toulouse",
      "category": "SEO Géographique",
      "task": "Landing page Toulouse / Aerospace Valley",
      "description": "Page géo-ciblée pour l'aéronautique et la défense",
      "status": "todo",
      "page": "/transcription-toulouse-aerospace",
      "priority": "basse",
      "notes": "Schema LocalBusiness, argument souveraineté renforcé"
    },
    {
      "id": "geo-lille",
      "category": "SEO Géographique",
      "task": "Landing page Lille / Euratechnologies",
      "description": "Page géo-ciblée pour le numérique et la legaltech",
      "status": "todo",
      "page": "/transcription-lille-euratechnologies",
      "priority": "basse",
      "notes": "Schema LocalBusiness"
    },
    {
      "id": "geo-sophia",
      "category": "SEO Géographique",
      "task": "Landing page Sophia Antipolis",
      "description": "Page géo-ciblée pour la R&D, startups IA et télécoms",
      "status": "todo",
      "page": "/transcription-sophia-antipolis",
      "priority": "basse",
      "notes": "Schema LocalBusiness"
    },
    {
      "id": "page-conformite",
      "category": "Confiance & Certifications",
      "task": "Page Conformité (RGPD, HDS, SecNumCloud, CLOUD Act)",
      "description": "Page détaillant la conformité réglementaire et l'alignement avec les certifications",
      "status": "todo",
      "page": "/conformite",
      "priority": "haute",
      "notes": "RGPD art. 44-49, HDS 2.0, SecNumCloud 3.2, CLOUD Act, IA Responsable"
    },
    {
      "id": "silo-technique",
      "category": "Content Marketing",
      "task": "Silo sémantique Technique / DevOps",
      "description": "Articles ciblant les développeurs et intégrateurs (faster-whisper Docker, FastAPI API, Ollama local)",
      "status": "todo",
      "page": "/blog/*",
      "priority": "basse",
      "notes": "Cible : prescripteurs internes en entreprise"
    }
  ]
}
```

**Section 2 : Stratégie SEO intégrée**

Affiche un résumé visuel de la stratégie avec :

- **Clusters de contenu** : carte visuelle des 6 clusters (Médical, Juridique, Business, Éducation, Souveraineté, Technique/DevOps) avec les pages piliers et articles satellites
- **Mots-clés cibles** : tableau des mots-clés prioritaires par cluster avec volume estimé et intention (transactionnel/informationnel/comparatif)
- **Funnel de conversion** : visualisation du funnel (Acquisition → Activation → Conversion → Rétention → Expansion) avec les actions par segment
- **Ciblage géographique** : carte de France interactive montrant les 5 pôles d'excellence ciblés avec statut des landing pages
- **Certifications** : statut d'alignement avec HDS 2.0, SecNumCloud 3.2, RGPD et IA Responsable

**Section 3 : Métriques (si analytics configuré)**

- Pages les plus visitées
- Taux de rebond par page verticale
- Conversions par source
- Minutes transcrites par plan

**Composant principal `SEOStrategy.tsx` :**

```typescript
// Structure du composant
const SEOStrategy = () => {
  const [checklist, setChecklist] = useState(seoChecklist);
  const [activeTab, setActiveTab] = useState('checklist');

  // Calculer les stats
  const totalTasks = checklist.length;
  const doneTasks = checklist.filter(t => t.status === 'done').length;
  const inProgressTasks = checklist.filter(t => t.status === 'in-progress').length;
  const todoTasks = checklist.filter(t => t.status === 'todo').length;
  const progress = Math.round((doneTasks / totalTasks) * 100);

  return (
    <div>
      {/* Header avec progress bar globale */}
      <h1>SEO & Stratégie de Conversion</h1>
      <ProgressBar value={progress} />
      <Stats done={doneTasks} inProgress={inProgressTasks} todo={todoTasks} />

      {/* Tabs */}
      <Tabs active={activeTab} onChange={setActiveTab}>
        <Tab id="checklist" label="Checklist SEO" />
        <Tab id="strategy" label="Stratégie & Clusters" />
        <Tab id="keywords" label="Mots-clés" />
        <Tab id="funnel" label="Funnel de Conversion" />
        <Tab id="metrics" label="Métriques" />
      </Tabs>

      {/* Contenu conditionnel */}
      {activeTab === 'checklist' && <ChecklistTable data={checklist} />}
      {activeTab === 'strategy' && <StrategyMap />}
      {activeTab === 'keywords' && <KeywordsTable />}
      {activeTab === 'funnel' && <ConversionFunnel />}
      {activeTab === 'metrics' && <MetricsDashboard />}
    </div>
  );
};
```

L'admin peut :
- Filtrer la checklist par catégorie et par statut
- Cliquer sur une tâche pour voir les détails et les notes
- Basculer le statut des tâches (todo → in-progress → done)
- Voir le pourcentage de progression global et par catégorie

---

## Phase 6 — GEO (Generative Engine Optimization)

### 6.1 Contenu optimisé pour les IA génératives

Applique ces principes sur TOUTES les pages publiques :

- **Réponses directes en début de section** : chaque section commence par une phrase qui répond directement à une question potentielle
- **Données factuelles et chiffrées** : intégrer les chiffres clés (12 langues, 5 profils, 9 analyses, dès 3€, 100% local)
- **Structure sémantique claire** : H1 > H2 > H3, listes à puces, tableaux — les LLM extraient mieux le contenu bien structuré
- **Entités nommées** : mentionner explicitement "Whisper", "RGPD", "CLOUD Act", "Docker", "faster-whisper" — ces termes sont des signaux forts pour les LLM
- **Freshness signals** : date de mise à jour visible sur chaque page, schema dateModified

### 6.2 Pages "Citation-Ready Assets"

Crée des pages conçues pour être citées par les moteurs IA :

- `/glossaire-transcription` → Glossaire technique des termes de transcription (Whisper, VAD, diarisation, WER, etc.)
- `/guide-rgpd-transcription` → Guide de référence RGPD pour la transcription audio

---

## Phase 7 — Fonctionnalités Stratégiques & Écosystème Souverain

### 7.1 RAG Local — "Intelligence Collective" (Préparation v8)

Crée les bases d'une fonctionnalité de RAG (Retrieval-Augmented Generation) local permettant d'interroger l'ensemble des transcriptions passées d'un utilisateur comme une base de connaissances.

**Composant frontend :** `src/components/KnowledgeBase/KnowledgeChat.tsx`
- Interface de chat similaire au "Chat avec transcription" existant, mais interrogeant TOUTES les transcriptions de l'utilisateur
- Exemples de questions suggérées : "Qu'a-t-on décidé sur le projet X ?", "Résume toutes les consultations du patient Y", "Quels engagements ont été pris en réunion ce mois-ci ?"
- Réponses avec citations et liens vers les transcriptions sources
- Indicateur visuel montrant quelles transcriptions ont été consultées pour la réponse

**Architecture backend prévue (documenter dans un fichier `docs/RAG_ARCHITECTURE.md`) :**
```markdown
# Architecture RAG Local ClearRecap

## Stack prévue
- Embeddings : sentence-transformers (all-MiniLM-L6-v2 ou camembert-base pour le français)
- Vector store : ChromaDB (local, SQLite-backed) ou FAISS
- LLM : Ollama (mistral-nemo) — déjà en place
- Chunking : par segment de transcription (avec timestamps)

## Pipeline
1. À chaque nouvelle transcription : chunking → embedding → stockage dans ChromaDB
2. Question utilisateur → embedding de la query → recherche vectorielle top-k
3. Contexte récupéré + question → prompt LLM → réponse avec citations
4. Citations = liens cliquables vers le segment source dans la transcription originale

## Contraintes
- 100% local (ChromaDB + sentence-transformers tournent en local)
- Isolation par utilisateur (chaque user a sa propre collection)
- Performance : <3s pour une recherche sur 1000 transcriptions
```

**Page admin :** Ajouter un onglet "Base de connaissances" dans le dashboard admin avec :
- Nombre de transcriptions indexées par utilisateur
- Taille de la base vectorielle
- Statut de l'indexation

### 7.2 Intégrations Écosystème Souverain

Crée une page `/integrations` → `src/pages/Integrations.tsx` présentant les intégrations existantes et planifiées :

**Intégrations actuelles :**
- Export PPTX, SRT, VTT, JSON, MD, PDF
- API REST (FastAPI)
- Docker Compose

**Intégrations planifiées (afficher comme "Bientôt disponible" avec possibilité de voter) :**
- **Nextcloud** : synchronisation automatique des fichiers audio depuis Nextcloud → transcription → résultat renvoyé dans Nextcloud
- **Rocket.Chat / Matrix** : bot qui transcrit les messages vocaux et les appels
- **Mattermost** : intégration webhook pour les notifications de transcription terminée
- **Notion** : export direct des analyses vers une page Notion
- **Slack/Teams** : webhook de notification (pour les entreprises mixtes)

**Composant de vote :** `src/components/Integrations/VoteIntegration.tsx`
- Chaque intégration a un bouton "Je veux cette intégration" (vote anonyme ou connecté)
- Compteur de votes visible
- Les votes sont stockés en SQLite et visibles dans le dashboard admin
- Permet de prioriser le développement selon la demande réelle

### 7.3 Programme Affiliation / Partenaires

Crée une page `/partenaires` → `src/pages/Partners.tsx` destinée aux consultants métier et intégrateurs IT :

**Structure de la page :**

1. **Hero** : "Devenez Partenaire ClearRecap — Recommandez la transcription souveraine à vos clients"
2. **Deux profils partenaires :**
   - **Consultant métier** (santé, juridique, éducation, business) : commission récurrente de 20% sur chaque client référé pendant 12 mois
   - **Intégrateur IT / ESN** : marge revendeur de 30% sur les installations on-premise + certification "ClearRecap Certified Deployer"
3. **Avantages partenaires :**
   - Accès à un dashboard partenaire dédié (suivi des commissions, clients référés)
   - Kit marketing (présentations, fiches produit par profil vertical)
   - Support technique prioritaire
   - Formation gratuite à l'installation et à l'utilisation avancée
4. **Formulaire d'inscription partenaire** (nom, entreprise, secteur, type de partenariat)
5. **Section témoignages partenaires** (placeholder)

### 7.4 Pages de Ciblage Géographique (Pôles d'Excellence)

Crée des landing pages géo-ciblées pour les principaux pôles économiques français :

- `/transcription-paris-ile-de-france` → `src/pages/geo/Paris.tsx`
- `/transcription-lyon-auvergne-rhone-alpes` → `src/pages/geo/Lyon.tsx`
- `/transcription-toulouse-aerospace` → `src/pages/geo/Toulouse.tsx`
- `/transcription-lille-euratechnologies` → `src/pages/geo/Lille.tsx`
- `/transcription-sophia-antipolis` → `src/pages/geo/SophiaAntipolis.tsx`

**Structure de chaque page géo :**

1. **Hero géo-contextualisé** : "Transcription Audio Souveraine à [Ville] — Installation On-Premise pour les Entreprises [Région]"
2. **Section écosystème local** : mention des pôles de compétitivité locaux, secteurs dominants, besoins spécifiques
   - Paris : sièges sociaux, cabinets d'avocats, institutions publiques, La Défense
   - Lyon : Biopôle de Lyon, santé, industrie pharma
   - Toulouse : Aerospace Valley, défense, aéronautique, souveraineté
   - Lille : Euratechnologies, legaltech, numérique
   - Sophia Antipolis : R&D, startups IA, télécoms
3. **Argument proximité** : "Installation et support sur site par nos partenaires intégrateurs [Région]"
4. **CTA local** : "Demander une démonstration à [Ville]"
5. **Schema markup LocalBusiness** pour chaque page

### 7.5 Section Certifications & Conformité

Crée une page `/conformite` → `src/pages/Compliance.tsx` :

**Contenu :**
1. **RGPD — Conformité par design** : explication de pourquoi le 100% local élimine les problèmes de transfert international (articles 44-49 RGPD)
2. **HDS (Hébergement de Données de Santé)** : page expliquant comment ClearRecap on-premise s'aligne avec les exigences HDS 2.0. Mention que la certification HDS concerne l'hébergeur (l'infrastructure du client) et non le logiciel lui-même, mais que ClearRecap facilite la conformité.
3. **SecNumCloud / ANSSI** : explication de l'alignement avec les principes SecNumCloud 3.2 pour les déploiements on-premise dans les environnements sensibles (OIV, OSE)
4. **CLOUD Act** : section expliquant les risques du CLOUD Act américain pour les solutions cloud US et pourquoi le local élimine ce risque
5. **IA Responsable** : engagement sur la transparence des modèles utilisés (Whisper open-source, Mistral-Nemo open-weight), empreinte carbone réduite par le traitement local

**Schema markup** : `Article` avec `about: "RGPD"` et FAQ intégrée


---

## Workflow d'Exécution

Exécute les phases dans l'ordre (1 → 2 → 3 → 4 → 5 → 6 → 7). Pour chaque phase :

1. **Lis** les fichiers existants du projet pour comprendre l'architecture actuelle
2. **Planifie** les modifications nécessaires
3. **Implémente** les changements
4. **Vérifie** que le build compile (`npm run build`)
5. **Met à jour** le fichier `src/data/seo-checklist.json` en passant les tâches complétées à `"status": "done"`

À la fin de CHAQUE phase, fais un commit avec un message descriptif :
```
git add -A && git commit -m "Phase X: [description]"
```

---

## Préférences

- Préférer les composants fonctionnels React avec hooks
- Utiliser Tailwind CSS pour tout le styling (pas de CSS modules)
- Animations avec Framer Motion quand pertinent
- Tous les textes en français
- Code propre, typé (TypeScript strict), pas de `any`
- Composants réutilisables et bien découpés
- Accessibilité : aria-labels, navigation clavier, contraste suffisant
