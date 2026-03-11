# Revue logique metier v7 — VoiceIQ

> Date : 2026-03-07 | Auditeur : Claude Code

---

## 1. consume_minutes() — Analyse detaillee

**Fichier** : `backend/app/services/subscription_service.py:212-280`

### Algorithme de deduction

```
1. minutes_needed = max(1, ceil(audio_duration_seconds / 60))
2. Recuperer subscription active
3. Calculer plan_remaining = plan.minutes_included - sub.minutes_used

4. SI plan_remaining >= minutes_needed:
     → source = "plan", sub.minutes_used += minutes_needed

5. SINON SI plan_remaining > 0 (partiel):
     → source = "plan_exceeded"
     → sub.minutes_used += minutes_needed  ← Depassement autorise
     → WARNING logged

6. SINON (plan_remaining == 0):
     → source = "exceeded"
     → Blocage : transcription refusee
     → WARNING logged
```

### Problemes identifies

**P1 — Arrondi minimum a 1 minute**

`max(1, ceil(duration/60))` → un fichier de 5 secondes coute 1 minute.
C'est probablement voulu mais non documente dans la spec.

### Appels par mode d'entree

| Mode | Appel consume_minutes | Localisation | Status |
|------|----------------------|-------------|--------|
| Upload fichier (`/api/upload`) | OUI | transcription_service.py:231 | OK |
| Enregistrement micro | OUI (passe par /api/upload) | idem | OK |
| Upload batch (`/api/upload/batch`) | OUI (chaque fichier passe par transcribe_audio) | idem | OK |
| **Dictee en direct** | **NON** | dictation_service.py:131-183 | **BUG CRITIQUE** |
| Retry d'un job echoue | OUI (retranscribe_audio) | main.py:636 | OK mais double-comptage possible |

### BUG : Dictee ne consomme pas de minutes

`save_as_transcription()` dans `dictation_service.py` :
- Cree un Job + Transcription
- Ne fait **pas** de transcription Whisper (le texte vient des chunks deja transcrits)
- N'appelle jamais `consume_minutes()`
- Resultat : la dictee est gratuite quel que soit le plan

**Fix propose** :
```python
# Dans save_as_transcription(), apres la creation du Transcription:
from app.services.subscription_service import consume_minutes
await consume_minutes(
    db,
    audio_duration_seconds=session.total_duration,
    transcription_id=transcription.id,
    job_id=job.id,
    source_type="dictation",
    profile_used=session.profile,
    whisper_model="small",  # dictation model
    language=session.language,
)
```

---

## 2. seed_plans() — Ecarts avec la spec

**Fichier** : `backend/app/services/subscription_service.py:16-78`

| Plan | Champ | Spec v7 | Code | Ecart |
|------|-------|---------|------|-------|
| basic | max_dictionaries | **10** | 1 | -9 |
| basic | max_workspaces | **3** | 1 | -2 |
| pro | max_dictionaries | illimite | -1 | OK |
| pro | max_workspaces | **10** | 1 | -9 |
| team | max_dictionaries | illimite | -1 | OK |
| team | max_workspaces | **illimite (-1)** | 10 | devrait etre -1 |

---

## 3. Feature gating — NON IMPLEMENTE

Les champs `max_dictionaries`, `max_workspaces` et `features` existent dans le modele Plan mais ne sont **jamais verifies** :

| Point de controle attendu | Implemente ? |
|--------------------------|-------------|
| Creation dictionnaire → check max_dictionaries | NON |
| Lancement analyse → check si feature dans plan.features | NON |
| Creation workspace → check max_workspaces | NON (concept non implemente) |
| Choix priorite → forcer plan.priority_default | NON |

---

## 4. Reset mensuel

**Logique** : reactive dans `get_subscription()` L122-128

```python
if sub.current_period_end and datetime.utcnow() > sub.current_period_end:
    sub.current_period_start = datetime.utcnow()
    sub.current_period_end = datetime.utcnow() + timedelta(days=30)
    sub.minutes_used = 0
```

**Comportement** :
- Declenche uniquement quand on accede a l'abo (pas de cron)
- Suffisant en mono-user
- Si l'utilisateur ne se connecte pas pendant 60 jours, il ne "perd" qu'un mois (le reset recree une nouvelle periode de 30j a partir de maintenant)

**Risque faible** en mono-user. A revoir pour multi-user (cron job necessaire).

---

## 5. One-shot — Design gaps

| Point | Statut |
|-------|--------|
| Estimation tier depuis duree | OK |
| Creation commande | OK |
| Lien commande ↔ transcription | **NON** — pas de flow integre |
| Blocage upload si minutes epuisees sans one-shot | **NON** — upload toujours autorise |
| Analyses limitees au tier (6 tiers, Court through XXXLong) | **NON** — toutes les analyses du profil sont lancees |

Le one-shot est un "catalogue" sans integration reelle dans le flow de transcription.
Max oneshot duration : 180 min.
