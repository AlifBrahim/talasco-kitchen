"""FastAPI application exposing kitchen agent operations."""

from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import Body, Depends, FastAPI, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from app.agents import AgentRegistry
from app.config import get_settings
from app.db import Database

app = FastAPI(title="Kitchen Agents API", version="1.0.0")


class AgentRunRequest(BaseModel):
    """Payload for running an agent."""

    prompt: str


class AgentRunResponse(BaseModel):
    """Response returned after invoking an agent."""

    output: str
    stop_reason: str | None = None


def get_registry() -> Generator[AgentRegistry, None, None]:
    """Provide an AgentRegistry tied to a fresh database pool."""

    settings = get_settings()
    database = Database(settings.database)
    registry = AgentRegistry(database, settings)
    try:
        yield registry
    finally:
        database.close()


@app.get("/health")
async def health() -> dict[str, str]:
    """Simple readiness probe."""

    return {"status": "ok"}


@app.get("/agents")
async def list_agents(registry: AgentRegistry = Depends(get_registry)) -> dict[str, list[str]]:
    """Return all agent identifiers registered in the system."""

    return {"agents": registry.agent_names()}


@app.post("/agents/{agent_name}/run", response_model=AgentRunResponse)
async def run_agent(
    agent_name: str,
    payload: AgentRunRequest,
    registry: AgentRegistry = Depends(get_registry),
) -> AgentRunResponse:
    """Invoke a named agent with the provided prompt."""

    try:
        agent = registry.get_agent(agent_name)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    result = agent(payload.prompt)
    stop_reason = getattr(result, "stop_reason", None)
    return AgentRunResponse(output=str(result).strip(), stop_reason=stop_reason)


@app.post("/tools/{tool_name}")
async def call_tool(
    tool_name: str,
    payload: dict[str, Any] = Body(default_factory=dict),
    registry: AgentRegistry = Depends(get_registry),
) -> Any:
    """Execute a tool with the provided payload."""

    try:
        outcome = registry.call_tool(tool_name, **payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return jsonable_encoder({"result": outcome})
