# Tests End-to-End v7 — VoiceIQ

> Date : 2026-03-07
> Statut : procedures documentees (non executees — v7 pas deploye)

---

## E2E 1 — Abonne PME (Plan Basic, upload fichier)

### Prerequis
- Backend v7 demarre
- Plans seedes
- Aucune transcription precedente

### Procedure

```bash
# 1. Passer au plan Basic
curl -X PUT http://localhost:8002/api/subscription/plan \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "basic"}'
# Attendu: plan_id=basic, minutes_used=0, minutes_included=300

# 2. Verifier le solde initial
curl http://localhost:8002/api/subscription/minutes
# Attendu: {"available": true, "plan_remaining": 300, "extra_remaining": 0, "total_available": 300}

# 3. Uploader un fichier audio de test (60 secondes)
curl -X POST http://localhost:8002/api/upload \
  -F "file=@test_60s.mp3" \
  -F "profile=business" \
  -F "language=fr"
# Attendu: {"id": "...", "status": "pending", ...}
# Sauvegarder le job_id

# 4. Attendre le traitement (polling)
JOB_ID="<job_id>"
curl http://localhost:8002/api/jobs/$JOB_ID
# Attendre status=completed (peut prendre 1-5 min selon GPU/CPU)

# 5. Verifier le solde apres transcription
curl http://localhost:8002/api/subscription/minutes
# Attendu: plan_remaining=299 (1 min deduite = ceil(60/60))

# 6. Verifier le log d'usage
curl http://localhost:8002/api/usage/logs
# Attendu: 1 entree avec:
#   minutes_charged: 1
#   minute_source: "plan"
#   source_type: "file"
#   profile_used: "business"
#   language: "fr"

# 7. Verifier le resume
curl http://localhost:8002/api/usage/summary
# Attendu:
#   total_transcriptions: 1
#   minutes_used: 1
#   minutes_remaining: 299
#   by_source: {"file": 1}
#   by_profile: {"business": 1}
```

### Verification rentabilite

```
Plan Basic : 1900 centimes / 300 minutes = 6.33c/min
Transcription 60s : 1 min consommee → cout reel = 6.33c
Si whisper medium CPU, temps de traitement ~120s pour 60s audio
→ Ratio acceptable pour un usage PME
```

---

## E2E 2 — One-shot (sans abonnement)

### Procedure

```bash
# 1. Estimation pour un fichier de 25 minutes
curl -X POST http://localhost:8002/api/oneshot/estimate \
  -H "Content-Type: application/json" \
  -d '{"duration_seconds": 1500}'
# Attendu: {"tier": "S", "price_cents": 300, "max_duration_minutes": 30, "includes": ["transcription", "summary", "keypoints"]}

# 2. Creer une commande one-shot
curl -X POST http://localhost:8002/api/oneshot/order \
  -H "Content-Type: application/json" \
  -d '{"tier": "S", "duration_seconds": 1500}'
# Attendu: {"id": "...", "tier": "S", "price_cents": 300, "payment_status": "paid", ...}
# Sauvegarder order_id

# 3. Uploader le fichier
curl -X POST http://localhost:8002/api/upload \
  -F "file=@test_25min.mp3" \
  -F "profile=generic"
# Attendu: job cree normalement

# 4. PROBLEME: l'upload consomme des minutes du forfait, pas du one-shot
# Il n'y a aucun lien automatique entre l'ordre one-shot et l'upload
# Le one-shot n'est qu'un "recu" sans integration au pipeline

# 5. Verification : les minutes de l'abonnement sont deduites
curl http://localhost:8002/api/subscription/minutes
# Resultat: minutes deduites du forfait (pas du one-shot)
# → BUG DESIGN: le one-shot ne fonctionne pas comme prevu
```

### Verdict E2E 2
**FAIL** — Le one-shot cree un ordre de paiement mais ne s'integre pas au flux de transcription. L'upload utilise toujours les minutes du forfait.

---

## E2E 3 — Dictee en direct (BUG CONNU)

### Procedure

```bash
# 1. Demarrer une session de dictee
curl -X POST http://localhost:8002/api/dictation/start \
  -H "Content-Type: application/json" \
  -d '{"profile": "generic"}'
# Sauvegarder session_id

# 2. Envoyer un chunk audio (10 secondes)
SESSION_ID="<session_id>"
curl -X POST http://localhost:8002/api/dictation/$SESSION_ID/chunk \
  -F "audio=@chunk_10s.wav"
# Attendu: {"chunk_text": "...", "full_text": "...", "chunk_count": 1}

# 3. Stop la session
curl -X POST http://localhost:8002/api/dictation/$SESSION_ID/stop
# Attendu: status=completed

# 4. Sauvegarder comme transcription
curl -X POST http://localhost:8002/api/dictation/$SESSION_ID/save
# Attendu: transcription_id cree

# 5. Verifier les minutes
curl http://localhost:8002/api/subscription/minutes
# BUG: aucune minute n'a ete deduite
# BUG: aucun UsageLog cree

# 6. Verifier les logs
curl http://localhost:8002/api/usage/logs
# BUG: pas de log pour cette dictee
```

### Verdict E2E 3
**FAIL** — La dictee contourne completement le systeme de minutes. `save_as_transcription()` ne fait aucun appel a `consume_minutes()`.

---

## E2E 4 — Depassement de forfait

### Procedure

```bash
# 1. Mettre le plan Free (30 min)
curl -X PUT http://localhost:8002/api/subscription/plan \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "free"}'

# 2. Simuler 30 uploads de 1 min chacun (pour epuiser le forfait)
# ... (ou un seul fichier de 31 min)

# 3. Upload supplementaire quand forfait epuise
curl -X POST http://localhost:8002/api/upload -F "file=@test_5min.mp3"
# Attendu: upload ACCEPTE (pas de blocage)
# minutes_used depasse minutes_included
# minute_source = "exceeded"
# WARNING dans les logs serveur

# 4. Verifier
curl http://localhost:8002/api/subscription/minutes
# Attendu: available=false, plan_remaining=0, extra=0
```

### Verdict E2E 4
**PASS (design)** — Le depassement est autorise et logue. Pas de blocage hard. C'est un choix de design (pas de surprise pour l'utilisateur) mais devrait etre documente et idealement declencher une notification frontend.

---

## Resume E2E

| Scenario | Verdict | Bug principal |
|----------|---------|---------------|
| E2E 1 — PME upload | **PASS** | - |
| E2E 2 — One-shot | **FAIL** | One-shot non lie au pipeline |
| E2E 3 — Dictee | **FAIL** | consume_minutes non appele |
| E2E 4 — Depassement | **PASS** | Design OK mais pas de notification |
