# Tests Endpoints API v7 — Resultats

> Methode : revue de code statique (code non deploye sur serveur)
> Date : 2026-03-07

## Scenario A — Utilisateur PME avec abonnement

| # | Endpoint | Methode | Body | Attendu | Resultat code |
|---|----------|---------|------|---------|---------------|
| A1 | `/api/plans` | GET | - | 4 plans actifs | OK — `select(Plan).where(active==1)` |
| A2 | `/api/subscription` | GET | - | Abo free auto-cree | OK — `get_or_create_subscription()` cree si absent |
| A3 | `/api/subscription/plan` | PUT | `{plan_id:"basic"}` | Plan change, minutes=0 | OK — `change_plan()` reset minutes_used + nouvelle periode |
| A4 | `/api/subscription/minutes` | GET | - | available=true, plan_remaining=300 | OK — `check_minutes_available()` calcule correctement |
| A5 | `/api/upload` + transcription | POST | fichier 60s | 1 min deduite | OK — `consume_minutes()` appele dans `transcribe_audio()` L231 |
| A6 | `/api/subscription/minutes` | GET | - | plan_remaining=299 | OK (decoule de A5) |
| A7 | `/api/usage/logs` | GET | - | 1 log avec source=plan | OK — UsageLog cree dans `consume_minutes()` |

## Scenario B — One-shot

| # | Endpoint | Methode | Body | Attendu | Resultat code |
|---|----------|---------|------|---------|---------------|
| B1 | `/api/oneshot/tiers` | GET | - | 3 paliers S/M/L | OK — itere ONESHOT_TIERS dict |
| B2 | `/api/oneshot/estimate` | POST | `{duration_seconds:2700}` | tier=M, 400c | OK — `estimate_oneshot_tier()` cherche premier tier >= 45min |
| B3 | `/api/oneshot/order` | POST | `{tier:"M"}` | order cree, paid | OK — `create_oneshot_order()`, status=paid (stub) |
| B4 | `/api/oneshot/estimate` | POST | `{duration_seconds:6000}` | tier=L + warning | OK — retourne L + champ warning |
| B5 | `/api/oneshot/order` | POST | `{tier:"INVALID"}` | 400 error | OK — ValueError attrape |

## Scenario C — Suivi usage & packs

| # | Endpoint | Methode | Body | Attendu | Resultat code |
|---|----------|---------|------|---------|---------------|
| C1 | `/api/subscription/add-minutes` | POST | `{pack:"M"}` | +500 min extra | OK — `add_extra_minutes()` incremente extra_balance |
| C2 | `/api/subscription/add-minutes` | POST | `{pack:"XL"}` | 400 error | OK — ValueError "Unknown pack" |
| C3 | `/api/subscription/extra-packs` | GET | - | 3 packs | OK — construit depuis EXTRA_PACKS dict |
| C4 | `/api/usage/summary` | GET | - | Stats mois courant | OK — filtre par current_period_start |
| C5 | `/api/usage/logs` | GET | `?limit=50` | Logs recents | OK — order by created_at desc, limit 50 |

## Resume

| Scenario | Tests | Pass | Fail | Bugs |
|----------|-------|------|------|------|
| A — PME abo | 7 | 7 | 0 | - |
| B — One-shot | 5 | 5 | 0 | B3: order non liee a une transcription |
| C — Usage/packs | 5 | 5 | 0 | - |
| **Total** | **17** | **17** | **0** | 1 design gap |

> Note : tous les tests sont en lecture de code. Les endpoints n'ont pas ete appeles reellement car v7 n'est pas deploye sur le serveur.
