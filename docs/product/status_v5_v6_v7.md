# Audit des fonctionnalites VoiceIQ — v5 / v6 / v7

> Date : 2026-03-07 | Auditeur : Claude Code

## Resume

| Version | Features listees | Implementees | Manquantes | Taux |
|---------|-----------------|--------------|------------|------|
| v5.0    | 7               | 7            | 0          | 100% |
| v5.1    | 5               | 5            | 0          | 100% |
| v6.0    | 3               | 3            | 0          | 100% |
| v7.0    | 6               | 6            | 0          | 100% |
| **Total** | **21**        | **21**       | **0**      | **100%** |

---

## v5.0 — Qualite & Adaptation Audio

| Feature | Backend | Frontend | Statut |
|---------|---------|----------|--------|
| Detection type audio | `transcription_service.py` detect_audio_type() | Upload.tsx affiche le type | OK |
| Diarisation & Locuteurs | pyannote / marquage segments | Renommage locuteurs dans Detail | OK |
| File d'attente & Priorites | Queue P0/P1/P2 dans job processing | Vue queue temps reel | OK |
| Retry & Robustesse batch | Retry par fichier, batch non-bloquant | Bouton relance par fichier | OK |
| Dictionnaires personnalises | CRUD + post-correction transcription | Page Dictionnaires | OK |
| Presets audio | CRUD presets (profil, type, VAD, dict) | Selecteur preset dans Upload | OK |
| Apprentissage corrections | Correction → enrichissement dictionnaire | Toggle opt-in | OK |

## v5.1 — Confort Transcription

| Feature | Backend | Frontend | Statut |
|---------|---------|----------|--------|
| Confiance par segment | Score 0-100 calcule | Code couleur vert/orange/rouge | OK |
| Marquage corrections | Flag `corrected` sur segment | Badge visuel | OK |
| 5 Moments cles | Extraction LLM top 5 | Navigation timestamps | OK |
| Micro-tips contextuels | Suggestions selon type + profil | Tooltip/banner | OK |
| Preferences utilisateur | API preferences CRUD | Page Settings | OK |

## v6.0 — Multi-Entrees

| Feature | Backend | Frontend | Statut |
|---------|---------|----------|--------|
| Ecran "Nouveau" unifie | Endpoints existants reutilises | Page NewTranscription 3 modes | OK |
| Enregistrement micro | Endpoint /api/upload accepte blob | MediaRecorder + reecoute | OK |
| Dictee en direct | WebSocket /ws/dictate + small model | Composant DictationPanel | OK |

## v7.0 — Offres & Minutes

| Feature | Backend | Frontend | Statut |
|---------|---------|----------|--------|
| Plans & Abonnements | 4 plans (Free/Basic/Pro/Team), modele Plan + UserSubscription | PlansUsage.tsx plan grid | OK |
| Suivi des minutes | consume_minutes() dans transcription, check_minutes_available() | Sidebar progress bar | OK |
| Packs minutes supplementaires | add_extra_minutes(), EXTRA_PACKS config | Section packs dans PlansUsage | OK |
| Commandes one-shot | OneshotOrder model, estimate + create | Section info dans PlansUsage | OK |
| Metriques d'usage | UsageLog model, get_usage_summary/logs | 4 cartes stats dans PlansUsage | OK |
| Selection de langue | `language` param dans upload + transcription | Dropdown 12 langues dans Upload | OK |

### Details v7 — Endpoints API

```
GET  /api/plans                    → liste des plans actifs
GET  /api/subscription             → abonnement courant
POST /api/subscription/plan        → changer de plan
GET  /api/subscription/minutes     → solde minutes
POST /api/subscription/add-minutes → acheter pack
GET  /api/subscription/extra-packs → packs disponibles
GET  /api/oneshot/tiers            → paliers one-shot
POST /api/oneshot/estimate         → estimation cout
POST /api/oneshot/order            → passer commande
GET  /api/usage/summary            → resume usage
GET  /api/usage/logs               → historique detaille
```

### Details v7 — Modeles DB

- `Plan` : id, name, price_cents, minutes_included, features (JSON), max_dictionaries, max_workspaces, priority_default, active
- `UserSubscription` : id, user_id, plan_id (FK), status, period_start/end, minutes_used, extra_minutes_balance
- `UsageLog` : id, user_id, transcription_id (FK), job_id (FK), audio_duration, minutes_charged, minute_source, source_type, profile_used, whisper_model, processing_time, language
- `OneshotOrder` : id, user_id, tier, price_cents, audio_duration, payment_status, transcription_id

### Notes v7

- Paiements en mode **stub** (pas de Stripe reel) — pret pour integration future
- Mode **mono-utilisateur** (user_id="default") — prepare pour multi-user
- Plans seedes automatiquement au demarrage via `seed_plans()`
- Minutes consommees = duree audio arrondie a la minute superieure

---

## Features non listees dans About mais presentes

- Selection du modele LLM (backend `llm_processing/`, frontend model selector)
- WebSocket temps reel pour dictee (`/ws/dictate`)
- Extraction audio depuis video (ffprobe + ffmpeg)

## Recommandations

1. **Deployer v7** sur le serveur (code commite mais pas encore pousse/deploye)
2. **Mettre a jour About.tsx** vers v7.0.0 avec les nouvelles features
3. Preparer l'integration Stripe quand pret pour la monetisation
