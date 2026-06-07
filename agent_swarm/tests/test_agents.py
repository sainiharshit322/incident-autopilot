import json
import pytest
from agents.log_analyst import analyze_logs, fetch_recent_logs


# --- Unit tests (no LLM call) ---

def test_fetch_logs_known_service():
    logs = fetch_recent_logs("payment-service", "HighErrorRate")
    assert len(logs) > 0
    assert "NullPointerException" in logs


def test_fetch_logs_unknown_service_returns_empty():
    logs = fetch_recent_logs("nonexistent-service", "SomeAlert")
    assert logs == ""


# --- Integration tests (real Gemini API call) ---
# These require GEMINI_API_KEY in your .env file.
# Mark them so you can skip them offline: pytest -m "not integration"

@pytest.mark.integration
def test_analyze_logs_known_service_returns_valid_json():
    """
    Send a known service incident through the agent.
    The returned dict must have all required keys and correct types.
    """
    state = {
        "incident_id": "test-001",
        "alert_name": "HighErrorRate",
        "severity": "P1",
        "service": "payment-service",
        "log_snippet": None,
    }
    result = analyze_logs(state)

    assert "log_analysis" in result
    analysis = result["log_analysis"]

    required_keys = {"error_type", "root_cause_component", "severity", "confidence", "summary"}
    assert required_keys.issubset(analysis.keys()), (
        f"Missing keys: {required_keys - analysis.keys()}"
    )
    assert isinstance(analysis["confidence"], float)
    assert 0.0 <= analysis["confidence"] <= 1.0
    assert analysis["severity"] in ("P1", "P2", "P3")
    assert isinstance(analysis["summary"], str) and len(analysis["summary"]) > 0


@pytest.mark.integration
def test_analyze_logs_empty_logs_yields_low_confidence():
    """
    When no logs are available, the agent must NOT hallucinate.
    Confidence must be below 0.5.
    """
    state = {
        "incident_id": "test-002",
        "alert_name": "UnknownAlert",
        "severity": "P2",
        "service": "nonexistent-service",   # fetch_recent_logs returns ""
        "log_snippet": None,
    }
    result = analyze_logs(state)

    assert "log_analysis" in result
    analysis = result["log_analysis"]
    assert analysis["confidence"] < 0.5, (
        f"Agent hallucinated on empty logs — confidence was {analysis['confidence']}"
    )


@pytest.mark.integration
def test_write_runbook_returns_valid_structure():
    """
    Full 3-agent chain: log analyst → pattern matcher → runbook writer.
    The runbook must have all required keys with correct types.
    """
    from agents.runbook_writer import write_runbook
    from agents.pattern_matcher import find_similar_incidents

    state = {
        "incident_id": "test-004",
        "alert_name": "HighErrorRate",
        "severity": "P1",
        "service": "payment-service",
        "log_snippet": None,
    }

    state = analyze_logs(state)
    state = find_similar_incidents(state)
    state = write_runbook(state)

    assert "runbook" in state
    runbook = state["runbook"]

    required_keys = {
        "title", "severity", "estimated_resolution_minutes",
        "immediate_steps", "root_cause_explanation",
        "prevention", "confidence"
    }
    assert required_keys.issubset(runbook.keys()), (
        f"Missing keys: {required_keys - runbook.keys()}"
    )
    assert isinstance(runbook["immediate_steps"], list)
    assert len(runbook["immediate_steps"]) >= 3
    assert isinstance(runbook["estimated_resolution_minutes"], int)
    assert 0.0 <= runbook["confidence"] <= 1.0
    assert "confidence_score" in state


@pytest.mark.integration
def test_write_runbook_empty_logs_low_confidence():
    """
    When logs are empty, the final runbook confidence must stay below 0.6.
    This is the guard against the LangGraph supervisor accepting a bad runbook.
    """
    from agents.runbook_writer import write_runbook
    from agents.pattern_matcher import find_similar_incidents

    state = {
        "incident_id": "test-005",
        "alert_name": "UnknownAlert",
        "severity": "P2",
        "service": "nonexistent-service",
        "log_snippet": None,
    }

    state = analyze_logs(state)
    state = find_similar_incidents(state)
    state = write_runbook(state)

    assert state["runbook"]["confidence"] < 0.6, (
        f"Runbook writer should not be confident on empty logs — "
        f"got {state['runbook']['confidence']}"
    )