import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel

from graph.incident_graph import incident_graph

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