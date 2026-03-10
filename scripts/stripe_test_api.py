"""
Test the actual FastAPI endpoints with Stripe configured.
Tests /api/subscription/plan, /api/oneshot/order, /api/billing/portal, /api/subscription/cancel
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

os.environ.setdefault("STRIPE_SECRET_KEY", os.environ.get("STRIPE_SECRET_KEY", ""))
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test"
os.environ["APP_BASE_URL"] = "http://localhost:5173"
os.environ["AUTH_ENABLED"] = "false"

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models import Base
from app.services.subscription_service import seed_plans

passed = 0
failed = 0
errors = []


def test(name):
    def decorator(func):
        async def wrapper(client):
            global passed, failed
            try:
                await func(client)
                print(f"  [PASS] {name}")
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {name}: {e}")
                failed += 1
                errors.append((name, str(e)))
        return wrapper
    return decorator


@test("GET /api/plans retourne 3 plans")
async def test_get_plans(client):
    resp = await client.get("/api/plans")
    assert resp.status_code == 200
    plans = resp.json()
    assert len(plans) == 3

@test("GET /api/oneshot/tiers retourne 6 tiers")
async def test_get_tiers(client):
    resp = await client.get("/api/oneshot/tiers")
    assert resp.status_code == 200
    tiers = resp.json()
    assert len(tiers) == 6
    names = [t["tier"] for t in tiers]
    assert "Court" in names
    assert "XXXLong" in names

@test("POST /api/oneshot/estimate pour 45 min -> Standard")
async def test_estimate(client):
    resp = await client.post("/api/oneshot/estimate", json={"duration_seconds": 2700})
    assert resp.status_code == 200
    data = resp.json()
    assert data["tier"] == "Standard"
    assert data["price_cents"] == 600

@test("PUT /api/subscription/plan -> retourne checkout_url Stripe")
async def test_change_plan_stripe(client):
    resp = await client.put("/api/subscription/plan", json={"plan_id": "pro"})
    assert resp.status_code == 200
    data = resp.json()
    assert "checkout_url" in data, f"Expected checkout_url, got: {list(data.keys())}"
    assert data["checkout_url"].startswith("https://checkout.stripe.com")
    assert "session_id" in data

@test("POST /api/oneshot/order -> retourne checkout_url Stripe")
async def test_oneshot_order_stripe(client):
    resp = await client.post("/api/oneshot/order", json={
        "tier": "Standard",
        "duration_seconds": 2700,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "checkout_url" in data, f"Expected checkout_url, got: {list(data.keys())}"
    assert data["checkout_url"].startswith("https://checkout.stripe.com")

@test("POST /api/subscription/cancel (pas d'abo actif -> erreur)")
async def test_cancel_no_sub(client):
    resp = await client.post("/api/subscription/cancel")
    assert resp.status_code == 400

@test("POST /api/billing/portal (pas de customer -> erreur)")
async def test_portal_no_customer(client):
    resp = await client.post("/api/billing/portal")
    assert resp.status_code == 400

@test("GET /api/subscription retourne pas d'abonnement")
async def test_get_subscription(client):
    resp = await client.get("/api/subscription")
    assert resp.status_code == 200

@test("GET /api/subscription/alerts retourne structure valide")
async def test_alerts(client):
    resp = await client.get("/api/subscription/alerts")
    assert resp.status_code == 200

@test("POST /api/oneshot/estimate > 180 min -> erreur 400")
async def test_estimate_too_long(client):
    resp = await client.post("/api/oneshot/estimate", json={"duration_seconds": 11000})
    assert resp.status_code == 400


async def main():
    print("\n" + "=" * 60)
    print("VoiceIQ -- Tests API endpoints avec Stripe reel")
    print("=" * 60 + "\n")

    # Setup in-memory DB
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            await session.close()

    # Seed plans
    async with TestSession() as session:
        await seed_plans(session)

    from app.main import app, get_db
    from unittest.mock import patch

    app.dependency_overrides[get_db] = override_get_db

    with patch("app.services.auth_service.AUTH_ENABLED", False), \
         patch("app.services.profile_service._profiles_cache", {}):
        from app.services.profile_service import reload_profiles
        reload_profiles()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            tests = [
                test_get_plans,
                test_get_tiers,
                test_estimate,
                test_change_plan_stripe,
                test_oneshot_order_stripe,
                test_cancel_no_sub,
                test_portal_no_customer,
                test_get_subscription,
                test_alerts,
                test_estimate_too_long,
            ]
            for t in tests:
                await t(client)

    app.dependency_overrides.clear()
    await engine.dispose()

    print("\n" + "=" * 60)
    total = passed + failed
    print(f"Resultats: {passed}/{total} PASS, {failed} FAIL")
    print("=" * 60)

    if errors:
        print("\nEchecs:")
        for name, err in errors:
            print(f"  - {name}: {err}")

    if failed == 0:
        print("\nTous les tests API Stripe sont OK.")
    else:
        print(f"\n{failed} test(s) en echec.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
