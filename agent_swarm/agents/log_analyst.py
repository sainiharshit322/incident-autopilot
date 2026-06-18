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
        model="gemini-3.1-flash-lite",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=1.0,    
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

    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    analysis = json.loads(raw_text)

    return {**state, "log_analysis": analysis}