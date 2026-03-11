# PM — Mission v7_plans_minutes

## 1. Probleme

Les professionnels (PME, artisans, professions liberales) et enseignants ont besoin de transcrire de l'audio (reunions, cours, consultations) mais :
- Les solutions existantes sont trop cheres (Otter.ai Pro 17$/mo) ou trop techniques (API Whisper)
- Pas de solution francophone avec analyse contextuelle (resume, points cles, actions)
- Le modele "tout illimite" ne convient pas aux petits usages (one-shot)

## 2. Proposition de valeur

**VoiceIQ** : transcription audio intelligente locale, avec analyse IA contextuelle, a prix accessible.
- Transcription Whisper locale (pas de cloud, confidentialite)
- Analyse LLM contextuelle (profils metier : business, education, medical, legal)
- Modele hybride : 3 plans mensuels payants + 6 tiers one-shot
- Interface simple, pas besoin de competences techniques

## 3. Personas

### Persona A : Marie, gerant PME (cible principale)
- 42 ans, dirige un cabinet de conseil de 8 personnes
- 3-5 reunions/semaine a transcrire (30-60 min chacune)
- Besoin : comptes-rendus automatiques, points d'action
- Budget : 20-50 EUR/mois
- Pain : perd 2h/semaine a rediger des CR manuellement
- Plan cible : **Pro (49 EUR/mois, 3000 min)**

### Persona B : Thomas, professeur lycee
- 35 ans, prof d'histoire-geo
- Enregistre ses cours pour creer des supports (quiz, flashcards)
- 10-15 heures de cours/semaine
- Besoin : transcription + generation quiz/flashcards automatique
- Budget : 15-30 EUR/mois (budget personnel ou etablissement)
- Plan cible : **Basic (19 EUR/mois, 500 min)** ou **Team via etablissement**

### Persona C : Julie, avocate independante
- 38 ans, avocate en droit des affaires
- Consultations clients a transcrire ponctuellement
- 2-3 consultations/mois de 45-90 min
- Besoin : transcription precise + confidentialite totale
- Budget : ponctuel, pas d'abonnement
- Plan cible : **One-shot (Standard ou Long, 6-9 EUR/session)**

### Persona D : Etudiant / particulier
- Usage occasionnel (1-2 fichiers/mois)
- Decouverte du produit
- Plan cible : **One-shot (des 3 EUR par transcription)**

## 4. Spec fonctionnelle

### 4.1 Plans d'abonnement

| Plan | Prix | Minutes incluses | Prix/min | Features |
|------|------|-----------------|----------|----------|
| Basic (Solo) | 19 EUR/mois | 500/mois | 0.038 EUR | Transcription, resume, points cles, actions, quiz, export PDF/TXT, dictionnaires |
| Pro (PME) | 49 EUR/mois | 3000/mois | 0.016 EUR | + tous les profils, chat IA, export PPTX, batch, priorite P0 |
| Team (Education) | 99 EUR/mois | 10000/mois | 0.0099 EUR | + chapitres, mindmap, flashcards, infographies, API access |

### 4.2 One-shot (sans abonnement)

| Tier | Duree max | Prix | Prix/min | Inclus |
|------|-----------|------|----------|--------|
| Court | 30 min | 3 EUR | 0.10 EUR | Transcription + resume + points cles |
| Standard | 60 min | 6 EUR | 0.10 EUR | Transcription + resume + points cles |
| Long | 90 min | 9 EUR | 0.10 EUR | Transcription + resume + points cles |
| XLong | 120 min | 12 EUR | 0.10 EUR | Transcription + resume + points cles |
| XXLong | 150 min | 15 EUR | 0.10 EUR | Transcription + resume + points cles |
| XXXLong | 180 min | 18 EUR | 0.10 EUR | Transcription + resume + points cles |

### 4.3 Logique de consommation
- 1 minute audio = 1 minute facturee (arrondi au superieur)
- Minutes du plan consommees en priorite
- Reset mensuel des minutes plan
- Alertes a 75% et 90% du quota
- Utilisateur sans abonnement : banniere "Aucun abonnement", alerte bloquante, redirection vers /app/plans
- One-shot fonctionne sans abonnement via le mode Simple

## 5. Acceptance Criteria

### AC-1 : Souscription a un plan
```
Given un utilisateur sur la page Plans
When il selectionne le plan "Pro" et confirme
Then son abonnement passe a Pro
And il dispose de 3000 minutes
And la facturation demarre (stub Stripe)
```

### AC-2 : Consommation de minutes
```
Given un utilisateur Pro avec 150 minutes restantes
When il uploade un fichier audio de 45 minutes
Then 45 minutes sont deduites de son quota plan
And son solde passe a 105 minutes
And un log d'usage est cree
```

### AC-3 : Depassement de quota
```
Given un utilisateur Basic avec 10 minutes restantes
When il uploade un fichier de 30 minutes
Then l'upload est refuse (quota insuffisant)
And une alerte "Quota insuffisant" est affichee avec CTA upgrade
```

### AC-4 : Achat one-shot
```
Given un visiteur sans abonnement
When il choisit le tier Standard pour un fichier de 45 min
Then un order one-shot est cree (6 EUR)
And la transcription est lancee apres paiement (stub)
And l'order est lie a la transcription
```

### AC-5 : Alertes de consommation
```
Given un utilisateur Basic avec 500 minutes
When il atteint 375 minutes consommees (75%)
Then une notification d'alerte est affichee
When il atteint 450 minutes consommees (90%)
Then une notification critique est affichee avec CTA upgrade
```

### AC-6 : Utilisateur sans abonnement
```
Given un nouvel utilisateur apres inscription
When il accede a /app
Then il est redirige vers /app/plans
And la sidebar affiche une banniere "Aucun abonnement" (amber)
And le QuotaAlert affiche "Aucun abonnement actif. Choisissez un plan pour commencer."
```
