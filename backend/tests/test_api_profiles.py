"""Tests for profile API endpoints."""
import pytest
import pytest_asyncio

pytestmark = pytest.mark.asyncio

EXPECTED_PROFILES = {"generic", "business", "education", "medical", "legal"}
EXPECTED_COUNTS = {
    "generic": 9,
    "business": 9,
    "education": 9,
    "medical": 7,
    "legal": 7,
}


async def test_list_profiles(test_client):
    resp = await test_client.get("/api/profiles")
    assert resp.status_code == 200
    profiles = resp.json()
    assert len(profiles) == 5
    ids = {p["id"] for p in profiles}
    assert ids == EXPECTED_PROFILES


async def test_get_profile_detail(test_client):
    for pid in EXPECTED_PROFILES:
        resp = await test_client.get(f"/api/profiles/{pid}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == pid
        assert "name" in data
        assert "description" in data
        assert "analyses" in data
        assert "exports" in data


async def test_get_profile_analyses_count(test_client):
    for pid, expected_count in EXPECTED_COUNTS.items():
        resp = await test_client.get(f"/api/profiles/{pid}/analyses")
        assert resp.status_code == 200
        analyses = resp.json()
        assert len(analyses) == expected_count, f"{pid}: expected {expected_count}, got {len(analyses)}"


async def test_profile_analyses_have_required_fields(test_client):
    for pid in EXPECTED_PROFILES:
        resp = await test_client.get(f"/api/profiles/{pid}/analyses")
        analyses = resp.json()
        for a in analyses:
            assert "type" in a, f"{pid}: analysis missing 'type'"
            assert "label" in a, f"{pid}: analysis missing 'label'"
            assert "prompt" in a, f"{pid}: analysis missing 'prompt'"
            assert len(a["prompt"]) > 20, f"{pid}/{a['type']}: prompt too short"


async def test_no_duplicate_analysis_types(test_client):
    for pid in EXPECTED_PROFILES:
        resp = await test_client.get(f"/api/profiles/{pid}/analyses")
        analyses = resp.json()
        types = [a["type"] for a in analyses]
        assert len(types) == len(set(types)), f"{pid}: duplicate analysis types: {types}"


async def test_reload_profiles(test_client):
    resp = await test_client.post("/api/profiles/reload")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "reloaded"
    assert set(data["profiles"]) == EXPECTED_PROFILES


async def test_invalid_profile_404(test_client):
    resp = await test_client.get("/api/profiles/nonexistent")
    assert resp.status_code == 404
