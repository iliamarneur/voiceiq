# VoiceIQ v7 — Offres, Minutes & Metriques

## 1. Personas

### 1.1 Independant / Artisan Business
- **Profil** : Plombier, electricien, consultant, coach, avocat solo
- **Besoin** : Transcrire ses RDV clients, appels, devis oraux, comptes-rendus
- **Scenarios** :
  1. Enregistre un RDV client (30 min) → veut un resume + actions a faire
  2. Dicte un devis/memo apres un chantier (5-10 min)
  3. Transcrit un appel fournisseur pour garder une trace ecrite
  4. Enregistre un briefing d'equipe hebdomadaire (45 min)
  5. Dicte des notes apres une visite terrain

### 1.2 Prof / Formateur
- **Profil** : Enseignant, formateur independant, organisme de formation
- **Besoin** : Transcrire cours, webinaires, reunions pedagogiques
- **Scenarios** :
  1. Enregistre un cours magistral (1h30) → resume + points cles pour les eleves
  2. Transcrit un webinaire de formation (1h) → flashcards + quiz
  3. Enregistre une reunion pedagogique (45 min) → actions + decisions
  4. Dicte des commentaires sur des copies (10-20 min par lot)
  5. Transcrit un atelier pratique avec echanges multiples

### 1.3 Particulier One-Shot
- **Profil** : Etudiant, particulier, professionnel ponctuel
- **Besoin** : "J'ai UN fichier a transcrire, je ne veux pas m'abonner"
- **Scenarios** :
  1. Transcrit un entretien d'embauche pour se preparer
  2. Transcrit un podcast ou conference pour revision
  3. Transcrit une reunion associative unique

---

## 2. Offre One-Shot

### Principe
Transcription a l'unite, sans engagement. Upload ou dictee unique.

### Paliers de prix
| Palier | Duree max | Prix | Inclus |
|--------|-----------|------|--------|
| S      | 30 min    | 3 EUR   | Transcription + Resume + Points cles |
| M      | 60 min    | 4 EUR   | Transcription + Resume + Points cles + Actions |
| L      | 90 min    | 5 EUR   | Transcription + Resume + Points cles + Actions + Quiz |

### Fonctionnement
1. L'utilisateur choisit "Transcription one-shot"
2. Upload son fichier ou fait une dictee
3. Le systeme detecte/estime la duree
4. Affichage du prix estime avant traitement
5. Validation du paiement (stub en v7 : auto-valide)
6. Traitement : transcription + analyses du palier
7. Resultat disponible

### Profils disponibles en one-shot
- Reunion business
- Cours / Conference
- General

---

## 3. Plans d'abonnement

### 3.1 Plan Basic (Solo) — 19 EUR/mois
- **Cible** : Freelance, artisan, prof independant
- **Minutes incluses** : 300 min/mois
- **Fonctionnalites** :
  - Transcription + resumes
  - Profils : Reunion business, Cours, Conference, General
  - Dictionnaire personnel (1)
  - Export : TXT, PDF, Word, Markdown
  - Dictee live
  - Chat avec transcript
  - Historique complet

### 3.2 Plan Pro (PME) — 49 EUR/mois
- **Cible** : TPE/PME, cabinet de formation, agences
- **Minutes incluses** : 2000 min/mois
- **Fonctionnalites** :
  - Tout Basic +
  - Dictionnaires illimites
  - Tous les profils metiers
  - Analyses enrichies (tableaux, mindmap, slides, infographie)
  - Presets audio personnalises
  - Templates d'analyse personnalises
  - Export PowerPoint
  - File d'attente avec priorites

### 3.3 Plan Equipe+ (Education) — 99 EUR/mois
- **Cible** : Ecoles, organismes, PME grosses consommatrices
- **Minutes incluses** : 5000 min/mois
- **Fonctionnalites** :
  - Tout Pro +
  - Multi-workspaces
  - Presets partages ("cours magistral", "atelier", "reunion equipe")
  - Traitement prioritaire (P0 par defaut)
  - Support prioritaire
  - Export batch

---

## 4. Minutes supplementaires

### Principe
Un utilisateur peut acheter du temps supplementaire sans changer de plan.

### Tarification
| Pack         | Minutes | Prix   | Prix/min |
|-------------|---------|--------|----------|
| Recharge S  | 100     | 3 EUR     | 0.030 EUR   |
| Recharge M  | 500     | 12 EUR    | 0.024 EUR   |
| Recharge L  | 2000    | 40 EUR    | 0.020 EUR   |

### Logique de consommation
1. Chaque transcription consomme `ceil(duree_audio_minutes)` minutes
2. Les minutes du plan sont consommees en premier
3. Quand les minutes plan sont epuisees, les minutes extra sont utilisees
4. Quand tout est epuise : blocage avec proposition d'achat
5. Les minutes plan se reinitialisent chaque mois (1er du mois)
6. Les minutes extra n'expirent pas

---

## 5. Modele de donnees

### Table `plans`
| Colonne | Type | Description |
|---------|------|-------------|
| id | VARCHAR PK | "free", "oneshot", "basic", "pro", "team" |
| name | VARCHAR | Nom d'affichage |
| price_cents | INTEGER | Prix mensuel en centimes |
| minutes_included | INTEGER | Minutes incluses/mois |
| features | JSON | Liste des features activees |
| max_dictionaries | INTEGER | Limite dictionnaires (-1 = illimite) |
| max_workspaces | INTEGER | Limite workspaces |
| priority_default | VARCHAR | Priorite par defaut (P0/P1/P2) |
| active | BOOLEAN | Plan disponible a la vente |

### Table `user_subscriptions`
| Colonne | Type | Description |
|---------|------|-------------|
| id | VARCHAR PK | UUID |
| user_id | VARCHAR | "default" en mono-user v7 |
| plan_id | VARCHAR FK | Reference vers plans |
| status | VARCHAR | active, cancelled, expired |
| current_period_start | DATETIME | Debut periode en cours |
| current_period_end | DATETIME | Fin periode en cours |
| minutes_used | INTEGER | Minutes consommees ce mois |
| extra_minutes_balance | INTEGER | Solde minutes extra |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### Table `usage_logs`
| Colonne | Type | Description |
|---------|------|-------------|
| id | VARCHAR PK | UUID |
| user_id | VARCHAR | |
| transcription_id | VARCHAR FK | |
| job_id | VARCHAR FK | |
| audio_duration_seconds | FLOAT | Duree audio en secondes |
| minutes_charged | INTEGER | Minutes facturees (ceil) |
| minute_source | VARCHAR | "plan" ou "extra" ou "oneshot" |
| source_type | VARCHAR | upload, recording, dictation |
| profile_used | VARCHAR | Profil metier utilise |
| whisper_model | VARCHAR | base, medium, large-v3 |
| processing_time_seconds | FLOAT | Temps CPU/GPU de traitement |
| language | VARCHAR | Langue detectee |
| created_at | DATETIME | |

### Table `oneshot_orders`
| Colonne | Type | Description |
|---------|------|-------------|
| id | VARCHAR PK | UUID |
| user_id | VARCHAR | |
| tier | VARCHAR | S, M, L |
| price_cents | INTEGER | Prix en centimes |
| audio_duration_seconds | FLOAT | Duree audio |
| payment_status | VARCHAR | pending, paid, failed |
| transcription_id | VARCHAR | Resultat |
| created_at | DATETIME | |

---

## 6. Metriques internes

### Par transcription
- Duree audio (secondes)
- Mode d'entree : upload / enregistrement / dictee
- Profil metier utilise
- Modele ASR utilise (small/medium/large-v3)
- Temps de traitement (secondes)
- Langue
- User / plan / source minutes

### Agregees (calculables depuis usage_logs)
- Minutes totales consommees / jour / mois
- Cout estime par minute (basé sur infra)
- Repartition par profil metier
- Repartition par mode d'entree
- Taux d'utilisation des minutes plan vs extra
- Nombre de transcriptions par plan

---

## 7. Contraintes v7
- Pas de facturation Stripe reelle : paiement stub (auto-valide)
- Mono-utilisateur (user_id = "default") : prepare le multi-user
- Les flux existants (upload, record, dictate) ne sont pas casses
- Le systeme de minutes est fonctionnel (comptage, blocage, affichage)
- Les metriques sont collectees a chaque transcription
