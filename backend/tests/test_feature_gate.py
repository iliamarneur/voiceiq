"""Tests for feature gating system."""
import pytest
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException


class TestFeatureLabels:
    """Test feature label mapping."""

    def test_all_plan_features_have_labels(self):
        import json
        from app.services.feature_gate import FEATURE_LABELS
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "plans.json")
        with open(config_path) as f:
            config = json.load(f)
        all_features = set()
        for plan in config["plans"]:
            all_features.update(plan["features"])
        for feature in all_features:
            assert feature in FEATURE_LABELS, f"Feature '{feature}' missing from FEATURE_LABELS"


class TestPlanFeatures:
    """Test plan feature definitions."""

    def test_basic_plan_features(self):
        import json
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "plans.json")
        with open(config_path) as f:
            config = json.load(f)
        basic = next(p for p in config["plans"] if p["id"] == "basic")
        assert "transcription" in basic["features"]
        assert "summary" in basic["features"]
        assert "keypoints" in basic["features"]
        assert "dictation" in basic["features"]
        assert "chat" in basic["features"]
        assert "actions" in basic["features"]
        # Basic should NOT have advanced features
        assert "mindmap" not in basic["features"]
        assert "slides" not in basic["features"]
        assert "templates" not in basic["features"]

    def test_pro_plan_has_advanced_features(self):
        import json
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "plans.json")
        with open(config_path) as f:
            config = json.load(f)
        pro = next(p for p in config["plans"] if p["id"] == "pro")
        assert "mindmap" in pro["features"]
        assert "slides" in pro["features"]
        assert "templates" in pro["features"]
        assert "presets" in pro["features"]
        assert "export_pptx" in pro["features"]

    def test_team_plan_has_all_features(self):
        import json
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "plans.json")
        with open(config_path) as f:
            config = json.load(f)
        team = next(p for p in config["plans"] if p["id"] == "team")
        assert "multi_workspace" in team["features"]
        assert "shared_presets" in team["features"]
        assert "batch_export" in team["features"]

    def test_features_are_incremental(self):
        """Each plan should include all features of the plan below it."""
        import json
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "plans.json")
        with open(config_path) as f:
            config = json.load(f)
        plans = {p["id"]: set(p["features"]) for p in config["plans"]}
        assert plans["basic"].issubset(plans["pro"])
        assert plans["pro"].issubset(plans["team"])


class TestPlanLimits:
    """Test plan limits (max_dictionaries, max_workspaces)."""

    def test_basic_limits(self):
        import json
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "plans.json")
        with open(config_path) as f:
            config = json.load(f)
        basic = next(p for p in config["plans"] if p["id"] == "basic")
        assert basic["max_dictionaries"] == 1
        assert basic["max_workspaces"] == 1

    def test_pro_limits(self):
        import json
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "plans.json")
        with open(config_path) as f:
            config = json.load(f)
        pro = next(p for p in config["plans"] if p["id"] == "pro")
        assert pro["max_dictionaries"] == -1  # unlimited
        assert pro["max_workspaces"] == 1

    def test_team_limits(self):
        import json
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "plans.json")
        with open(config_path) as f:
            config = json.load(f)
        team = next(p for p in config["plans"] if p["id"] == "team")
        assert team["max_dictionaries"] == -1
        assert team["max_workspaces"] == -1
