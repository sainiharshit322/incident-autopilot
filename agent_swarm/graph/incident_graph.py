import os
from typing import TypedDict, Literal
from dotenv import load_dotenv
import httpx

from langgraph.graph import StateGraph, START, END
from agents.log_analyst import analyze_logs
from agents.pattern_matcher import find_similar_incidents
from agents.runbook_writer import write_runbook
from tools.slack_notifier import send_incident_notification

load_dotenv()

MAX_RETRIES = 2
CONFIDENCE_THRESHOLD = 0.6


class IncidentState(TypedDict):
    # Inputs (set once at entry)
    incident_id:       str
    alert_name:        str
    severity:          str
    service:           str
    log_snippet:       str | None

    # Populated by agents
    log_analysis:      dict
    pattern_analysis:  dict
    similar_incidents: list

    # Populated by runbook writer
    runbook:           dict
    confidence_score:  float

    # Supervisor bookkeeping
    retry_count:       int
    retry_reason:      str


def confidence_gate(state: IncidentState) -> Literal["retry", "publish"]:
    """
    After write_runbook:
      - confidence < threshold AND retries remaining  → retry (loop back to analyze_logs)
      - otherwise                                     → publish
    """
    confidence = state.get("confidence_score", 0.0)
    retry_count = state.get("retry_count", 0)

    if confidence < CONFIDENCE_THRESHOLD and retry_count < MAX_RETRIES:
        return "retry"
    return "publish"


def increment_retry(state: IncidentState) -> IncidentState:
    """
    Bump retry_count and attach a retry_reason to the state so
    analyze_logs gets richer context on the next pass.
    """
    return {
        **state,
        "retry_count": state.get("retry_count", 0) + 1,
        "retry_reason": (
            f"Previous confidence {state.get('confidence_score', 0.0):.2f} "
            f"was below threshold {CONFIDENCE_THRESHOLD}. "
            "Re-analyze with extra scrutiny."
        ),
    }


async def publish_results(state: IncidentState) -> IncidentState:
    """
    1. Calls Spring Boot PATCH /api/v1/incidents/{id} to persist the runbook.
    2. Sends a Slack Block Kit notification.
    Both steps fail silently — the runbook is already in state for the caller.
    """
    gateway_url = os.getenv("GATEWAY_URL", "http://localhost:8080")
    incident_id = state.get("incident_id")
    runbook     = state.get("runbook", {})

    payload = {
        "rootCause":       runbook.get("root_cause_explanation", ""),
        "runbookDraft":    str(runbook),
        "confidenceScore": state.get("confidence_score", 0.0),
        "status":          "INVESTIGATING",
    }

    # ── 1. Callback to Spring Boot gateway ──────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.patch(
                f"{gateway_url}/api/v1/incidents/{incident_id}",
                json=payload,
            )
            response.raise_for_status()
    except Exception as e:
        print(f"[publish_results] WARNING: gateway callback failed: {e}")

    # ── 2. Slack notification ────────────────────────────────────────────────
    try:
        await send_incident_notification(state)
        print(f"[publish_results] Slack notification sent for incident {incident_id}")
    except Exception as e:
        print(f"[publish_results] WARNING: Slack notification failed: {e}")

    return state


def build_incident_graph():
    builder = StateGraph(IncidentState)

    # Nodes
    builder.add_node("analyze_logs",        analyze_logs)
    builder.add_node("find_similar",        find_similar_incidents)
    builder.add_node("write_runbook",       write_runbook)
    builder.add_node("increment_retry",     increment_retry)
    builder.add_node("publish_results",     publish_results)

    # Happy path edges
    builder.add_edge(START,            "analyze_logs")
    builder.add_edge("analyze_logs",   "find_similar")
    builder.add_edge("find_similar",   "write_runbook")

    # Confidence gate after write_runbook
    builder.add_conditional_edges(
        "write_runbook",
        confidence_gate,
        {
            "retry":   "increment_retry",
            "publish": "publish_results",
        },
    )

    # Retry loop: increment_retry → back to analyze_logs
    builder.add_edge("increment_retry", "analyze_logs")

    # Terminal edge
    builder.add_edge("publish_results", END)

    return builder.compile()


# Singleton — compiled once, reused across all requests
incident_graph = build_incident_graph()