# CHANGELOG v7 — Offres & Minutes

## Modele de donnees
- **Table `plans`** : plans d'abonnement (free, basic, pro, team) avec features, limites, prix
- **Table `user_subscriptions`** : abonnement actif, periode, minutes utilisees, minutes extra
- **Table `usage_logs`** : log detaille de chaque transcription (duree, source, profil, modele, temps CPU)
- **Table `oneshot_orders`** : commandes one-shot avec palier et statut de paiement

## Backend — Endpoints v7
- `GET /api/plans` — Liste des plans disponibles
- `GET /api/subscription` — Abonnement actuel avec details plan
- `PUT /api/subscription/plan` — Changer de plan (stub: instantane)
- `GET /api/subscription/minutes` — Verifier minutes disponibles
- `POST /api/subscription/add-minutes` — Acheter minutes supplementaires (stub)
- `GET /api/subscription/extra-packs` — Packs de minutes extra disponibles
- `GET /api/oneshot/tiers` — Paliers one-shot
- `POST /api/oneshot/estimate` — Estimer le prix one-shot
- `POST /api/oneshot/order` — Creer commande one-shot (stub: auto-paye)
- `GET /api/usage/summary` — Resume d'usage periode en cours
- `GET /api/usage/logs` — Logs d'usage detailles

## Backend — Service `subscription_service.py`
- Seed automatique des plans au demarrage
- Gestion abonnement mono-user (user_id="default")
- Renouvellement automatique de periode (reset mensuel des minutes)
- Consommation de minutes : plan d'abord, puis extra, avec logs
- Support one-shot avec 3 paliers (S/M/L)
- Analytics : resume par source, par profil, totaux

## Backend — Metriques internes
- Chaque transcription log automatiquement dans `usage_logs` :
  - Duree audio (secondes)
  - Minutes facturees (ceil)
  - Source : plan / extra / exceeded
  - Type : upload / recording / dictation
  - Profil metier
  - Modele Whisper
  - Temps de traitement CPU
  - Langue detectee

## Frontend
- **Page "Plans & Consommation"** (`/plans`) :
  - Banniere abonnement actuel avec barre de progression
  - Stats : transcriptions, audio total, repartition par source et profil
  - Grille des 4 plans avec changement instantane
  - Packs de recharge minutes extra
  - Info one-shot (paliers S/M/L)
- **Sidebar** : indicateur minutes restantes avec barre de progression coloree
- **Navigation** : lien "Plans & Usage" dans le menu lateral
- Version passee a v7

## Plans definis
| Plan | Prix | Minutes/mois | Cible |
|------|------|-------------|-------|
| Gratuit | 0 EUR | 30 min | Decouverte |
| Basic (Solo) | 19 EUR | 300 min | Freelance, prof |
| Pro (PME) | 49 EUR | 2000 min | TPE/PME, agences |
| Equipe+ | 99 EUR | 5000 min | Ecoles, gros volumes |

## One-Shot
| Palier | Duree max | Prix |
|--------|-----------|------|
| S | 30 min | 3 EUR |
| M | 60 min | 4 EUR |
| L | 90 min | 5 EUR |

## Packs Extra
| Pack | Minutes | Prix |
|------|---------|------|
| S | 100 | 3 EUR |
| M | 500 | 12 EUR |
| L | 2000 | 40 EUR |

## Contraintes respectees
- Flux existants (upload, record, dictate) non casses
- Paiement stub (auto-valide) — pret pour Stripe plus tard
- Mono-utilisateur (user_id="default") — pret pour multi-user
- Metriques collectees automatiquement a chaque transcription
