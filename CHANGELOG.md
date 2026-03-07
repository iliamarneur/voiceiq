# Changelog

## v6.0 "Multi-Entrees"

### Ecran "Nouveau" unifie
- **Page `/new`** proposant 3 modes d'entree : Fichier, Enregistrer, Dicter
- Selection du profil metier avant de lancer le mode choisi
- Pre-selection du profil par defaut via les preferences utilisateur

### Mode "Enregistrer" (dictaphone)
- **Page `/record`** avec bouton Start/Stop et indicateur de niveau audio
- Capture via `getUserMedia` + `MediaRecorder` (format WebM/Opus)
- Reecoute de l'enregistrement avant envoi
- Envoi au pipeline standard `POST /api/upload` (meme flux qu'un fichier)
- Pas de logique metier specifique : c'est juste une autre facon de fournir un fichier

### Mode "Dicter en direct" (live dictation)
- **Page `/dictate`** avec bouton Start/Pause/Stop et indicateur micro
- Zone de texte remplie au fur et a mesure par blocs de ~4 secondes
- Choix du profil metier (pre-selectionne sur defaut utilisateur)
- Actions : Copier le texte, Sauvegarder comme transcription avec analyses
- **Endpoints backend** :
  - `POST /api/dictation/start` : cree une session de dictee
  - `POST /api/dictation/{id}/chunk` : transcrit un chunk audio (Whisper)
  - `POST /api/dictation/{id}/pause` / `resume` : pause/reprise
  - `POST /api/dictation/{id}/stop` : finalise la session
  - `POST /api/dictation/{id}/save` : cree une Transcription + Job + lance les analyses

### Pipeline backend commun
- Le mode Enregistrer reutilise `POST /api/upload` tel quel
- Le mode Dictee utilise un pipeline chunk specifique mais peut finaliser en Transcription standard
- Nouveau modele `DictationSession` : id, status, profile, language, current_text, chunk_count, total_duration
- Nouveau service `dictation_service.py` : gestion des sessions, transcription par chunks, sauvegarde
- Colonne `source_type` sur Job : "file" | "recording" | "dictation" (retrocompatible)
- Navigation : nouvelle entree "Nouveau" dans la sidebar

### Technique
- 3 nouvelles pages frontend : NewEntry.tsx, Record.tsx, Dictate.tsx
- Nouveau type TypeScript `DictationSession`
- 6 nouveaux endpoints backend
- Table `dictation_sessions` + migration gracieuse
- Version API : 6.0

---

## v5.1 "Confort Transcription"

### Axe 1 : Confiance dans la transcription
- **Indicateur de confiance par segment** : score 0-100 avec code couleur (vert >= 70, orange >= 40, rouge < 40)
- **Score base sur** : confidence Whisper (avg_logprob, no_speech_prob), type audio, longueur segment, overlap
- **Marquage visuel des corrections** : icone PenLine sur les segments corriges
- **Endpoint** : GET `/api/transcriptions/{id}/confidence` retourne scores + micro-tip

### Axe 2 : Fluidite du flux
- **5 Moments cles** : extraction LLM des moments les plus importants avec timestamps et justification
- **Onglet Key Moments** dans TranscriptionView avec navigation vers chaque moment
- **Endpoint** : GET `/api/transcriptions/{id}/key-moments` retourne les moments cles

### Axe 3 : Accompagnement pedagogique
- **Micro-tips contextuels** : bandeau en haut de la transcription avec suggestion selon type audio + profil
- **Tips par type audio** : meeting, lecture, podcast, phone_call, interview avec variantes par profil

### Axe 4 : Personnalisation visible
- **Modele UserPreferences** : summary_detail (short/balanced/detailed), summary_tone (formal/neutral/friendly), default_profile, default_priority, default_preset_id
- **Page Preferences** : configuration complete avec recap presets/dictionnaires
- **Endpoints** : GET/PUT `/api/preferences`
- **Navigation** : nouvelle entree "Preferences" dans la sidebar

### Technique
- Nouveau service `confidence_service.py`
- Nouvelle table `user_preferences` (migration gracieuse)
- Colonne `confidence_scores` sur transcriptions (JSON, cache)
- Version API : 5.1

---

## v5.0 "Qualite & Adaptation Audio"

### Axe 1 : Qualite audio / transcription / diarisation
- **Detection automatique du type audio** : meeting, podcast, lecture, phone_call, interview, conference, dictation — avec parametres VAD adaptes
- **Profils de pre-traitement audio** : sensibilite VAD (low/medium/high) et silence minimum configurables par type d'audio et par profil metier
- **Marquage d'overlap** : les segments en chevauchement sont detectes et marques (`overlap: true`)
- **Labels de locuteurs** : API PUT `/api/transcriptions/{id}/speakers` pour renommer Speaker 1 → "Dr Dupont", avec propagation
- **Champ `audio_type`** stocke sur chaque transcription (detection heuristique post-Whisper)
- **Parametres VAD adaptatifs** : le pipeline Whisper utilise les parametres VAD du preset ou du profil metier

### Axe 2 : Quantite / flux d'upload (batch & files)
- **Priorites P0/P1/P2** sur chaque job : urgent, normal, basse
- **File d'attente** : GET `/api/queue` avec position, priorite, estimation de temps
- **Estimation de temps** par fichier : basee sur taille + nombre d'analyses du profil
- **Changement de priorite** : PUT `/api/jobs/{id}/priority` pour les jobs en attente
- **Retry** : POST `/api/jobs/{id}/retry` pour relancer un job echoue
- **Erreurs isolees** : un fichier echoue ne bloque pas les autres, `error_message` stocke par job
- **Batch ameliore** : estimation temps total, priorite et preset appliques a tout le batch
- **UI batch** : statuts en francais, badges priorite, estimation temps, bouton Retry

### Axe 3 : Adaptation aux utilisateurs (presets & dictionnaires)
- **Dictionnaires personnalises** : CRUD complet `/api/dictionaries` + `/api/dictionaries/{id}/entries`
- **Categories de termes** : nom_propre, acronyme, medical, juridique, technique, general
- **Post-correction transcription** : apres Whisper, les termes du dictionnaire sont substitues (word-boundary matching)
- **Injection dictionnaire dans LLM** : les termes sont injectes dans chaque prompt d'analyse
- **Presets audio** : CRUD `/api/presets` avec profil metier, type audio, sensibilite VAD, dictionnaire associe
- **Selecteur de preset a l'upload** : un preset pre-configure automatiquement le profil et les parametres
- **Apprentissage des corrections (opt-in)** : `ENABLE_CORRECTION_LEARNING=true` pour auto-enrichir le dictionnaire
- **Corrections utilisateur** : POST `/api/transcriptions/{id}/corrections` + GET `/api/corrections`
- **Page Dictionnaires** : creation, recherche, ajout/suppression de termes par categorie
- **Page Presets** : creation/edition/suppression de presets audio avec tous les parametres

### Navigation & Branding
- Sidebar : "v5 - Qualite Audio"
- 2 nouvelles pages : Dictionnaires, Presets
- About : 7 fonctionnalites v5 documentees

### Infrastructure
- 5 nouveaux modeles : SpeakerLabel, UserDictionary, DictionaryEntry, AudioPreset, UserCorrection
- 4 nouvelles colonnes Job (priority, estimated_seconds, error_message, preset_id)
- 1 nouvelle colonne Transcription (audio_type)
- Migration gracieuse (ALTER TABLE avec fallback)
- 3 nouveaux services backend : queue_service, dictionary_service, audio_analysis_service
- 20+ nouveaux endpoints API

### Aucune regression
- Tous les endpoints v4 preserves
- Tous les profils et analyses inchanges
- Tous les exports fonctionnels
- API backward compatible (priority=P1, preset_id=null par defaut)

---

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
