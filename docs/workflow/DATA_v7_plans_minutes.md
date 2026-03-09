# Data / Analytics — Mission v7_plans_minutes

## 1. Metriques cles a tracer

| Metrique | Description | Source | Frequence |
|----------|-------------|--------|-----------|
| **MRR** | Monthly Recurring Revenue | UserSubscription | Quotidien |
| **Minutes consommees** | Total minutes transcrites | UsageLog | Temps reel |
| **Taux de conversion** | Gratuit → Payant | UserSubscription | Hebdo |
| **Churn rate** | Abonnements annules / total | UserSubscription | Mensuel |
| **ARPU** | Revenu moyen par utilisateur | Subscriptions + Oneshot | Mensuel |
| **Minutes/user/mois** | Usage moyen par utilisateur | UsageLog | Mensuel |
| **One-shot volume** | Nombre et CA one-shot | OneshotOrder | Quotidien |
| **Profil popularity** | Repartition par profil metier | UsageLog | Hebdo |
| **Pack extra sales** | Volume packs supplementaires | Transactions | Quotidien |
| **Quota hit rate** | % users atteignant 75%/90%/100% | Alerts | Mensuel |

## 2. Schema de tables analytiques

### Table : daily_metrics (aggregation quotidienne)
```sql
CREATE TABLE daily_metrics (
    date DATE PRIMARY KEY,
    total_users INT,
    active_users INT,           -- ont transcrit au moins 1 fichier
    new_signups INT,
    total_minutes_consumed INT,
    plan_minutes_consumed INT,
    extra_minutes_consumed INT,
    oneshot_minutes_consumed INT,
    mrr_cents INT,              -- sum(plan.price_cents) des abonnes actifs
    oneshot_revenue_cents INT,
    extra_pack_revenue_cents INT,
    total_revenue_cents INT,
    free_users INT,
    basic_users INT,
    pro_users INT,
    team_users INT,
    transcription_count INT,
    avg_duration_minutes REAL
);
```

### Table : user_metrics (par utilisateur, par mois)
```sql
CREATE TABLE user_metrics (
    user_id TEXT,
    month TEXT,                  -- '2026-03'
    plan_id TEXT,
    minutes_consumed INT,
    minutes_quota INT,
    quota_usage_percent REAL,
    hit_75_alert BOOLEAN,
    hit_90_alert BOOLEAN,
    hit_100_blocked BOOLEAN,
    extra_packs_bought INT,
    extra_minutes_bought INT,
    extra_revenue_cents INT,
    oneshot_count INT,
    oneshot_revenue_cents INT,
    transcription_count INT,
    top_profile TEXT,
    PRIMARY KEY (user_id, month)
);
```

### Table : funnel_events
```sql
CREATE TABLE funnel_events (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    event_type TEXT,             -- 'signup', 'first_transcription', 'hit_quota',
                                 -- 'view_plans', 'upgrade', 'buy_pack', 'churn'
    event_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 3. Scripts d'aggregation

### Script quotidien : compute_daily_metrics.py
```python
"""
Calcule les metriques quotidiennes a partir des tables operationnelles.
A executer en cron ou via un endpoint admin.
"""
async def compute_daily_metrics(db, date):
    # Compter les utilisateurs par plan
    plan_counts = await db.execute(
        select(UserSubscription.plan_id, func.count())
        .group_by(UserSubscription.plan_id)
    )

    # Somme des minutes par source
    usage = await db.execute(
        select(
            UsageLog.source,
            func.sum(UsageLog.minutes_charged)
        )
        .where(func.date(UsageLog.created_at) == date)
        .group_by(UsageLog.source)
    )

    # MRR = somme des prix des plans actifs
    mrr = await db.execute(
        select(func.sum(Plan.price_cents))
        .join(UserSubscription)
        .where(UserSubscription.status == 'active')
    )

    # Inserer dans daily_metrics
    await db.execute(insert(DailyMetrics).values(...))
```

### Script mensuel : compute_user_metrics.py
```python
"""
Calcule les metriques par utilisateur par mois.
"""
async def compute_user_metrics(db, month):
    users = await db.execute(select(UserSubscription))
    for user_sub in users:
        usage_logs = await db.execute(
            select(UsageLog)
            .where(UsageLog.user_id == user_sub.user_id)
            .where(func.strftime('%Y-%m', UsageLog.created_at) == month)
        )
        # Aggreger et inserer
```

## 4. Dashboard interne (admin)

Metriques a afficher dans un dashboard admin (extension du Streamlit existant ou page admin dans l'app) :

### Vue d'ensemble
- MRR actuel et evolution 30j
- Users actifs / total
- Minutes consommees aujourd'hui / ce mois

### Repartition
- Camembert : users par plan
- Barres : minutes par profil
- Courbe : minutes/jour sur 30j

### Funnel
- Signups → Premier fichier → Hit quota → Upgrade
- Taux de conversion a chaque etape

### Alertes business
- Users a 90%+ de quota (candidats upgrade)
- Users inactifs >14j (risque churn)
- One-shot recurrents (candidats abonnement)

## 5. Cout estime par transcription

Pour le calcul de marge, le cout reel par minute transcrite :

| Composant | Cout estime/min | Notes |
|-----------|----------------|-------|
| GPU (RTX 5090) | ~0.001 EUR | Amortissement + electricite |
| Stockage | ~0.0001 EUR | Audio + DB |
| LLM (Ollama local) | ~0.002 EUR | Inference GPU |
| **Total** | **~0.003 EUR/min** | Cout marginal |

Avec un prix de vente moyen de ~0.025 EUR/min (plan Pro), la marge brute est d'environ **88%**.
Le one-shot a ~0.07-0.10 EUR/min, marge encore plus elevee.

## 6. Implementation

| Priorite | Item | Effort |
|----------|------|--------|
| P0 | Endpoint /api/usage/summary (existe) | Fait |
| P0 | UsageLog avec chaque transcription (existe) | Fait |
| P1 | Script compute_daily_metrics.py | 2h |
| P1 | Table daily_metrics + migration | 1h |
| P2 | Funnel events tracking | 3h |
| P2 | Dashboard admin Streamlit | 4h |
| P3 | Alertes business automatiques | 2h |
