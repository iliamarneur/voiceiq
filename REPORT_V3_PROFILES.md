# VoiceIQ v3.1 — Report: Profils Verticaux

## Nouvelles features implementees

### Infrastructure profils (v3.0 → v3.1)
- [x] Service de chargement des profils (`profile_service.py`) avec cache et hot-reload
- [x] Champ `profile` sur les modeles `Job` et `Transcription` avec migration auto SQLite
- [x] Pipeline d'analyses profile-aware (prompts specifiques par profil)
- [x] API REST complète pour les profils (CRUD + reload)
- [x] Appels LLM non-bloquants via `run_in_executor` (fix critique pour VPS)

### Profil Generique (9 analyses)
- [x] Prompts enrichis avec instructions plus precises
- [x] Tous les rendus visuels existants (v1/v2) preserves
- [x] Tous les exports (JSON, MD, TXT, SRT, VTT, PPTX)

### Profil Business (9 analyses) — v3.1
- [x] Compte-rendu structure (participants, agenda, points, conclusions)
- [x] Actions & Decisions avec owner/deadline/priorite/rationale
- [x] Points cles par domaine business avec impact
- [x] **KPIs & Chiffres** — Vue dediee avec metriques, tendances, cibles (nouveau renderer)
- [x] **Risques & Blocages** — Vue dediee avec severite coloree, mitigation, blocages (nouveau renderer)
- [x] **Email de suivi** — Vue email formatee avec tableau d'actions (nouveau renderer)
- [x] **Carte des parties prenantes** — Vue avec influence, position, dynamiques (nouveau renderer)
- [x] Slides executive (max 8 slides)
- [x] Tableaux de bord (actions/decisions/KPIs)
- [x] 3 templates par defaut (CR Express, Email client, COMEX Summary)

### Profil Education (9 analyses) — v3.1
- [x] Resume pedagogique (niveau, prerequis, objectifs, concepts avec exemples)
- [x] Fiches de revision enrichies (difficulte, mnemotechniques)
- [x] Quiz multi-niveaux (connaissance → analyse, erreurs courantes)
- [x] Carte conceptuelle avec liens inter-concepts
- [x] Glossaire enrichi (exemples, termes associes)
- [x] Chapitrage pedagogique (objectifs, temps d'etude, difficulte)
- [x] Notions essentielles (connexions, applications reelles)
- [x] **Exercices pratiques** — 4-6 exercices progressifs avec solutions (nouveau renderer)
- [x] Support de cours en slides avec notes
- [x] 3 templates par defaut (Fiches Anki, Resume 1 page, Fiche examen)

### Profil Medical (7 analyses) — NOUVEAU v3.1
- [x] **Note SOAP** — Vue dediee avec sections colorees S/O/A/P + indicateur d'urgence (nouveau renderer)
- [x] Resume clinique structure (contexte, motif, anamnese, diagnostic, plan)
- [x] **Redaction PII** — Detection + remplacement + texte anonymise + niveau de risque (nouveau renderer)
- [x] **Prescriptions** — Tableau medicaments/posologie/frequence/duree/voie + allergies (nouveau renderer)
- [x] **Points de vigilance** — Red flags, contre-indications, alertes par severite (nouveau renderer)
- [x] Plan de suivi (RDV, examens, monitoring, criteres d'urgence)
- [x] Points cles cliniques
- [x] 2 templates par defaut (Courrier confrere, Note SOAP express)

### Profil Juridique (7 analyses) — NOUVEAU v3.1
- [x] Synthese juridique (parties, objet, arguments, base legale, issue)
- [x] **Clauses & Stipulations** — Vue par type de clause colore (nouveau renderer)
- [x] **Obligations par partie** — Tableau debiteur/obligation/type/echeance/statut (nouveau renderer)
- [x] **Echeances & Delais** — Timeline avec criticite et base legale (nouveau renderer)
- [x] Risques juridiques (probabilite, impact, mitigation, reference legale)
- [x] **References legales** — Articles, jurisprudence, conventions avec contexte (nouveau renderer)
- [x] Actions & Decisions juridiques
- [x] 2 templates par defaut (Note d'audience, Tableau d'obligations)

### Frontend
- [x] Selecteur de profil visuel sur la page Upload (cartes avec icones)
- [x] Onglets d'analyses dynamiques (adaptes au profil de la transcription)
- [x] Badge profil sur le dashboard et la vue transcription
- [x] Exports dynamiques selon le profil
- [x] **12 nouveaux renderers visuels** dedies aux analyses metier
- [x] Page A propos v3.1 mise a jour avec tous les profils

---

## Bilan par profil

| Profil | Analyses | Renderers dedies | Templates | Exports | Statut |
|--------|----------|------------------|-----------|---------|--------|
| Generique | 9 | 9 (existants) | 0 | 6 | Complet |
| Business | 9 | 4 nouveaux | 3 | 4 | Complet |
| Education | 9 | 1 nouveau | 3 | 4 | Complet |
| Medical | 7 | 5 nouveaux | 2 | 3 | Complet |
| Juridique | 7 | 4 nouveaux | 2 | 3 | Complet |
| **Total** | **41** | **14 nouveaux** | **10** | — | — |

---

## TODO par profil

### Business
- [ ] Suivi des sujets recurrents par client/projet (necessite historique cross-transcriptions)
- [ ] Integration calendrier pour deadlines
- [ ] Export PDF avec mise en page CR pro

### Education
- [ ] Export Anki direct (.apkg)
- [ ] Progression d'apprentissage (suivi cross-sessions)
- [ ] Integration LMS (Moodle, Canvas)

### Medical
- [ ] Validation des prescriptions contre base medicamenteuse
- [ ] Integration HL7/FHIR pour export vers DPI
- [ ] OCR des ordonnances scannees
- [ ] Audit trail complet pour conformite reglementaire
- [ ] Mode dictee temps reel

### Juridique
- [ ] Recherche dans les bases juridiques (Legifrance)
- [ ] Comparaison de contrats
- [ ] Export format judiciaire standard
- [ ] Suivi d'affaire cross-sessions

### Tous profils
- [ ] Export PDF natif avec templates par profil
- [ ] Mode collaboratif (annotations, commentaires)
- [ ] API webhook pour integration externe
- [ ] Profils personnalisables par l'utilisateur (custom profiles via UI)

---

## Limites connues

1. **Qualite des analyses** : dependante du modele LLM utilise. mistral-nemo (12B) en CPU sur VPS est lent et peut produire des resultats moins precis qu'en GPU.
2. **PII Medical** : la detection est heuristique via LLM, pas un outil certifie de de-identification. Ne pas utiliser en production sans validation humaine.
3. **Juridique** : les references legales sont generees par le LLM et peuvent etre inventees. Toujours verifier.
4. **Prescriptions** : les informations medicales sont extraites de la transcription, pas validees medicalement.
5. **Profils statiques** : les profils sont definis en JSON cote serveur. Pas encore d'interface utilisateur pour creer/modifier des profils.
6. **Cross-sessions** : pas de suivi entre transcriptions (pas de projet/dossier client).

---

## Stack technique

- Backend : Python 3.12 + FastAPI + SQLAlchemy 2.0 async
- LLM : Ollama (mistral-nemo:latest) — appels non-bloquants via thread pool
- Transcription : faster-whisper (large-v3 GPU / medium CPU)
- Frontend : React 18 + TypeScript + Tailwind CSS + Framer Motion
- Profils : fichiers JSON dans `backend/app/profiles/`
- Deploy : Docker Compose (nginx reverse proxy)
