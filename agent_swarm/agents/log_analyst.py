import json
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

SYSTEM_PROMPT = """You are an expert SRE log analyst. You will be given an incident description and raw log lines.

Analyze them and respond ONLY with a valid JSON object in this exact structure — no markdown, no explanation, no code fences:

{
  "error_type": "<short category, e.g. NullPointerException / OOMKilled / ConnectionTimeout>",
  "root_cause_component": "<the specific service, pod, or function that is the source>",
  "severity": "<one of: P1 / P2 / P3>",
  "confidence": <float between 0.0 and 1.0>,
  "summary": "<one concise sentence describing what is failing and why>"
}

Rules:
- If logs are empty or insufficient to draw a conclusion, set confidence below 0.5 and be honest in the summary.
- Do not invent details not present in the logs.
- Respond with JSON only. Any non-JSON response is a failure."""


def fetch_recent_logs(service: str, alert_name: str) -> str:
    """
    Returns fake log lines for a given service.
    In Week 2 Day 3+ this will be replaced with real log fetching.
    """
    fake_logs = {
        "payment-service": (
            "2024-01-15T10:23:01Z ERROR PaymentProcessor - "
            "java.lang.NullPointerException: Cannot invoke method charge() on null object\n"
            "2024-01-15T10:23:01Z ERROR PaymentProcessor - at PaymentProcessor.process(PaymentProcessor.java:87)\n"
            "2024-01-15T10:23:02Z WARN  CircuitBreaker - payment-service circuit OPEN after 5 failures\n"
            "2024-01-15T10:23:02Z ERROR Gateway - upstream payment-service returned 500 (attempt 3/3)"
        ),
        "auth-service": (
            "2024-01-15T10:24:10Z ERROR AuthController - "
            "io.lettuce.core.RedisConnectionException: Unable to connect to Redis at redis:6379\n"
            "2024-01-15T10:24:10Z ERROR JwtFilter - Token validation failed: Redis unavailable\n"
            "2024-01-15T10:24:11Z WARN  ConnectionPool - All 10 connections exhausted, queue depth 47\n"
            "2024-01-15T10:24:12Z ERROR AuthController - Returning 503 to all auth requests"
        ),
        "api-gateway": (
            "2024-01-15T10:25:00Z ERROR LoadBalancer - "
            "No healthy upstream instances for service api-gateway\n"
            "2024-01-15T10:25:00Z WARN  HealthCheck - 3/3 instances failing /health endpoint\n"
            "2024-01-15T10:25:01Z ERROR K8s - OOMKilled: container api-gateway-pod-7f8b9 "
            "exceeded memory limit 512Mi"
        ),
    }
    return fake_logs.get(service, "")  # Empty string if service not in fake data


def analyze_logs(state: dict) -> dict:
    """
    Agent 1: Log Analyst.

    Accepts an incident state dict with keys:
      - incident_id (str)
      - alert_name (str)
      - severity (str)
      - service (str)
      - log_snippet (str | None)  — optional pre-provided logs

    Returns the state dict updated with a 'log_analysis' key containing
    the parsed JSON dict from the LLM.
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=1.0,    # Required for Gemini 3+ models per langchain-google-genai docs
    )

    logs = state.get("log_snippet") or fetch_recent_logs(
        state.get("service", ""), state.get("alert_name", "")
    )

    human_content = (
        f"Alert name: {state.get('alert_name', 'unknown')}\n"
        f"Service: {state.get('service', 'unknown')}\n"
        f"Reported severity: {state.get('severity', 'unknown')}\n\n"
        f"Log lines:\n{logs if logs else '[No logs available]'}"
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=human_content),
    ]

    response = llm.invoke(messages)

    if isinstance(response.content, list):
        raw_text = next(
            block["text"]
            for block in response.content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    else:
        raw_text = response.content

    raw_text = raw_text.strip()

    # Strip markdown code fences if the model wraps JSON anyway
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    analysis = json.loads(raw_text)

    return {**state, "log_analysis": analysis}