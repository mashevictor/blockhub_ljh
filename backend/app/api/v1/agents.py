from fastapi import APIRouter, HTTPException

from app.data.seed import AGENTS, CAPABILITIES

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
def list_agents() -> dict:
    return {"total": len(AGENTS), "items": AGENTS}


@router.get("/{agent_id}")
def get_agent(agent_id: str) -> dict:
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    caps = [c for c in CAPABILITIES if c["agent_id"] == agent_id]
    return {"agent": agent, "capabilities": caps}


@router.get("/{agent_id}/capabilities")
def agent_capabilities(agent_id: str) -> dict:
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    caps = [c for c in CAPABILITIES if c["agent_id"] == agent_id]
    return {"agent_id": agent_id, "total": len(caps), "items": caps}
