# Limitations des tests v7 — VoiceIQ

> Date : 2026-03-07

---

## 1. Ce qui a ete teste

| Type de test | Methode | Couverture |
|-------------|---------|------------|
| Endpoints API (11) | Lecture de code source | 100% des routes v7 |
| Logique consume_minutes | Analyse statique du code | Tous les chemins (5 branches) |
| Modeles DB (4) | Comparaison spec/code | Tous les champs |
| Schemas Pydantic (8) | Comparaison modeles/schemas | Tous les champs |
| Frontend (PlansUsage, About, App) | Lecture du code TSX | Components principaux |
| seed_plans conformite spec | Valeurs hardcodees vs spec | Tous les plans |
| Feature gating | Recherche dans le code | Confirme l'absence |
| Dictee → minutes | Trace du flux complet | Confirme le bug |

---

## 2. Ce qui n'a PAS ete teste

| Element | Raison | Risque |
|---------|--------|--------|
| **Appels HTTP reels** aux endpoints | v7 non deploye sur le serveur | Les endpoints pourraient crasher au runtime (imports manquants, migrations DB) |
| **Transcription reelle** + deduction minutes | Pas de serveur v7 dispo | Le timing de consume_minutes dans le flow async pourrait echouer |
| **Migration DB** (ajout tables v7) | Pas de serveur de test | Les tables Plan/UserSubscription/UsageLog/OneshotOrder pourraient ne pas se creer |
| **Concurrence** sur consume_minutes | Pas de test de charge | 2 transcriptions simultanees pourraient corrompre minutes_used (race condition SQLite) |
| **Gros fichiers** (>1h audio) | Pas de fichier de test | Comportement de ceil() sur 3600s = 60 min OK en theorie |
| **Reset mensuel en conditions reelles** | Impossible a simuler sans manipuler datetime | Le lazy reset pourrait avoir des edge cases |
| **Frontend rendu** | Pas de navigateur/Playwright | Les composants React pourraient crasher si l'API retourne un format inattendu |
| **Integration Stripe future** | Non implemente | Le stub `payment_status="paid"` est-il suffisamment isole ? |
| **Multi-user** | Mono-user seulement | Tous les endpoints utilisent user_id="default" — pas de conflit possible |
| **WebSocket dictation** | Pas teste | `/ws/dictate` non visible dans main.py (peut-etre non implemente) |

---

## 3. Risques residuels

### Critique
- **Race condition sur consume_minutes** : si 2 transcriptions finissent en meme temps, les deux lisent le meme `minutes_used` et l'incrementent sans lock → possible sous-deduction. SQLite mode WAL + asyncio devrait limiter le risque, mais aucun `SELECT FOR UPDATE` n'est utilise.

### Majeur
- **Dictee gratuite** : tant que le bug BUG-V7-001 n'est pas corrige, la dictee est un bypass complet du systeme de minutes. Un utilisateur pourrait dicter 5h sans rien payer.

- **add-minutes sans auth** : n'importe qui (ou un script) peut appeler `POST /api/subscription/add-minutes` pour s'ajouter des minutes gratuitement. En mono-user local ce n'est pas grave, mais sur un serveur public c'est critique.

### Moyen
- **One-shot decoratif** : les ordres one-shot ne sont lies a rien. Un utilisateur pourrait penser qu'il a paye pour une transcription mais ses minutes de forfait sont quand meme deduites.

- **Pas de notification de depassement** : quand `minute_source="exceeded"`, aucun feedback utilisateur (pas d'erreur API, pas de warning frontend). L'utilisateur ne sait pas qu'il depasse.

### Mineur
- **Plans non modifiables** : les plans sont seedes en dur au demarrage. Pas d'endpoint admin pour modifier les prix ou les limites.
- **Pas de webhook** : aucune notification quand un plan est change, quand le forfait est epuise, ou quand un pack est achete.

---

## 4. Niveau de confiance

| Domaine | Confiance | Justification |
|---------|-----------|---------------|
| Endpoints existent et retournent le bon format | **Haute** | Code lu, schemas Pydantic valides |
| Logique de deduction minutes (hors dictee) | **Haute** | Algorithme analyse branche par branche |
| Coherence spec vs code (prix, minutes) | **Haute** | Verifie champ par champ |
| Stabilite runtime | **Moyenne** | Pas de test d'execution reel |
| Securite | **Basse** | Aucune auth, aucun rate limit |
| Frontend fonctionne correctement | **Moyenne** | Code lu mais pas rendu |
| One-shot fonctionne E2E | **Basse** | Design gap identifie |
| Dictee compte les minutes | **Nulle** | Bug confirme |
