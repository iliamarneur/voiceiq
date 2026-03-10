"""
End-to-end Stripe integration test script.
Tests real Stripe API calls (checkout session creation) + simulates webhook processing.

Usage: python scripts/stripe_test_e2e.py
"""
import asyncio
import json
import os
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# Set env BEFORE imports
os.environ.setdefault("STRIPE_SECRET_KEY", os.environ.get("STRIPE_SECRET_KEY", ""))
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test"
os.environ["APP_BASE_URL"] = "http://localhost:5173"
os.environ["AUTH_ENABLED"] = "false"

import stripe
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

from app.services.stripe_service import (
    is_stripe_configured,
    create_plan_checkout,
    create_oneshot_checkout,
    create_pack_checkout,
    create_billing_portal_session,
    get_or_create_customer,
    cancel_subscription,
    extract_checkout_metadata,
    extract_subscription_event,
    extract_invoice_event,
    get_plan_stripe_price_id,
    get_oneshot_stripe_price_id,
)

passed = 0
failed = 0
errors = []


def test(name):
    def decorator(func):
        async def wrapper():
            global passed, failed
            try:
                await func()
                print(f"  [PASS] {name}")
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {name}: {e}")
                failed += 1
                errors.append((name, str(e)))
        return wrapper
    return decorator


# ============================================================
# TEST 1: Configuration
# ============================================================

@test("Stripe est configure avec la cle test")
async def test_config():
    assert is_stripe_configured(), "Stripe should be configured"

@test("Price IDs sont remplis dans plans.json")
async def test_price_ids():
    basic_id = get_plan_stripe_price_id("basic")
    pro_id = get_plan_stripe_price_id("pro")
    team_id = get_plan_stripe_price_id("team")
    std_id = get_oneshot_stripe_price_id("Standard")
    assert basic_id.startswith("price_"), f"Basic price_id invalide: {basic_id}"
    assert pro_id.startswith("price_"), f"Pro price_id invalide: {pro_id}"
    assert team_id.startswith("price_"), f"Team price_id invalide: {team_id}"
    assert std_id.startswith("price_"), f"Standard price_id invalide: {std_id}"


# ============================================================
# TEST 2: Customer Management
# ============================================================

@test("Creation d'un Stripe Customer")
async def test_create_customer():
    result = await get_or_create_customer(
        email=f"test-{uuid.uuid4().hex[:8]}@voiceiq-test.com",
        user_id="test-user-e2e",
        name="Test User E2E",
    )
    assert result["mode"] == "stripe", f"Mode incorrect: {result['mode']}"
    assert result["customer_id"].startswith("cus_"), f"Customer ID invalide: {result['customer_id']}"

@test("Recherche d'un Customer existant par email")
async def test_find_existing_customer():
    email = f"test-reuse-{uuid.uuid4().hex[:8]}@voiceiq-test.com"
    r1 = await get_or_create_customer(email=email, user_id="u1", name="Test")
    r2 = await get_or_create_customer(email=email, user_id="u2", name="Test")
    assert r1["customer_id"] == r2["customer_id"], "Should reuse same customer"


# ============================================================
# TEST 3: Checkout Sessions - Plans (subscriptions)
# ============================================================

@test("Checkout session plan Basic (subscription, 19 EUR/mois)")
async def test_plan_basic_checkout():
    result = await create_plan_checkout(
        plan_id="basic",
        plan_name="Basic (Solo)",
        price_cents=1900,
        user_id="test-user",
        customer_email="basic-test@voiceiq-test.com",
    )
    assert result["mode"] == "stripe"
    assert result["checkout_url"].startswith("https://checkout.stripe.com")
    assert result["session_id"].startswith("cs_test_")

@test("Checkout session plan Pro (subscription, 49 EUR/mois)")
async def test_plan_pro_checkout():
    result = await create_plan_checkout(
        plan_id="pro",
        plan_name="Pro (PME)",
        price_cents=4900,
        user_id="test-user",
        customer_email="pro-test@voiceiq-test.com",
    )
    assert result["mode"] == "stripe"
    assert result["checkout_url"].startswith("https://checkout.stripe.com")

@test("Checkout session plan Equipe+ (subscription, 99 EUR/mois)")
async def test_plan_team_checkout():
    result = await create_plan_checkout(
        plan_id="team",
        plan_name="Equipe+ (Education)",
        price_cents=9900,
        user_id="test-user",
        customer_email="team-test@voiceiq-test.com",
    )
    assert result["mode"] == "stripe"
    assert result["checkout_url"].startswith("https://checkout.stripe.com")


# ============================================================
# TEST 4: Checkout Sessions - One-shot (payment)
# ============================================================

@test("Checkout session one-shot Court (3 EUR)")
async def test_oneshot_court():
    result = await create_oneshot_checkout(
        order_id=f"order-{uuid.uuid4().hex[:8]}",
        tier="Court",
        price_cents=300,
        includes=["transcription", "summary"],
        customer_email="oneshot-test@voiceiq-test.com",
    )
    assert result["mode"] == "stripe"
    assert result["checkout_url"].startswith("https://checkout.stripe.com")

@test("Checkout session one-shot Standard (6 EUR)")
async def test_oneshot_standard():
    result = await create_oneshot_checkout(
        order_id=f"order-{uuid.uuid4().hex[:8]}",
        tier="Standard",
        price_cents=600,
        includes=["transcription", "summary", "actions"],
        customer_email="oneshot-test@voiceiq-test.com",
    )
    assert result["mode"] == "stripe"
    assert "checkout_url" in result

@test("Checkout session one-shot XXXLong (18 EUR)")
async def test_oneshot_xxxlong():
    result = await create_oneshot_checkout(
        order_id=f"order-{uuid.uuid4().hex[:8]}",
        tier="XXXLong",
        price_cents=1800,
        includes=["transcription", "summary", "actions", "chapters", "faq", "quiz", "flashcards", "export_md"],
        customer_email="oneshot-test@voiceiq-test.com",
    )
    assert result["mode"] == "stripe"
    assert "checkout_url" in result


# ============================================================
# TEST 5: Checkout Sessions - Extra packs (payment)
# ============================================================

@test("Checkout session pack M (500 min, 12 EUR)")
async def test_pack_checkout():
    result = await create_pack_checkout(
        pack_id="M",
        minutes=500,
        price_cents=1200,
        user_id="test-user",
        customer_email="pack-test@voiceiq-test.com",
    )
    assert result["mode"] == "stripe"
    assert result["checkout_url"].startswith("https://checkout.stripe.com")


# ============================================================
# TEST 6: Billing Portal
# ============================================================

@test("Billing Portal session creation")
async def test_billing_portal():
    # Create a customer first
    cust = await get_or_create_customer(
        email=f"portal-{uuid.uuid4().hex[:8]}@voiceiq-test.com",
        user_id="portal-test",
    )
    result = await create_billing_portal_session(cust["customer_id"])
    assert result["mode"] == "stripe"
    assert result["url"].startswith("https://billing.stripe.com")


# ============================================================
# TEST 7: Webhook data extraction
# ============================================================

@test("Extract checkout metadata (oneshot)")
async def test_extract_oneshot():
    event = {
        "data": {"object": {
            "id": "cs_test_xxx",
            "payment_status": "paid",
            "amount_total": 600,
            "customer": "cus_abc",
            "subscription": None,
            "customer_email": "user@test.com",
            "metadata": {"type": "oneshot", "order_id": "ord_123", "tier": "Standard"},
        }}
    }
    result = extract_checkout_metadata(event)
    assert result["type"] == "oneshot"
    assert result["customer"] == "cus_abc"
    assert result["customer_email"] == "user@test.com"
    assert result["amount_total"] == 600

@test("Extract checkout metadata (plan_upgrade)")
async def test_extract_plan():
    event = {
        "data": {"object": {
            "id": "cs_test_yyy",
            "payment_status": "paid",
            "amount_total": 4900,
            "customer": "cus_def",
            "subscription": "sub_ghi",
            "customer_email": "pro@test.com",
            "metadata": {"type": "plan_upgrade", "plan_id": "pro", "user_id": "u1"},
        }}
    }
    result = extract_checkout_metadata(event)
    assert result["type"] == "plan_upgrade"
    assert result["subscription"] == "sub_ghi"

@test("Extract subscription event (cancel)")
async def test_extract_sub_cancel():
    event = {
        "data": {"object": {
            "id": "sub_xxx",
            "customer": "cus_abc",
            "status": "active",
            "cancel_at_period_end": True,
            "current_period_start": 1700000000,
            "current_period_end": 1702592000,
            "metadata": {"plan_id": "pro"},
        }}
    }
    result = extract_subscription_event(event)
    assert result["cancel_at_period_end"] is True
    assert result["plan_id"] == "pro"

@test("Extract invoice event (renewal)")
async def test_extract_invoice():
    event = {
        "data": {"object": {
            "id": "in_xxx",
            "customer": "cus_abc",
            "subscription": "sub_def",
            "status": "paid",
            "amount_paid": 4900,
            "amount_due": 4900,
            "billing_reason": "subscription_cycle",
        }}
    }
    result = extract_invoice_event(event)
    assert result["billing_reason"] == "subscription_cycle"
    assert result["amount_paid"] == 4900


# ============================================================
# TEST 8: Verify Stripe Products exist
# ============================================================

@test("Products Stripe existent (plans)")
async def test_products_plans():
    products = stripe.Product.list(limit=20)
    names = [p.name for p in products.data]
    assert any("Basic" in n for n in names), f"Basic not found in {names}"
    assert any("Pro" in n for n in names), f"Pro not found in {names}"
    assert any("quipe" in n or "Education" in n for n in names), f"Team not found in {names}"

@test("Products Stripe existent (one-shot tiers)")
async def test_products_tiers():
    products = stripe.Product.list(limit=30)
    names = [p.name for p in products.data]
    for tier in ["Court", "Standard", "Long", "XLong", "XXLong", "XXXLong"]:
        assert any(tier in n for n in names), f"Tier {tier} not found"

@test("Prices Stripe sont en EUR")
async def test_prices_eur():
    prices = stripe.Price.list(limit=20, active=True)
    for p in prices.data:
        assert p.currency == "eur", f"Price {p.id} is {p.currency}, expected eur"


# ============================================================
# TEST 9: Checkout URL format validation
# ============================================================

@test("URL de retour success contient les bons params (plan)")
async def test_success_url_plan():
    result = await create_plan_checkout(
        plan_id="basic", plan_name="Basic", price_cents=1900,
        customer_email="url-test@voiceiq-test.com",
    )
    # Retrieve session to check success_url
    session = stripe.checkout.Session.retrieve(result["session_id"])
    assert "payment/success" in session.success_url
    assert "type=plan" in session.success_url
    assert "plan_id=basic" in session.success_url

@test("URL de retour success contient les bons params (oneshot)")
async def test_success_url_oneshot():
    oid = f"order-{uuid.uuid4().hex[:8]}"
    result = await create_oneshot_checkout(
        order_id=oid, tier="Standard", price_cents=600,
        includes=["transcription"], customer_email="url-test@voiceiq-test.com",
    )
    session = stripe.checkout.Session.retrieve(result["session_id"])
    assert "payment/success" in session.success_url
    assert "type=oneshot" in session.success_url
    assert oid in session.success_url

@test("URL cancel pointe vers /payment/cancel")
async def test_cancel_url():
    result = await create_plan_checkout(
        plan_id="pro", plan_name="Pro", price_cents=4900,
        customer_email="cancel-test@voiceiq-test.com",
    )
    session = stripe.checkout.Session.retrieve(result["session_id"])
    assert "payment/cancel" in session.cancel_url


# ============================================================
# MAIN
# ============================================================

async def main():
    print("\n" + "=" * 60)
    print("VoiceIQ -- Tests E2E Stripe (vrais appels API)")
    print("=" * 60 + "\n")

    tests = [
        test_config, test_price_ids,
        test_create_customer, test_find_existing_customer,
        test_plan_basic_checkout, test_plan_pro_checkout, test_plan_team_checkout,
        test_oneshot_court, test_oneshot_standard, test_oneshot_xxxlong,
        test_pack_checkout,
        test_billing_portal,
        test_extract_oneshot, test_extract_plan, test_extract_sub_cancel, test_extract_invoice,
        test_products_plans, test_products_tiers, test_prices_eur,
        test_success_url_plan, test_success_url_oneshot, test_cancel_url,
    ]

    for t in tests:
        await t()

    print("\n" + "=" * 60)
    total = passed + failed
    print(f"Resultats: {passed}/{total} PASS, {failed} FAIL")
    print("=" * 60)

    if errors:
        print("\nEchecs:")
        for name, err in errors:
            print(f"  - {name}: {err}")

    if failed == 0:
        print("\nTous les tests Stripe E2E sont OK.")
    else:
        print(f"\n{failed} test(s) en echec.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
