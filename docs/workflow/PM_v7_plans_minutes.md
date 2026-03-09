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
- Modele hybride : plans mensuels + one-shot + packs de minutes
- Interface simple, pas besoin de competences techniques

## 3. Personas

### Persona A : Marie, gerant PME (cible principale)
- 42 ans, dirige un cabinet de conseil de 8 personnes
- 3-5 reunions/semaine a transcrire (30-60 min chacune)
- Besoin : comptes-rendus automatiques, points d'action
- Budget : 20-50 EUR/mois
- Pain : perd 2h/semaine a rediger des CR manuellement
- Plan cible : **Pro (49 EUR/mois, 2000 min)**

### Persona B : Thomas, professeur lycee
- 35 ans, prof d'histoire-geo
- Enregistre ses cours pour creer des supports (quiz, flashcards)
- 10-15 heures de cours/semaine
- Besoin : transcription + generation quiz/flashcards automatique
- Budget : 15-30 EUR/mois (budget personnel ou etablissement)
- Plan cible : **Basic (19 EUR/mois, 300 min)** ou **Team via etablissement**

### Persona C : Julie, avocate independante
- 38 ans, avocate en droit des affaires
- Consultations clients a transcrire ponctuellement
- 2-3 consultations/mois de 45-90 min
- Besoin : transcription precise + confidentialite totale
- Budget : ponctuel, pas d'abonnement
- Plan cible : **One-shot (M ou L, 4-5 EUR/session)**

### Persona D : Etudiant / particulier
- Usage occasionnel (1-2 fichiers/mois)
- Decouverte du produit
- Plan cible : **Gratuit (60 min/mois)** puis upgrade eventuel

## 4. Spec fonctionnelle

### 4.1 Plans d'abonnement

| Plan | Prix | Minutes incluses | Features |
|------|------|-----------------|----------|
| Gratuit | 0 EUR | 60/mois | Transcription, resume, points cles |
| Basic (Solo) | 19 EUR/mois | 300/mois | + actions, quiz, export PDF/TXT, dictionnaires |
| Pro (PME) | 49 EUR/mois | 2000/mois | + tous les profils, chat IA, export PPTX, batch, priorite P0 |
| Team (Education) | 99 EUR/mois | 5000/mois | + chapitres, mindmap, flashcards, infographies, API access |

### 4.2 One-shot (sans abonnement)

| Tier | Duree max | Prix | Inclus |
|------|-----------|------|--------|
| S | 30 min | 3 EUR | Transcription + resume + points cles |
| M | 60 min | 4 EUR | + actions + export |
| L | 90 min | 5 EUR | + quiz + chat |

### 4.3 Packs de minutes supplementaires

| Pack | Minutes | Prix | Prix/min |
|------|---------|------|----------|
| S | 100 | 3 EUR | 0.03 EUR |
| M | 500 | 12 EUR | 0.024 EUR |
| L | 2000 | 40 EUR | 0.02 EUR |

### 4.4 Logique de consommation
- 1 minute audio = 1 minute facturee (arrondi au superieur)
- Minutes du plan consommees en priorite
- Minutes extra consommees quand plan epuise
- Reset mensuel des minutes plan (pas les extras)
- Alertes a 75% et 90% du quota

## 5. Acceptance Criteria

### AC-1 : Souscription a un plan
```
Given un utilisateur sur la page Plans
When il selectionne le plan "Pro" et confirme
Then son abonnement passe a Pro
And il dispose de 2000 minutes
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
And il a 100 minutes extra
Then 10 minutes sont prises du plan
And 20 minutes sont prises des extras
And un log d'usage detaille est cree
```

### AC-4 : Achat one-shot
```
Given un visiteur sans abonnement
When il choisit le tier M pour un fichier de 45 min
Then un order one-shot est cree (4 EUR)
And la transcription est lancee apres paiement (stub)
And l'order est lie a la transcription
```

### AC-5 : Alertes de consommation
```
Given un utilisateur Basic avec 300 minutes
When il atteint 225 minutes consommees (75%)
Then une notification d'alerte est affichee
When il atteint 270 minutes consommees (90%)
Then une notification critique est affichee avec CTA upgrade
```

### AC-6 : Achat pack extra
```
Given un utilisateur Basic
When il achete le pack M (500 min, 12 EUR)
Then 500 minutes extra sont ajoutees a son compte
And elles persistent au-dela du cycle mensuel
```
