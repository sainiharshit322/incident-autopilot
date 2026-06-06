import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from tools.vector_search import embed_text, search_similar_incidents
import json

load_dotenv()

SYSTEM_PROMPT = """You are an SRE pattern recognition expert. You will be given:
1. A current incident's log analysis
2. A list of similar past resolved incidents from our database

Your job is to identify if any past incidents match the current one and summarize the pattern.

Respond ONLY with a valid JSON object in this exact structure — no markdown, no explanation, no code fences:

{
  "pattern_found": <true or false>,
  "matched_incident_ids": ["INC-XXX", ...],
  "pattern_description": "<one sentence describing the recurring pattern, or 'No clear pattern found'>",
  "suggested_resolution_hint": "<brief hint from past resolutions, or 'No historical data available'>",
  "confidence_boost": <float between 0.0 and 0.3, how much this pattern match should boost overall confidence>
}

Rules:
- Only set pattern_found to true if similarity is above 0.5 for at least one match.
- If no similar incidents exist, set pattern_found to false and confidence_boost to 0.0.
- Respond with JSON only."""


def find_similar_incidents(state: dict) -> dict:
    """
    Agent 2: Pattern Matcher.

    Reads log_analysis from state, embeds the summary,
    searches pgvector for similar resolved incidents,
    then asks the LLM to interpret the pattern.

    Returns state updated with 'pattern_analysis' key.
    """
    log_analysis = state.get("log_analysis", {})
    summary = log_analysis.get("summary", "")

    # If there's no summary from agent 1, skip gracefully
    if not summary:
        return {
            **state,
            "pattern_analysis": {
                "pattern_found": False,
                "matched_incident_ids": [],
                "pattern_description": "No log analysis summary available to search against",
                "suggested_resolution_hint": "No historical data available",
                "confidence_boost": 0.0,
            },
        }

    # Embed the summary and search for similar past incidents
    query_embedding = embed_text(summary)
    similar_incidents = search_similar_incidents(query_embedding, limit=3)

    # Format similar incidents for the LLM prompt
    if similar_incidents:
        incidents_text = "\n\n".join([
            f"Incident {i['incident_id']} (similarity: {i['similarity']}):\n"
            f"  Alert: {i['alert_name']} | Service: {i['service']}\n"
            f"  Summary: {i['summary']}\n"
            f"  Root cause: {i['root_cause']}\n"
            f"  Resolution: {i['resolution']}"
            for i in similar_incidents
        ])
    else:
        incidents_text = "No similar past incidents found in the database."

    human_content = (
        f"Current incident log analysis:\n"
        f"  Error type: {log_analysis.get('error_type', 'unknown')}\n"
        f"  Root cause component: {log_analysis.get('root_cause_component', 'unknown')}\n"
        f"  Summary: {summary}\n\n"
        f"Similar past incidents:\n{incidents_text}"
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

    # Handle thinking model list response (same fix as log_analyst)
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

    pattern_analysis = json.loads(raw_text)

    return {**state, "pattern_analysis": pattern_analysis, "similar_incidents": similar_incidents}