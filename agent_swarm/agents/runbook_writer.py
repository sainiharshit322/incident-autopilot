import os
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

SYSTEM_PROMPT = """You are a senior SRE engineer writing an incident runbook.
You will be given a structured log analysis and pattern matching results from similar past incidents.

Produce a complete, actionable runbook. Respond ONLY with a valid JSON object
in this exact structure — no markdown, no explanation, no code fences:

{
  "title": "<short incident title>",
  "severity": "<P1 / P2 / P3>",
  "estimated_resolution_minutes": <integer>,
  "immediate_steps": [
    "<step 1 — specific, actionable command or action>",
    "<step 2>",
    "<step 3 minimum, up to 6>"
  ],
  "root_cause_explanation": "<2-3 sentences explaining what failed and why>",
  "prevention": "<one concrete prevention measure for the future>",
  "confidence": <float between 0.0 and 1.0>
}

Rules:
- immediate_steps must be specific and actionable (e.g. 'kubectl rollout restart deployment/payment-service', not 'restart the service').
- confidence must reflect how certain you are given the evidence. Boost it if past incidents matched.
- If evidence is weak or logs were empty, confidence must be below 0.6.
- Respond with JSON only."""


def write_runbook(state: dict) -> dict:
    """
    Agent 3: Runbook Writer.

    Reads log_analysis, pattern_analysis, and similar_incidents from state.
    Produces a structured runbook JSON and stores it under 'runbook' key.
    Also computes final 'confidence_score' used by the LangGraph supervisor.
    """
    log_analysis    = state.get("log_analysis", {})
    pattern_analysis = state.get("pattern_analysis", {})
    similar_incidents = state.get("similar_incidents", [])

    # Build similar incidents context string
    if similar_incidents:
        past_context = "\n".join([
            f"- [{i['incident_id']}] {i['summary']} → resolved by: {i['resolution']}"
            for i in similar_incidents
        ])
    else:
        past_context = "None available."

    human_content = (
        f"=== Log Analysis ===\n"
        f"Error type: {log_analysis.get('error_type', 'unknown')}\n"
        f"Root cause component: {log_analysis.get('root_cause_component', 'unknown')}\n"
        f"Severity: {log_analysis.get('severity', 'unknown')}\n"
        f"Log analysis confidence: {log_analysis.get('confidence', 0.0)}\n"
        f"Summary: {log_analysis.get('summary', 'No summary available')}\n\n"
        f"=== Pattern Matching ===\n"
        f"Pattern found: {pattern_analysis.get('pattern_found', False)}\n"
        f"Pattern description: {pattern_analysis.get('pattern_description', 'N/A')}\n"
        f"Resolution hint: {pattern_analysis.get('suggested_resolution_hint', 'N/A')}\n"
        f"Confidence boost from pattern: {pattern_analysis.get('confidence_boost', 0.0)}\n\n"
        f"=== Similar Past Incidents ===\n"
        f"{past_context}"
    )

    llm = ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=1.0,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=human_content),
    ]

    response = llm.invoke(messages)

    # Handle thinking model list response
    if isinstance(response.content, list):
        raw_text = next(
            block["text"]
            for block in response.content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    else:
        raw_text = response.content

    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    runbook = json.loads(raw_text)

    return {
        **state,
        "runbook": runbook,
        "confidence_score": runbook.get("confidence", 0.0),
        "retry_count": state.get("retry_count", 0),
    }