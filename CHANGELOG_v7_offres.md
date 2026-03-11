# CHANGELOG v7 — Offres & Minutes

## Modele de donnees
- **Table `plans`** : plans d'abonnement (basic, pro, team) avec features, limites, prix
- **Table `user_subscriptions`** : abonnement actif, periode, minutes utilisees
- **Table `usage_logs`** : log detaille de chaque transcription (duree, source, profil, modele, temps CPU)
- **Table `oneshot_orders`** : commandes one-shot avec palier et statut de paiement

## Backend — Endpoints v7
- `GET /api/plans` — Liste des plans disponibles
- `GET /api/subscription` — Abonnement actuel avec details plan
- `PUT /api/subscription/plan` — Changer de plan (stub: instantane)
- `GET /api/subscription/minutes` — Verifier minutes disponibles
- `GET /api/oneshot/tiers` — Paliers one-shot
- `POST /api/oneshot/estimate` — Estimer le prix one-shot
- `POST /api/oneshot/order` — Creer commande one-shot (stub: auto-paye)
- `GET /api/usage/summary` — Resume d'usage periode en cours
- `GET /api/usage/logs` — Logs d'usage detailles

## Backend — Service `subscription_service.py`
- Seed automatique des plans au demarrage
- Gestion abonnement mono-user (user_id="default")
- Renouvellement automatique de periode (reset mensuel des minutes)
- Consommation de minutes : plan d'abord, puis bloque, avec logs
- Support one-shot avec 6 paliers (Court/Standard/Long/XLong/XXLong/XXXLong)
- Analytics : resume par source, par profil, totaux

## Backend — Metriques internes
- Chaque transcription log automatiquement dans `usage_logs` :
  - Duree audio (secondes)
  - Minutes facturees (ceil)
  - Source : plan / exceeded
  - Type : upload / recording / dictation
  - Profil metier
  - Modele Whisper
  - Temps de traitement CPU
  - Langue detectee

## Frontend
- **Page "Plans & Consommation"** (`/plans`) :
  - Banniere abonnement actuel avec barre de progression
  - Stats : transcriptions, audio total, repartition par source et profil
  - Grille des 3 plans avec changement instantane
  - Info one-shot (paliers Court/Standard/Long/XLong/XXLong/XXXLong)
- **Sidebar** : indicateur minutes restantes avec barre de progression coloree
- **Navigation** : lien "Plans & Usage" dans le menu lateral
- Version passee a v7

## Plans definis
| Plan | Prix | Minutes/mois | Cible |
|------|------|-------------|-------|
| Basic (Solo) | 19 EUR | 500 min | Freelance, prof |
| Pro (PME) | 49 EUR | 3000 min | TPE/PME, agences |
| Equipe+ | 99 EUR | 10000 min | Ecoles, gros volumes |

## One-Shot
| Palier | Duree max | Prix |
|--------|-----------|------|
| Court | 30 min | 3 EUR |
| Standard | 60 min | 6 EUR |
| Long | 90 min | 9 EUR |
| XLong | 120 min | 12 EUR |
| XXLong | 150 min | 15 EUR |
| XXXLong | 180 min | 18 EUR |

## Contraintes respectees
- Flux existants (upload, record, dictate) non casses
- Paiement stub (auto-valide) — pret pour Stripe plus tard
- Mono-utilisateur (user_id="default") — pret pour multi-user
- Metriques collectees automatiquement a chaque transcription
