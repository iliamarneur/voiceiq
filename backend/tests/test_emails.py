"""Tests for email templates — Stripe events and quota alerts."""
import pytest
from unittest.mock import patch

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.email_service import (
    template_payment_success, template_payment_failed, template_subscription_cancelled,
    template_quota_warning, template_quota_critical,
    send_payment_success, send_payment_failed, send_subscription_cancelled,
    send_quota_warning, send_quota_critical,
)


# ── Template content tests ────────────────────────────────

def test_payment_success_template():
    msg = template_payment_success("Alice", "alice@test.com", "6.00 €", "Transcription one-shot")
    assert msg.to == "alice@test.com"
    assert "6.00 €" in msg.subject
    assert "Paiement confirmé" in msg.html
    assert "Transcription one-shot" in msg.html
    assert "6.00 €" in msg.text


def test_payment_failed_template():
    msg = template_payment_failed("Bob", "bob@test.com", "Pro")
    assert msg.to == "bob@test.com"
    assert "Échec" in msg.subject
    assert "Pro" in msg.html
    assert "moyen de paiement" in msg.html


def test_subscription_cancelled_template():
    msg = template_subscription_cancelled("Charlie", "charlie@test.com", "basic")
    assert msg.to == "charlie@test.com"
    assert "annulé" in msg.subject
    assert "basic" in msg.html
    assert "one-shot" in msg.html


def test_quota_warning_template():
    msg = template_quota_warning("Dave", "dave@test.com", 78, 110, "Pro")
    assert "78%" in msg.html
    assert "Pro" in msg.html
    assert "110 minutes" in msg.html


def test_quota_critical_template():
    msg = template_quota_critical("Eve", "eve@test.com", 15, "Basic")
    assert "15 minutes" in msg.html
    assert "Basic" in msg.html
    assert "bloquées" in msg.html


# ── Send functions (stub mode) ────────────────────────────

def test_send_payment_success_stub():
    """In stub mode (no SMTP), send_payment_success returns True."""
    result = send_payment_success("Alice", "alice@test.com", "49.00 €", "Abonnement Pro")
    assert result is True


def test_send_payment_failed_stub():
    result = send_payment_failed("Bob", "bob@test.com", "Pro")
    assert result is True


def test_send_subscription_cancelled_stub():
    result = send_subscription_cancelled("Charlie", "charlie@test.com", "basic")
    assert result is True


def test_send_quota_warning_stub():
    result = send_quota_warning("Dave", "dave@test.com", 78, 110, "Pro")
    assert result is True


def test_send_quota_critical_stub():
    result = send_quota_critical("Eve", "eve@test.com", 15, "Basic")
    assert result is True
