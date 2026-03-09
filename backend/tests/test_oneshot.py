"""Tests for one-shot transcription flow (BUG-V7-004)."""
import pytest
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestOneshotTiers:
    """Test oneshot tier configuration."""

    def test_tiers_loaded_from_config(self):
        from app.services.subscription_service import get_oneshot_tiers
        tiers = get_oneshot_tiers()
        assert "Court" in tiers
        assert "Standard" in tiers
        assert "Long" in tiers

    def test_each_tier_has_required_fields(self):
        from app.services.subscription_service import get_oneshot_tiers
        tiers = get_oneshot_tiers()
        for tier_id, tier in tiers.items():
            assert "max_duration_minutes" in tier, f"{tier_id} missing max_duration_minutes"
            assert "price_cents" in tier, f"{tier_id} missing price_cents"
            assert "includes" in tier, f"{tier_id} missing includes"
            assert tier["price_cents"] > 0, f"{tier_id} price must be positive"

    def test_tiers_have_increasing_duration(self):
        from app.services.subscription_service import get_oneshot_tiers
        tiers = get_oneshot_tiers()
        durations = [tiers[k]["max_duration_minutes"] for k in ["Court", "Standard", "Long"]]
        assert durations == sorted(durations), "Tiers should have increasing duration"

    def test_tiers_have_increasing_price(self):
        from app.services.subscription_service import get_oneshot_tiers
        tiers = get_oneshot_tiers()
        prices = [tiers[k]["price_cents"] for k in ["Court", "Standard", "Long"]]
        assert prices == sorted(prices), "Tiers should have increasing prices"


class TestOneshotEstimate:
    """Test oneshot tier estimation."""

    def test_short_audio_gets_court_tier(self):
        from app.services.subscription_service import estimate_oneshot_tier
        result = estimate_oneshot_tier(600)  # 10 min
        assert result["tier"] == "Court"

    def test_medium_audio_gets_standard_tier(self):
        from app.services.subscription_service import estimate_oneshot_tier
        result = estimate_oneshot_tier(2400)  # 40 min
        assert result["tier"] == "Standard"

    def test_long_audio_gets_long_tier(self):
        from app.services.subscription_service import estimate_oneshot_tier
        result = estimate_oneshot_tier(4800)  # 80 min
        assert result["tier"] == "Long"

    def test_exceeding_audio_gets_warning(self):
        from app.services.subscription_service import estimate_oneshot_tier
        result = estimate_oneshot_tier(6000)  # 100 min
        assert result["tier"] == "Long"
        assert "warning" in result

    def test_estimate_includes_features(self):
        from app.services.subscription_service import estimate_oneshot_tier
        result = estimate_oneshot_tier(600)
        assert "includes" in result
        assert len(result["includes"]) > 0
        assert "transcription" in result["includes"]


class TestOneshotModel:
    """Test OneshotOrder model fields."""

    def test_oneshot_order_has_required_columns(self):
        from app.models import OneshotOrder
        columns = {c.name for c in OneshotOrder.__table__.columns}
        assert "id" in columns
        assert "tier" in columns
        assert "price_cents" in columns
        assert "payment_status" in columns
        assert "transcription_id" in columns
        assert "audio_duration_seconds" in columns

    def test_transcription_has_oneshot_order_id(self):
        from app.models import Transcription
        columns = {c.name for c in Transcription.__table__.columns}
        assert "oneshot_order_id" in columns


class TestOneshotEndpointConfig:
    """Test that oneshot endpoints are properly configured."""

    def test_tiers_endpoint_exists(self):
        """Verify the tiers endpoint is registered."""
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/api/oneshot/tiers" in routes

    def test_upload_endpoint_exists(self):
        """Verify the unified oneshot upload endpoint is registered."""
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/api/oneshot/upload" in routes

    def test_estimate_endpoint_exists(self):
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/api/oneshot/estimate" in routes
