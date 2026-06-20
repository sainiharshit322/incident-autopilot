import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel
import json

from graph.incident_graph import incident_graph
import os
import httpx
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Incident Autopilot — Agent Swarm", lifespan=lifespan)


class AnalyzeRequest(BaseModel):
    incident_id: str
    alert_name:  str
    severity:    str
    service:     str
    log_snippet: str | None = None


class AnalyzeResponse(BaseModel):
    incident_id: str
    status:      str
    message:     str


class ResolveRequest(BaseModel):
    incident_id: str
    problem_statement: str


async def run_graph(request: AnalyzeRequest):

    initial_state = {
        "incident_id":       request.incident_id,
        "alert_name":        request.alert_name,
        "severity":          request.severity,
        "service":           request.service,
        "log_snippet":       request.log_snippet,
        "log_analysis":      {},
        "pattern_analysis":  {},
        "similar_incidents": [],
        "runbook":           {},
        "confidence_score":  0.0,
        "retry_count":       0,
        "retry_reason":      "",
    }

    try:
        final_state = await incident_graph.ainvoke(initial_state)
        print(
            f"[graph] incident={request.incident_id} "
            f"confidence={final_state.get('confidence_score', 0.0):.2f} "
            f"retries={final_state.get('retry_count', 0)}"
        )
    except Exception as e:
        print(f"[graph] ERROR for incident={request.incident_id}: {e}")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-swarm"}


@app.post("/analyze", response_model=AnalyzeResponse, status_code=202)
async def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Accepts the alert immediately (202) and runs the agent graph in the background.
    The graph calls back to Spring Boot via PATCH /incidents/{id} when done.
    """
    if not request.incident_id:
        raise HTTPException(status_code=400, detail="incident_id is required")

    background_tasks.add_task(run_graph, request)

    return AnalyzeResponse(
        incident_id=request.incident_id,
        status="accepted",
        message="Agent graph started — runbook will be patched back when complete",
    )


async def run_resolve(request: ResolveRequest):
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.7,
        )
        
        system_prompt = "You are an AI assistant generating a final resolution note for an incident. The incident has been marked as closed. Based on the problem statement provided, generate a concise 1-2 sentence resolution note indicating how the issue was resolved. Do not include any JSON formatting, markdown, or extra explanations. Just output the note text."
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Problem statement: {request.problem_statement}")
        ]
        
        response = llm.invoke(messages)
        
        # Handle thinking model list response if needed
        if isinstance(response.content, list):
            raw_text = next(
                block["text"]
                for block in response.content
                if isinstance(block, dict) and block.get("type") == "text"
            )
        else:
            raw_text = response.content
            
        resolution_note = raw_text.strip()
        
        gateway_url = os.getenv("GATEWAY_URL", "http://localhost:8080")
        
        status_payload = {
            "status": "CLOSED",
            "resolutionNote": resolution_note
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            status_response = await client.patch(
                f"{gateway_url}/api/v1/incidents/{request.incident_id}/status",
                json=status_payload,
            )
            status_response.raise_for_status()
            print(f"[run_resolve] Successfully closed incident {request.incident_id} with AI note.")
            
    except Exception as e:
        print(f"[run_resolve] ERROR for incident={request.incident_id}: {e}")

@app.post("/resolve", status_code=202)
async def resolve_incident(request: ResolveRequest, background_tasks: BackgroundTasks):
    if not request.incident_id:
        raise HTTPException(status_code=400, detail="incident_id is required")
        
    background_tasks.add_task(run_resolve, request)
    return {"status": "accepted", "message": "Resolution generation started"}


async def handle_slack_close(incident_id: str):
    gateway_url = os.getenv("GATEWAY_URL", "http://localhost:8080")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{gateway_url}/api/v1/incidents/{incident_id}")
            resp.raise_for_status()
            incident = resp.json()
            problem_statement = incident.get("alertName", "Unknown alert")
            
            # Now run resolve
            resolve_req = ResolveRequest(incident_id=incident_id, problem_statement=problem_statement)
            await run_resolve(resolve_req)
        except Exception as e:
            print(f"[slack_interactions] ERROR handling close for {incident_id}: {e}")

class NotifyRequest(BaseModel):
    incident_id: str
    alert_name: str
    status: str
    resolution_note: str

@app.post("/notify_status", status_code=202)
async def notify_status(request: NotifyRequest, background_tasks: BackgroundTasks):
    from tools.slack_notifier import send_status_update_notification
    background_tasks.add_task(send_status_update_notification, request.model_dump())
    return {"status": "accepted"}