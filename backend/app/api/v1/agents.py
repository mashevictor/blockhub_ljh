from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services import catalog_store

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
def list_agents(db: Annotated[Session, Depends(get_db)]) -> dict:
    items = catalog_store.list_agents(db)
    return {"total": len(items), "items": items}


@router.get("/{agent_id}")
def get_agent(agent_id: str, db: Annotated[Session, Depends(get_db)]) -> dict:
    detail = catalog_store.get_agent(db, agent_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return detail


@router.get("/{agent_id}/capabilities")
def agent_capabilities(agent_id: str, db: Annotated[Session, Depends(get_db)]) -> dict:
    detail = catalog_store.get_agent(db, agent_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    caps = detail["capabilities"]
    return {"agent_id": agent_id, "total": len(caps), "items": caps}
