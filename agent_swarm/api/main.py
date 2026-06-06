from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Incident Autopilot - Agent Swarm")


class AnalyzeRequest(BaseModel):
    incident_id: str
    alert_name: str
    severity: str
    service: str
    log_snippet: str | None = None


class AnalyzeResponse(BaseModel):
    incident_id: str
    status: str
    message: str


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-swarm"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    # Will be wired to LangGraph in Day 5
    return AnalyzeResponse(
        incident_id=request.incident_id,
        status="accepted",
        message="Analysis queued — agents not yet wired"
    )