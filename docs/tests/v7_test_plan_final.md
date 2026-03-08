# Plan de tests v7 — VoiceIQ "Offres & Minutes"

> Date : 2026-03-07 | Auditeur : Claude Code (Opus 4.6)
> Methode : lecture de code source + analyse statique + revue logique

---

## 1. Tests backend — Endpoints v7 (par scenario)

### Scenario A — Utilisateur PME avec abonnement

| # | Test | Endpoint | Resultat attendu |
|---|------|----------|-----------------|
| A1 | Lister les 4 plans | `GET /api/plans` | 4 plans (free, basic, pro, team), champs complets |
| A2 | Abo par defaut | `GET /api/subscription` | Abo free cree automatiquement si aucun |
| A3 | Changer vers Basic | `PUT /api/subscription/plan` `{plan_id:"basic"}` | Plan change, minutes_used remis a 0, nouvelle periode 30j |
| A4 | Solde minutes avant usage | `GET /api/subscription/minutes` | available=true, plan_remaining=300, extra=0 |
| A5 | Upload audio 60s + transcription | `POST /api/upload` | Job cree, consume_minutes appele, 1 min deduite |
| A6 | Solde apres usage | `GET /api/subscription/minutes` | plan_remaining=299 |
| A7 | Usage log cree | `GET /api/usage/logs` | 1 entree, minutes_charged=1, source=plan |

### Scenario B — One-shot

| # | Test | Endpoint | Resultat attendu |
|---|------|----------|-----------------|
| B1 | Lister paliers | `GET /api/oneshot/tiers` | 3 paliers S/M/L avec prix et features |
| B2 | Estimation 45min audio | `POST /api/oneshot/estimate` `{duration_seconds:2700}` | tier=M, price=400 |
| B3 | Creer commande | `POST /api/oneshot/order` `{tier:"M"}` | Ordre cree, payment_status=paid (stub) |
| B4 | Estimation >90min | `POST /api/oneshot/estimate` `{duration_seconds:6000}` | tier=L + warning |

### Scenario C — Suivi usage & packs

| # | Test | Endpoint | Resultat attendu |
|---|------|----------|-----------------|
| C1 | Acheter pack M | `POST /api/subscription/add-minutes` `{pack:"M"}` | +500 min, extra_balance augmente |
| C2 | Pack invalide | `POST /api/subscription/add-minutes` `{pack:"XL"}` | 400 Bad Request |
| C3 | Lister packs | `GET /api/subscription/extra-packs` | 3 packs S/M/L |
| C4 | Resume usage | `GET /api/usage/summary` | Stats agregees du mois |
| C5 | Historique | `GET /api/usage/logs` | 50 derniers logs |

**Livrable** : `docs/tests/api_v7_endpoints.md`

---

## 2. Tests logique metier

### 2.1 consume_minutes() — Ordre de deduction

| Cas | Plan restant | Extra | Needed | Source attendue |
|-----|-------------|-------|--------|----------------|
| Normal | 100 | 0 | 5 | `plan` |
| Mix plan+extra | 3 | 10 | 5 | `plan+extra` (3 plan + 2 extra) |
| Extra seul | 0 | 10 | 5 | `extra` |
| Depassement total | 0 | 0 | 5 | `exceeded` (autorise + warning) |
| Depassement partiel | 2 | 1 | 5 | `plan_exceeded` (plan debite de 5) |

### 2.2 seed_plans() — Conformite spec

| Plan | Champ | Spec v7 | Code reel | Conforme ? |
|------|-------|---------|-----------|------------|
| free | max_dictionaries | 3 | **1** | **NON** |
| free | max_workspaces | 1 | 1 | OK |
| basic | max_dictionaries | 10 | **1** | **NON** |
| basic | max_workspaces | 3 | **1** | **NON** |
| pro | max_dictionaries | illimite (-1) | -1 | OK |
| pro | max_workspaces | 10 | **1** | **NON** |
| team | max_dictionaries | illimite (-1) | -1 | OK |
| team | max_workspaces | illimite (-1) | **10** | **NON** |

### 2.3 consume_minutes par mode d'entree

| Mode | Passe par consume_minutes ? | Localisation |
|------|---------------------------|-------------|
| Upload fichier | **OUI** | transcription_service.py:231 |
| Enregistrement micro | **OUI** (envoye a /api/upload) | idem |
| Dictee en direct | **NON** | **BUG** — dictation_service.py ne l'appelle jamais |

### 2.4 Reset mensuel

- Logique reactive dans `get_or_create_subscription()` (lazy reset)
- Verifie `current_period_end < now` → remet `minutes_used=0`
- **Risque** : si l'utilisateur ne visite pas l'app pendant 2 mois, le reset saute un mois (pas grave en mono-user)

### 2.5 Feature gating

| Limite | Definie dans Plan | Appliquee dans le code ? |
|--------|-------------------|-------------------------|
| max_dictionaries | Oui | **NON** — aucun check dans dictionary_service.py |
| max_workspaces | Oui | **NON** — concept workspace pas implemente |
| features (liste) | Oui | **NON** — aucun check avant lancement d'analyse |
| priority_default | Oui | **NON** — pas utilise dans upload |

**Livrable** : `docs/tests/v7_logic_review.md`

---

## 3. Tests E2E — Transcription → Minutes

### E2E 1 — Abonne PME (Plan Basic)

```
1. PUT /api/subscription/plan {plan_id: "basic"}
   → Verifier: plan_id=basic, minutes_used=0, minutes_included=300

2. GET /api/subscription/minutes
   → Verifier: plan_remaining=300, extra=0, available=true

3. POST /api/upload (fichier 60s, profil business, langue fr)
   → Verifier: job cree, status=pending puis completed

4. [Attendre transcription...]

5. GET /api/subscription/minutes
   → Verifier: plan_remaining=299 (ceil(60/60)=1 min deduite)

6. GET /api/usage/logs
   → Verifier: 1 entree, minutes_charged=1, minute_source=plan,
     source_type=file, profile_used=business

7. GET /api/usage/summary
   → Verifier: total_transcriptions=1, by_source.file=1, by_profile.business=1
```

### E2E 2 — One-shot

```
1. POST /api/oneshot/estimate {duration_seconds: 1800}
   → Verifier: tier=S, price_cents=300

2. POST /api/oneshot/order {tier: "S", duration_seconds: 1800}
   → Verifier: order cree, payment_status=paid

3. POST /api/upload (fichier 30min)
   → Verifier: transcription produite

4. NOTE: l'ordre one-shot N'EST PAS lie au job/transcription
   → C'est un BUG: aucun lien automatique entre order et upload
```

### E2E 3 — Dictee (BUG CONNU)

```
1. POST /api/dictation/start {profile: "generic"}
2. POST /api/dictation/{id}/chunk (audio 10s)
3. POST /api/dictation/{id}/stop
4. POST /api/dictation/{id}/save
   → BUG: aucun appel a consume_minutes
   → Minutes non deduites du forfait
   → Aucun UsageLog cree
```

**Livrable** : `docs/tests/v7_e2e_flows.md`

---

## 4. Tests frontend v7

| Composant | Test | Resultat |
|-----------|------|----------|
| PlansUsage.tsx | Loading state | OK — spinner affiche |
| PlansUsage.tsx | Plan actuel affiche | OK — banner gradient + nom + periode |
| PlansUsage.tsx | Minutes incluses/utilisees/restantes | OK — progress bar + chiffres |
| PlansUsage.tsx | Minutes extra affichees | OK — badge conditionnel |
| PlansUsage.tsx | Changement plan | OK — bouton + appel API + refresh |
| PlansUsage.tsx | Achat pack | OK — bouton + appel API + refresh |
| PlansUsage.tsx | Erreur API catch | **FAIBLE** — catch vide `catch {}` (pas de feedback user) |
| PlansUsage.tsx | One-shot section | OK — 3 paliers affiches (mais hardcodes, pas depuis API) |
| Upload.tsx | Language selector | OK — 12 langues, envoye dans FormData |
| App.tsx | Sidebar minutes | OK — progress bar + couleur |
| App.tsx | Route /plans | OK — navlink + composant |
| About.tsx | Features v7 | OK — 6 features listees, version 7.0.0 |
| NewEntry page | Solde minutes visible | **NON** — pas d'indicateur de minutes restantes |
| PlansUsage.tsx | Separation visuelle abo vs one-shot | OK — sections distinctes |

---

## 5. Coherence spec/code & securite

### 5.1 Alignement modeles

| Champ | Plan model | PlanOut schema | Spec | OK ? |
|-------|-----------|---------------|------|------|
| id | String PK | str | free/basic/pro/team | OK |
| price_cents | Integer | int | 0/1900/4900/9900 | OK |
| minutes_included | Integer | int | 30/300/2000/5000 | OK |
| features | JSON | list | [...] | OK |
| max_dictionaries | Integer | int | 3/10/-1/-1 | **ECART** (voir 2.2) |
| max_workspaces | Integer | int | 1/3/10/-1 | **ECART** (voir 2.2) |

### 5.2 Securite

| Point | Statut | Detail |
|-------|--------|--------|
| Validation plan_id | OK | ValueError si plan inconnu |
| Validation pack | OK | ValueError si pack inconnu |
| Validation tier | OK | ValueError si tier inconnu |
| Validation duration_seconds | OK | 400 si <= 0 |
| Auth sur endpoints | **ABSENT** | Aucune authentification — tout est public |
| Injection SQL | OK | SQLAlchemy ORM, pas de raw SQL |
| add-minutes sans paiement | **RISQUE** | N'importe qui peut ajouter des minutes gratuitement |
| Rate limiting | **ABSENT** | Pas de protection contre l'abus |

---

## 6. Bugs identifies

| ID | Severite | Titre | Fichier | Ligne |
|----|----------|-------|---------|-------|
| BUG-V7-001 | **CRITIQUE** | Dictee ne consomme pas de minutes | dictation_service.py:131 | save_as_transcription() |
| BUG-V7-002 | **MAJEUR** | max_dictionaries/max_workspaces incorrects dans SEED_PLANS | subscription_service.py:16-78 | 5 valeurs fausses |
| BUG-V7-003 | **MAJEUR** | Feature gating non implemente | - | Aucun check nulle part |
| BUG-V7-004 | **MOYEN** | One-shot non lie au flow transcription | main.py | Pas de lien order↔job |
| BUG-V7-005 | **MOYEN** | Erreurs frontend silencieuses | PlansUsage.tsx:32,44 | `catch {}` vide |
| BUG-V7-006 | **MINEUR** | Page Nouveau sans indicateur minutes | NewEntry.tsx | - |
| BUG-V7-007 | **MINEUR** | Paliers one-shot hardcodes dans PlansUsage | PlansUsage.tsx:263 | Pas depuis API |
