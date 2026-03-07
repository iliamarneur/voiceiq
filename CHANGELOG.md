# Changelog

## v4.0 "Pro Metier" — Ameliorations Verticales

### Systeme de prompts v2 (backward compatible)
- Champ `prompt_v2` sur les analyses ameliorees (l'ancien `prompt` est preserve)
- `prompt_version` parameter: "latest" (v4 par defaut) ou "v3" (ancien comportement)
- `profile_service.get_analysis_prompt()` accepte un parametre `version`
- Champ `version: "4.0"` dans chaque profil JSON

### Business
- **CR ameliore** (prompt_v2): detection automatique du type de reunion, section Ambiance/Dynamique, sujets non abordes
- **Actions ameliorees** (prompt_v2): score de clarte (0-100), regroupement par owner, engagements verbaux, priorite P0-P3
- **Template: CR Hebdo Equipe** (`weekly_team_cr`): format 1 page concis
- **Template: CR Negociation** (`negotiation_cr`): positions, accords, concessions

### Education
- **Resume ameliore** (prompt_v2): detection niveau academique (L1→doctorat), prerequis detectes, liens interdisciplinaires
- **Quiz ameliore** (prompt_v2): 3 types (QCM, vrai/faux, trous), 3 niveaux explicites
- **Template: Plan de revision** (`revision_plan`): ordre optimal, temps par concept
- **Template: Fiche enseignant** (`teacher_sheet`): pour l'enseignant, pas l'etudiant

### Medical
- **Note SOAP amelioree** (prompt_v2): score de completude, diagnostics differentiels, signes negatifs pertinents, plan categorise (immediat/court/long terme)
- **Prescriptions ameliorees** (prompt_v2): interactions medicamenteuses, contre-indications contextuelles, DCI + nom commercial
- **Template: Lettre de liaison** (`liaison_letter`): format hospitalier standard
- **Template: Fiche patient** (`patient_sheet`): langage accessible pour le patient

### Juridique
- **Synthese amelioree** (prompt_v2): domaine juridique auto-detecte, enjeux financiers, rapport de force
- **Obligations ameliorees** (prompt_v2): statut d'execution, preuve requise, regroupement par partie
- **Template: Memo juridique** (`legal_memo`): format memo avocat
- **Template: Synthese client** (`client_summary`): langage accessible

### Generique
- **Resume ameliore** (prompt_v2): detection type de contenu, ton general, public cible
- **Points cles ameliores** (prompt_v2): hierarchisation par importance, citations verbatim

### Aucune regression
- Tous les prompts v3.1 preserves (champ `prompt` intact)
- Tous les templates existants preserves (nouveaux = nouveaux IDs)
- 95/95 tests passent
- API backward compatible (defaut = v4, option v3 disponible)

---

## v3.2 "Solid" — Stabilisation & Qualite

### Tests
- Suite de tests pytest complete (6 fichiers, 50+ tests)
- Tests API profiles: validation des 5 profils, analyses, exports
- Tests upload: formats invalides, profils, fallback
- Tests analyses: configs, schemas, golden transcripts
- Tests exports: validation par profil
- LLM-judge: validation des schemas de sortie, regles qualite
- Golden transcripts: 10 scenarios realistes (2 par profil)

### Robustesse backend
- Retry automatique sur appels Ollama (configurable via LLM_MAX_RETRIES)
- Logging structure avec duree de chaque appel LLM
- Tracking succes/erreurs par analyse dans le pipeline
- Timeout configurable (LLM_TIMEOUT_SECONDS)
- MAX_UPLOAD_SIZE configurable via variable d'environnement
- Endpoint /api/health ajoute

### Scripts
- `scripts/test.sh` — lance tous les tests
- `scripts/test-profile.sh <profil>` — tests pour un profil specifique
- `backend/pytest.ini` — configuration pytest avec markers

### Aucune regression
- Tous les endpoints API v3.1 preserves
- Tous les profils et analyses inchanges
- Tous les exports fonctionnels
- Frontend inchange

---

## v3.1 — Profils Verticaux

### Profils
- 5 profils: Generic (9), Business (9), Education (9), Medical (7), Legal (7)
- 41 analyses au total
- 14 renderers visuels dedies
- 10 templates par defaut

### Infrastructure
- Profile service avec cache et hot-reload
- Pipeline profile-aware (prompts specifiques)
- Appels LLM non-bloquants (run_in_executor)
- Migration auto SQLite pour champ profile
- API REST profiles (CRUD + reload)

### Frontend
- Selecteur de profil sur Upload
- Onglets dynamiques par profil
- Badge profil sur Dashboard
- Exports dynamiques par profil

---

## v3.0 — Base Profiles

- Architecture de profils JSON
- Profil generique avec 9 analyses enrichies

---

## v2.1 — Large Files & Video

- Support fichiers 2 Go (ecriture par chunks 8 Mo)
- Formats video (MP4, MKV, AVI, MOV, WMV, WEBM)
- Extraction audio automatique via PyAV

---

## v2.0 — Features Avancees

- Upload par lot
- Chat avec transcription (historique persistant)
- Lecteur audio synchronise
- Chapitrage automatique
- Traduction (5 langues)
- Glossaire technique
- Templates d'instructions
- Traitement non-bloquant (thread pool)

---

## v1.0 — Initial

- Transcription Whisper (large-v3 GPU / medium CPU)
- 9 analyses IA (summary, keypoints, actions, flashcards, quiz, mindmap, slides, infographic, tables)
- Export multi-format (JSON, MD, TXT, SRT, VTT, PPTX)
- Recherche et filtres
- Regeneration d'analyses
