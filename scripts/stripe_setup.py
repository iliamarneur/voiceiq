"""
Stripe Setup Script — Creates all Products, Prices, Webhook, and Billing Portal config.
Run once to provision Stripe test environment.

Usage: python scripts/stripe_setup.py
"""
import json
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import stripe

STRIPE_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
stripe.api_key = STRIPE_KEY

# Webhook URL for local dev — will use Stripe CLI forwarding
LOCAL_WEBHOOK_URL = "http://localhost:8000/api/stripe/webhook"

PLANS_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "config", "plans.json")


def create_products_and_prices():
    """Create all Stripe Products and Prices, return mapping."""
    print("=" * 60)
    print("ETAPE 1 : Création des Products & Prices Stripe")
    print("=" * 60)

    results = {"plans": {}, "oneshot_tiers": {}, "extra_packs": {}}

    # ── Plans (recurring monthly) ──
    plans = [
        {"id": "basic", "name": "ClearRecap — Basic (Solo)", "price_cents": 1900, "minutes": 500},
        {"id": "pro", "name": "ClearRecap — Pro (PME)", "price_cents": 4900, "minutes": 3000},
        {"id": "team", "name": "ClearRecap — Equipe+ (Education)", "price_cents": 9900, "minutes": 10000},
    ]

    for plan in plans:
        print(f"\n  Création produit: {plan['name']}...")
        product = stripe.Product.create(
            name=plan["name"],
            description=f"{plan['minutes']} minutes/mois incluses",
            metadata={"voiceiq_plan_id": plan["id"], "minutes_included": str(plan["minutes"])},
        )
        price = stripe.Price.create(
            product=product.id,
            unit_amount=plan["price_cents"],
            currency="eur",
            recurring={"interval": "month"},
            metadata={"voiceiq_plan_id": plan["id"]},
        )
        results["plans"][plan["id"]] = {
            "product_id": product.id,
            "price_id": price.id,
        }
        print(f"    [OK] Product: {product.id}")
        print(f"    [OK] Price:   {price.id} ({plan['price_cents']/100:.0f} EUR/mois)")

    # ── One-shot tiers (one-time) ──
    tiers = [
        {"id": "Court", "name": "ClearRecap — Transcription Court", "price_cents": 300, "max_min": 30},
        {"id": "Standard", "name": "ClearRecap — Transcription Standard", "price_cents": 600, "max_min": 60},
        {"id": "Long", "name": "ClearRecap — Transcription Long", "price_cents": 900, "max_min": 90},
        {"id": "XLong", "name": "ClearRecap — Transcription XLong", "price_cents": 1200, "max_min": 120},
        {"id": "XXLong", "name": "ClearRecap — Transcription XXLong", "price_cents": 1500, "max_min": 150},
        {"id": "XXXLong", "name": "ClearRecap — Transcription XXXLong", "price_cents": 1800, "max_min": 180},
    ]

    for tier in tiers:
        print(f"\n  Création produit: {tier['name']}...")
        product = stripe.Product.create(
            name=tier["name"],
            description=f"Transcription one-shot jusqu'à {tier['max_min']} minutes",
            metadata={"voiceiq_tier": tier["id"], "max_duration_minutes": str(tier["max_min"])},
        )
        price = stripe.Price.create(
            product=product.id,
            unit_amount=tier["price_cents"],
            currency="eur",
            metadata={"voiceiq_tier": tier["id"]},
        )
        results["oneshot_tiers"][tier["id"]] = {
            "product_id": product.id,
            "price_id": price.id,
        }
        print(f"    [OK] Product: {product.id}")
        print(f"    [OK] Price:   {price.id} ({tier['price_cents']/100:.0f} EUR)")

    # ── Extra packs (one-time) ──
    packs = [
        {"id": "S", "name": "ClearRecap — Pack 100 minutes", "price_cents": 300, "minutes": 100},
        {"id": "M", "name": "ClearRecap — Pack 500 minutes", "price_cents": 1200, "minutes": 500},
        {"id": "L", "name": "ClearRecap — Pack 2000 minutes", "price_cents": 4000, "minutes": 2000},
    ]

    for pack in packs:
        print(f"\n  Création produit: {pack['name']}...")
        product = stripe.Product.create(
            name=pack["name"],
            description=f"Pack de {pack['minutes']} minutes supplémentaires",
            metadata={"voiceiq_pack_id": pack["id"], "minutes": str(pack["minutes"])},
        )
        price = stripe.Price.create(
            product=product.id,
            unit_amount=pack["price_cents"],
            currency="eur",
            metadata={"voiceiq_pack_id": pack["id"]},
        )
        results["extra_packs"][pack["id"]] = {
            "product_id": product.id,
            "price_id": price.id,
        }
        print(f"    [OK] Product: {product.id}")
        print(f"    [OK] Price:   {price.id} ({pack['price_cents']/100:.0f} EUR)")

    return results


def update_plans_json(results):
    """Update plans.json with Stripe Price IDs."""
    print("\n" + "=" * 60)
    print("ETAPE 2 : Mise à jour de plans.json avec les Price IDs")
    print("=" * 60)

    with open(PLANS_JSON_PATH) as f:
        config = json.load(f)

    # Update plans
    for plan in config["plans"]:
        if plan["id"] in results["plans"]:
            plan["stripe_price_id"] = results["plans"][plan["id"]]["price_id"]
            print(f"  [OK] Plan {plan['id']}: {plan['stripe_price_id']}")

    # Update oneshot tiers
    for tier_name, tier_data in config["oneshot_tiers"].items():
        if tier_name in results["oneshot_tiers"]:
            tier_data["stripe_price_id"] = results["oneshot_tiers"][tier_name]["price_id"]
            print(f"  [OK] Tier {tier_name}: {tier_data['stripe_price_id']}")

    # Update extra packs
    for pack_id, pack_data in config["extra_packs"].items():
        if pack_id in results["extra_packs"]:
            pack_data["stripe_price_id"] = results["extra_packs"][pack_id]["price_id"]
            print(f"  [OK] Pack {pack_id}: {pack_data['stripe_price_id']}")

    with open(PLANS_JSON_PATH, "w") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"\n  -> Fichier mis à jour : {PLANS_JSON_PATH}")


def create_webhook():
    """Create Stripe webhook endpoint."""
    print("\n" + "=" * 60)
    print("ETAPE 3 : Création du Webhook Stripe")
    print("=" * 60)

    # For local dev, we create the webhook endpoint but it won't work without Stripe CLI
    # We still create it so the signing secret is available
    try:
        webhook = stripe.WebhookEndpoint.create(
            url=LOCAL_WEBHOOK_URL,
            enabled_events=[
                "checkout.session.completed",
                "invoice.payment_succeeded",
                "invoice.payment_failed",
                "customer.subscription.updated",
                "customer.subscription.deleted",
            ],
            description="VoiceIQ / ClearRecap — local dev webhook",
        )
        print(f"  [OK] Webhook créé: {webhook.id}")
        print(f"  [OK] URL: {webhook.url}")
        print(f"  [OK] Secret: {webhook.secret}")
        print(f"  [OK] Events: {', '.join(webhook.enabled_events)}")
        return webhook.secret
    except stripe.error.InvalidRequestError as e:
        print(f"  [!] Webhook non créé (normal en local): {e}")
        print(f"  -> Utilise Stripe CLI pour le forwarding local (voir ci-dessous)")
        return ""


def configure_billing_portal(results):
    """Configure Stripe Billing Portal."""
    print("\n" + "=" * 60)
    print("ETAPE 4 : Configuration du Billing Portal Stripe")
    print("=" * 60)

    try:
        # Collect all subscription price IDs for the portal
        plan_prices = []
        for plan_id, data in results["plans"].items():
            plan_prices.append({"price": data["price_id"], "product": data["product_id"]})

        # Configure the billing portal
        config = stripe.billing_portal.Configuration.create(
            business_profile={
                "headline": "ClearRecap — Gérez votre abonnement",
            },
            features={
                "subscription_cancel": {
                    "enabled": True,
                    "mode": "at_period_end",
                },
                "subscription_update": {
                    "enabled": True,
                    "default_allowed_updates": ["price"],
                    "proration_behavior": "create_prorations",
                    "products": [
                        {
                            "product": data["product_id"],
                            "prices": [data["price_id"]],
                        }
                        for data in results["plans"].values()
                    ],
                },
                "payment_method_update": {
                    "enabled": True,
                },
                "invoice_history": {
                    "enabled": True,
                },
            },
        )
        print(f"  [OK] Billing Portal configuré: {config.id}")
        print(f"  [OK] Annulation: fin de période")
        print(f"  [OK] Changement de plan: activé (Basic <-> Pro <-> Equipe+)")
        print(f"  [OK] Mise à jour moyen de paiement: activé")
        print(f"  [OK] Historique factures: activé")
    except Exception as e:
        print(f"  [!] Billing Portal config error: {e}")
        print(f"  -> Tu peux le configurer manuellement dans Dashboard > Settings > Billing > Customer portal")


def update_env_file(webhook_secret):
    """Update .env with Stripe keys."""
    print("\n" + "=" * 60)
    print("ETAPE 5 : Mise à jour du fichier .env")
    print("=" * 60)

    env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")

    # Read existing .env or create new
    env_lines = []
    existing_keys = set()
    if os.path.exists(env_path):
        with open(env_path) as f:
            env_lines = f.readlines()
        for line in env_lines:
            if "=" in line and not line.strip().startswith("#"):
                key = line.split("=", 1)[0].strip()
                existing_keys.add(key)

    stripe_vars = {
        "STRIPE_SECRET_KEY": STRIPE_KEY,
        "STRIPE_WEBHOOK_SECRET": webhook_secret or "whsec_USE_STRIPE_CLI",
        "STRIPE_MODE": "sandbox",
        "APP_BASE_URL": "http://localhost:5173",
    }

    # Update existing or append
    updated = set()
    new_lines = []
    for line in env_lines:
        replaced = False
        for key, value in stripe_vars.items():
            if line.strip().startswith(f"{key}="):
                new_lines.append(f"{key}={value}\n")
                updated.add(key)
                replaced = True
                break
        if not replaced:
            new_lines.append(line)

    # Append missing keys
    for key, value in stripe_vars.items():
        if key not in updated:
            new_lines.append(f"{key}={value}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)

    print(f"  [OK] STRIPE_SECRET_KEY = sk_test_...{STRIPE_KEY[-8:]}")
    print(f"  [OK] STRIPE_WEBHOOK_SECRET = {webhook_secret[:20] + '...' if webhook_secret else 'whsec_USE_STRIPE_CLI'}")
    print(f"  [OK] STRIPE_MODE = sandbox")
    print(f"  [OK] APP_BASE_URL = http://localhost:5173")
    print(f"  -> Fichier mis à jour : {env_path}")


def print_summary(results, webhook_secret):
    """Print final summary."""
    print("\n" + "=" * 60)
    print("RESUME — Stripe configuré avec succès")
    print("=" * 60)

    print(f"\n  Products créés : {len(results['plans']) + len(results['oneshot_tiers']) + len(results['extra_packs'])}")
    print(f"  Plans abo      : {len(results['plans'])} (Basic, Pro, Equipe+)")
    print(f"  Tiers one-shot : {len(results['oneshot_tiers'])} (Court -> XXXLong)")
    print(f"  Extra packs    : {len(results['extra_packs'])} (S, M, L)")

    if webhook_secret:
        print(f"\n  Webhook secret : {webhook_secret[:20]}...")
    else:
        print(f"\n  [!] Webhook : à configurer avec Stripe CLI (voir ci-dessous)")

    print(f"\n  plans.json : mis à jour avec tous les stripe_price_id")
    print(f"  .env       : mis à jour avec les clés Stripe")

    print("\n" + "-" * 60)
    print("PROCHAINE ETAPE : Stripe CLI pour les webhooks locaux")
    print("-" * 60)
    print("""
  Pour recevoir les webhooks en local, installe Stripe CLI :

  1. Télécharge : https://stripe.com/docs/stripe-cli
     Ou via scoop : scoop install stripe
     Ou via choco : choco install stripe-cli

  2. Connecte-toi :
     stripe login

  3. Lance le forwarding :
     stripe listen --forward-to localhost:8000/api/stripe/webhook

  4. Stripe CLI affichera un webhook secret (whsec_...).
     Copie-le et remplace STRIPE_WEBHOOK_SECRET dans backend/.env

  5. Pour tester un paiement :
     stripe trigger checkout.session.completed
""")


if __name__ == "__main__":
    print("\n--- VoiceIQ / ClearRecap -- Stripe Setup ---\n")

    # Step 1: Create products & prices
    results = create_products_and_prices()

    # Step 2: Update plans.json
    update_plans_json(results)

    # Step 3: Create webhook
    webhook_secret = create_webhook()

    # Step 4: Configure billing portal
    configure_billing_portal(results)

    # Step 5: Update .env
    update_env_file(webhook_secret)

    # Summary
    print_summary(results, webhook_secret)
