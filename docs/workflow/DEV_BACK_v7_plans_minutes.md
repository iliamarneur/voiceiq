# Backend Developer — Mission v7_plans_minutes

## PARTIE I — ARCHITECTURE v2 (refonte 2026-03-08)

---

## 1. Nouveaux endpoints a implementer

### 1.1 Routes publiques one-shot (no auth)

Ces routes sont des alias des routes existantes, accessibles sans authentification.
Elles permettent le tunnel one-shot simple pour les visiteurs.

```python
# ── Public one-shot routes ──────────────────────────────

@app.get("/api/public/plans")
async def public_plans(db: AsyncSession = Depends(get_db)):
    """Public plans listing (same as /api/plans)."""
    return await get_all_plans(db)


@app.get("/api/public/oneshot/tiers")
async def public_oneshot_tiers():
    """Public one-shot tiers (same as /api/oneshot/tiers)."""
    # Reuse existing handler
    return get_formatted_tiers()


@app.post("/api/public/oneshot/estimate")
async def public_oneshot_estimate(data: OneshotEstimateRequest):
    """Estimate tier for a given audio duration."""
    return estimate_oneshot_tier(data.duration_seconds)


@app.post("/api/public/oneshot/order")
async def public_oneshot_order(data: OneshotOrderRequest, db: AsyncSession = Depends(get_db)):
    """Create a one-shot order (anonymous)."""
    order = await create_oneshot_order(db, data.tier, data.duration_seconds, user_id="anonymous")
    session_token = str(uuid.uuid4())
    # Create anonymous session
    anon = AnonymousSession(
        session_token=session_token,
        oneshot_order_id=order.id,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(anon)
    await db.commit()
    return {
        "order_id": order.id,
        "session_token": session_token,
        "tier": order.tier,
        "price_cents": order.price_cents,
        "payment_status": order.payment_status,
    }


@app.post("/api/public/oneshot/upload")
async def public_oneshot_upload(
    file: UploadFile = File(...),
    order_id: str = Form(...),
    session_token: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload file for anonymous one-shot order."""
    # Validate session
    anon = await validate_anonymous_session(db, session_token, order_id)
    if not anon:
        raise HTTPException(403, "Invalid or expired session")

    # Reuse existing upload logic with profile="generic"
    job = await process_upload(db, file, profile="generic", user_id="anonymous")
    anon.transcription_id = job.transcription_id  # updated after processing
    await db.commit()
    return {"job_id": job.id}


@app.get("/api/public/jobs/{job_id}")
async def public_job_status(job_id: str, session_token: str, db: AsyncSession = Depends(get_db)):
    """Poll job status for anonymous one-shot."""
    # Validate session owns this job
    job = await get_job_if_authorized(db, job_id, session_token)
    return job_to_dict(job)


@app.get("/api/public/transcriptions/{id}")
async def public_transcription(id: str, session_token: str, db: AsyncSession = Depends(get_db)):
    """Get one-shot transcription result (read-only, 24h)."""
    trans = await get_transcription_if_authorized(db, id, session_token)
    return transcription_to_dict(trans, include_analyses=True)


@app.get("/api/public/transcriptions/{id}/export/{format}")
async def public_export(id: str, format: str, session_token: str, db: AsyncSession = Depends(get_db)):
    """Export one-shot transcription."""
    trans = await get_transcription_if_authorized(db, id, session_token)
    return await export_transcription(trans, format)
```

### 1.2 Routes admin (nouvelles)

```python
# ── Admin routes ────────────────────────────────────────

@app.get("/api/admin/stats")
async def admin_stats(db: AsyncSession = Depends(get_db)):
    """Global platform statistics."""
    return {
        "total_users": await count_users(db),
        "active_subscriptions": await count_active_subscriptions(db),
        "mrr_cents": await calculate_mrr(db),
        "total_minutes_this_month": await total_minutes_current_period(db),
        "total_transcriptions": await count_transcriptions(db),
        "error_rate": await calculate_error_rate(db),
        "queue_size": await get_queue_size(db),
        "backends": await get_backends_health(),
    }


@app.get("/api/admin/users")
async def admin_users(db: AsyncSession = Depends(get_db)):
    """List all users with plan and usage info."""
    # Returns: [{user_id, email, plan_id, plan_name, minutes_used, minutes_included, last_activity}]
    pass


@app.get("/api/admin/jobs/queue")
async def admin_queue(db: AsyncSession = Depends(get_db)):
    """Current processing queue."""
    # Returns: [{job_id, file_path, status, priority, created_at, estimated_time}]
    pass


@app.get("/api/admin/billing/events")
async def admin_billing_events(limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Recent billing events."""
    result = await db.execute(
        select(BillingEvent).order_by(BillingEvent.created_at.desc()).limit(limit)
    )
    return result.scalars().all()
```

### 1.3 Service sessions anonymes (nouveau)

```python
# services/anonymous_service.py

async def validate_anonymous_session(db, session_token: str, order_id: str) -> AnonymousSession | None:
    """Validate that a session token is valid and matches the order."""
    result = await db.execute(
        select(AnonymousSession).where(
            AnonymousSession.session_token == session_token,
            AnonymousSession.oneshot_order_id == order_id,
            AnonymousSession.expires_at > datetime.utcnow(),
        )
    )
    return result.scalar_one_or_none()


async def get_transcription_if_authorized(db, trans_id: str, session_token: str):
    """Get transcription only if the anonymous session owns it."""
    result = await db.execute(
        select(AnonymousSession).where(
            AnonymousSession.session_token == session_token,
            AnonymousSession.transcription_id == trans_id,
            AnonymousSession.expires_at > datetime.utcnow(),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(403, "Not authorized or session expired")
    # Now fetch the transcription
    trans = await db.execute(select(Transcription).where(Transcription.id == trans_id))
    return trans.scalar_one_or_none()
```

### 1.4 Service admin (nouveau)

```python
# services/admin_service.py

async def calculate_mrr(db) -> int:
    """Monthly Recurring Revenue in cents."""
    result = await db.execute(
        select(func.sum(Plan.price_cents))
        .join(UserSubscription, UserSubscription.plan_id == Plan.id)
        .where(UserSubscription.status == "active", Plan.price_cents > 0)
    )
    return result.scalar() or 0


async def calculate_error_rate(db) -> float:
    """Error rate over the last 24h."""
    since = datetime.utcnow() - timedelta(hours=24)
    total = await db.execute(select(func.count(Job.id)).where(Job.created_at >= since))
    failed = await db.execute(
        select(func.count(Job.id)).where(Job.created_at >= since, Job.status == "failed")
    )
    total_count = total.scalar() or 0
    failed_count = failed.scalar() or 0
    return round(failed_count / total_count * 100, 1) if total_count > 0 else 0.0


async def get_backends_health() -> dict:
    """Check health of Whisper and Ollama backends."""
    # Ping Ollama
    ollama_ok = False
    try:
        import httpx
        resp = await httpx.AsyncClient().get("http://localhost:11434/api/tags", timeout=5)
        ollama_ok = resp.status_code == 200
    except Exception:
        pass

    return {
        "ollama": {"status": "ok" if ollama_ok else "down"},
        "whisper": {"status": "ok"},  # always local
    }
```

## 2. Structure des fichiers backend (cible)

```
backend/
├── app/
│   ├── main.py                    ← routes + middleware (existant, a etendre)
│   ├── models.py                  ← ORM models (+ User, AnonymousSession)
│   ├── schemas.py                 ← Pydantic schemas
│   ├── database.py                ← DB setup
│   └── services/
│       ├── transcription_service.py    ← Whisper + traitement
│       ├── llm_service.py              ← Ollama analyses
│       ├── subscription_service.py     ← plans, minutes, alertes
│       ├── stripe_service.py           ← Stripe checkout/webhooks
│       ├── feature_gate.py             ← gating par plan
│       ├── export_service.py           ← PDF, TXT, PPTX, SRT, VTT
│       ├── anonymous_service.py        ← NEW: sessions one-shot anon
│       ├── admin_service.py            ← NEW: stats, monitoring
│       ├── profile_service.py          ← profils metiers
│       ├── queue_service.py            ← queue jobs
│       ├── dictionary_service.py
│       ├── confidence_service.py
│       ├── dictation_service.py
│       ├── audio_analysis_service.py
│       ├── stt_backends.py
│       └── llm_backends.py
├── config/
│   └── plans.json                 ← source de verite pricing
├── tests/
│   ├── conftest.py
│   ├── test_subscription.py       ← 41 tests
│   ├── test_stripe.py             ← 13 tests
│   ├── test_rgpd.py               ← 9 tests
│   ├── test_oneshot.py
│   ├── test_anonymous.py          ← NEW: tests sessions anonymes
│   ├── test_admin.py              ← NEW: tests admin
│   └── ...
├── requirements.txt
└── pytest.ini
```

## 3. Plan de migration (pas de breaking changes)

### Phase 1 : Alias routes publiques (non-breaking)

Ajouter les routes `/api/public/*` comme alias des routes existantes.
Aucun changement sur les routes actuelles.

```python
# main.py — ajouter les routes publiques
# Chaque route publique appelle simplement le handler existant
@app.get("/api/public/plans")
async def public_plans(db=Depends(get_db)):
    return await get_plans(db)  # meme handler que /api/plans
```

### Phase 2 : Modele AnonymousSession + service

Ajouter le modele et le service sans toucher aux routes existantes.
SQLite auto-cree les nouvelles tables au demarrage.

### Phase 3 : Routes admin

Ajouter les routes admin proteges par un check de role.
En dev (pas d'auth), elles sont accessibles a tous.

### Phase 4 : Middleware auth (opt-in)

Ajouter le middleware mais l'activer via `AUTH_ENABLED=true` dans .env.
Par defaut OFF = tout fonctionne comme avant.

---

## PARTIE II — IMPLEMENTATION v1 (historique)

### Etat implementation (inchange)
- Backend v7 complet : models, services, routes, tests
- 41 tests subscription + 13 Stripe + 9 RGPD = 63 tests PASS
- Tiers one-shot : Court/Standard/Long/XLong/XXLong/XXXLong
- Alertes : warning 75%, critical 90%, blocked 100%
- Stripe sandbox : checkout + webhook + BillingEvent
- RGPD : export + suppression + batch limit 20

### Passe 3 — Renommage tiers one-shot (2026-03-07)
- `plans.json` : S/M/L → Court/Standard/Long/XLong/XXLong/XXXLong (6 tiers, max 180 min)
- `subscription_service.py` : estimate_oneshot_tier() mis a jour
- `main.py` : endpoint tiers + champ label
- 41/41 tests PASS
