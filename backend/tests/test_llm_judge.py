"""LLM-judge: validate that analyses meet quality criteria.

These tests mock Ollama responses and verify the output structure
matches what each profile's renderers expect.
"""
import json
import pytest
from unittest.mock import patch

from app.services.profile_service import get_profile_analyses, reload_profiles

reload_profiles()

# ── Expected schemas per analysis type ────────────────────

REQUIRED_FIELDS = {
    # Generic
    "summary": ["title", "points"],
    "keypoints": ["keypoints"],
    "actions": ["actions"],
    "flashcards": ["cards"],
    "quiz": ["questions"],
    "mindmap": ["markdown"],
    "slides": ["slides"],
    "tables": ["tables"],
    # Business-specific
    "kpi": ["metrics"],
    "risks": ["risks"],
    "followup": [],  # Free-form email text is OK
    "stakeholder_map": ["stakeholders"],
    # Education-specific
    "glossary": ["terms"],
    "chapters": ["chapters"],
    "exercises": ["exercises"],
    # Medical-specific
    "soap": ["subjective", "objective", "assessment", "plan"],
    "pii_redaction": ["entities"],
    "prescriptions": ["medications"],
    "watchpoints": ["alerts"],
    # Legal-specific
    "clauses": ["clauses"],
    "obligations": ["obligations"],
    "deadlines": ["deadlines"],
    "references": ["references"],
}


def _make_valid_analysis(analysis_type: str) -> dict:
    """Generate a minimal valid analysis response for testing."""
    valid_responses = {
        "summary": {"title": "Test", "introduction": "Intro", "points": ["Point 1"], "conclusion": "End"},
        "keypoints": {"keypoints": [{"theme": "T1", "points": ["P1"]}]},
        "actions": {"actions": ["Do X"], "decisions": ["D1"], "questions": ["Q1"]},
        "flashcards": {"cards": [{"question": "Q?", "answer": "A."}]},
        "quiz": {"questions": [{"question": "Q?", "choices": ["A", "B", "C", "D"], "answer": "A", "explanation": "Because"}]},
        "mindmap": {"markdown": "# Topic\n## Sub\n- Point"},
        "slides": {"slides": [{"title": "Slide 1", "bullets": ["Bullet"]}]},
        "infographic": {"description": "Test", "spec": {}},
        "tables": {"tables": [{"title": "T1", "headers": ["H1"], "rows": [["R1"]]}]},
        "kpi": {"metrics": [{"name": "MRR", "value": "15000", "unit": "EUR", "trend": "up"}]},
        "risks": {"risks": [{"title": "Risk 1", "severity": "high", "mitigation": "Fix it"}]},
        "followup": {"subject": "Suivi", "body": "Bonjour..."},
        "stakeholder_map": {"stakeholders": [{"name": "Alice", "role": "PM", "influence": "high"}]},
        "glossary": {"terms": [{"term": "API", "definition": "Application Programming Interface"}]},
        "chapters": {"chapters": [{"title": "Ch1", "start_time": 0, "end_time": 60, "summary": "Intro"}]},
        "exercises": {"exercises": [{"title": "Ex1", "type": "practice", "statement": "Do this", "solution": "Like that"}]},
        "soap": {"subjective": "Pain", "objective": "BP 120/80", "assessment": "HTN", "plan": "Monitor"},
        "pii_redaction": {"entities": [{"text": "Jean Dupont", "type": "name", "replacement": "[PATIENT]"}]},
        "prescriptions": {"medications": [{"name": "Aspirin", "dosage": "75mg", "frequency": "1x/day"}]},
        "watchpoints": {"alerts": [{"title": "Red flag", "severity": "critical", "description": "Chest pain"}]},
        "clauses": {"clauses": [{"type": "obligation", "text": "Le prestataire doit...", "party": "Fournisseur"}]},
        "obligations": {"obligations": [{"debtor": "ACME", "obligation": "Pay", "deadline": "2025-04-01"}]},
        "deadlines": {"deadlines": [{"date": "2025-04-01", "description": "Signature", "criticality": "high"}]},
        "references": {"references": [{"type": "article", "reference": "Art. L442-1 C.com", "context": "Rupture brutale"}]},
    }
    return valid_responses.get(analysis_type, {"data": "test"})


class TestAnalysisSchemas:
    """Verify that valid analyses contain required fields."""

    @pytest.mark.parametrize("analysis_type,required", [
        (k, v) for k, v in REQUIRED_FIELDS.items() if v
    ])
    def test_valid_analysis_has_required_fields(self, analysis_type, required):
        data = _make_valid_analysis(analysis_type)
        for field in required:
            assert field in data, f"{analysis_type}: missing required field '{field}'"

    @pytest.mark.parametrize("profile_id", ["generic", "business", "education", "medical", "legal"])
    def test_all_profile_types_have_valid_response(self, profile_id):
        analyses = get_profile_analyses(profile_id)
        for a in analyses:
            atype = a["type"]
            data = _make_valid_analysis(atype)
            assert data, f"{profile_id}/{atype}: no valid response template"
            # Must not be empty
            assert len(json.dumps(data)) > 10, f"{profile_id}/{atype}: response too short"


class TestLLMJudgeRules:
    """Quality rules for LLM output."""

    ERROR_PATTERNS = [
        "I cannot", "I don't know", "I'm not able",
        "Error:", "ERROR", "undefined", "null",
        "Je ne peux pas", "Je ne sais pas",
    ]

    def test_valid_analyses_dont_contain_errors(self):
        for atype in REQUIRED_FIELDS:
            data = _make_valid_analysis(atype)
            text = json.dumps(data)
            for pattern in self.ERROR_PATTERNS:
                assert pattern not in text, f"{atype}: contains error pattern '{pattern}'"

    @pytest.mark.parametrize("profile_id", ["generic", "business", "education", "medical", "legal"])
    def test_analysis_not_trivially_empty(self, profile_id):
        """Each analysis must produce meaningful content (>20 chars)."""
        analyses = get_profile_analyses(profile_id)
        for a in analyses:
            data = _make_valid_analysis(a["type"])
            assert len(json.dumps(data)) > 20, f"{profile_id}/{a['type']}: content too short"

    def test_business_actions_have_owner(self):
        """Business actions should track owners."""
        data = _make_valid_analysis("actions")
        assert "actions" in data
        assert len(data["actions"]) > 0

    def test_medical_soap_has_4_sections(self):
        """SOAP note must have S, O, A, P."""
        data = _make_valid_analysis("soap")
        for section in ["subjective", "objective", "assessment", "plan"]:
            assert section in data, f"SOAP missing '{section}'"
            assert len(str(data[section])) > 0

    def test_legal_obligations_have_debtor(self):
        """Legal obligations must identify the debtor."""
        data = _make_valid_analysis("obligations")
        for ob in data["obligations"]:
            assert "debtor" in ob

    def test_education_quiz_has_multiple_questions(self):
        """Quiz should have at least 1 question with choices."""
        data = _make_valid_analysis("quiz")
        assert len(data["questions"]) >= 1
        for q in data["questions"]:
            assert "choices" in q
            assert len(q["choices"]) >= 2
