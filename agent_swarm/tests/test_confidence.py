import pytest
from agents.log_analyst import analyze_logs
from agents.pattern_matcher import find_similar_incidents
from agents.runbook_writer import write_runbook


@pytest.mark.integration
def test_empty_logs_agent_confidence_below_threshold():
    """
    DeepEval assertion: agent must know when it doesn't know.
    Empty logs must never produce a confident analysis.
    """
    state = {
        "incident_id": "deepeval-001",
        "alert_name": "UnknownAlert",
        "severity": "P2",
        "service": "nonexistent-service",
        "log_snippet": None,
    }

    state = analyze_logs(state)

    assert state["log_analysis"]["confidence"] < 0.5, (
        f"HALLUCINATION DETECTED: agent confidence was "
        f"{state['log_analysis']['confidence']:.2f} on empty logs — must be below 0.5"
    )


@pytest.mark.integration
def test_real_logs_returns_all_required_keys():
    """
    DeepEval assertion: structured output must be complete.
    Agent must return every required key with correct types.
    """
    state = {
        "incident_id": "deepeval-002",
        "alert_name": "HighErrorRate",
        "severity": "P1",
        "service": "payment-service",
        "log_snippet": None,
    }

    state = analyze_logs(state)
    analysis = state["log_analysis"]

    required_keys = {"error_type", "root_cause_component", "severity", "confidence", "summary"}
    missing = required_keys - analysis.keys()
    assert not missing, f"Missing keys in log analysis: {missing}"
    assert isinstance(analysis["confidence"], float), "confidence must be a float"
    assert isinstance(analysis["summary"], str) and len(analysis["summary"]) > 0, \
        "summary must be a non-empty string"
    assert analysis["severity"] in ("P1", "P2", "P3"), \
        f"severity must be P1/P2/P3, got: {analysis['severity']}"


@pytest.mark.integration
def test_runbook_immediate_steps_non_empty():
    """
    DeepEval assertion: runbook must be actionable.
    immediate_steps must be a list with at least 3 items.
    """
    state = {
        "incident_id": "deepeval-003",
        "alert_name": "HighErrorRate",
        "severity": "P1",
        "service": "payment-service",
        "log_snippet": None,
    }

    state = analyze_logs(state)
    state = find_similar_incidents(state)
    state = write_runbook(state)

    steps = state["runbook"].get("immediate_steps", [])
    assert isinstance(steps, list), "immediate_steps must be a list"
    assert len(steps) >= 3, (
        f"immediate_steps must have at least 3 items — got {len(steps)}: {steps}"
    )
    for step in steps:
        assert isinstance(step, str) and len(step) > 0, \
            f"Each step must be a non-empty string, got: {step}"


@pytest.mark.integration
def test_full_chain_empty_logs_final_confidence_below_gate():
    """
    DeepEval assertion: the LangGraph supervisor gate must hold.
    Full chain on empty logs must produce confidence below 0.6
    so the supervisor would trigger a retry in production.
    """
    state = {
        "incident_id": "deepeval-004",
        "alert_name": "UnknownAlert",
        "severity": "P2",
        "service": "nonexistent-service",
        "log_snippet": None,
    }

    state = analyze_logs(state)
    state = find_similar_incidents(state)
    state = write_runbook(state)

    final_confidence = state["confidence_score"]
    assert final_confidence < 0.6, (
        f"Confidence gate would have passed a weak runbook — "
        f"final confidence was {final_confidence:.2f}, must be below 0.6"
    )