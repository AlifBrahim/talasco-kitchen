# FastAPI Integration Guide

## Goal
Expose the existing kitchen agents through a FastAPI service so the Next.js frontend can trigger agent runs, tool invocations, and status checks via REST endpoints.

## Architecture Snapshot
- **FastAPI app**: Lives alongside `main.py`, reuses `AgentRegistry` and `Database` from `app/`.
- **Uvicorn server**: Runs the ASGI app; use `uvicorn app.api:app --reload` during development.
- **Next.js frontend**: Calls the FastAPI endpoints through API routes (BFF layer) to centralise auth and request shaping.

## Project Layout Update
```
StrandsAgent/
├─ app/
│  ├─ api.py          # new FastAPI app with routers
│  ├─ dependencies.py # shared DI helpers (optional)
│  └─ ...             # existing modules
├─ main.py            # CLI remains for local workflows
└─ FastAPI_Integration.md
```

## Backend Setup Steps
1. Install web extras: `pip install "fastapi[all]" uvicorn`. Lock versions in `requirements.txt`.
2. Create `app/api.py` with the `FastAPI` instance and include routers for agents and tools.
3. Provide dependencies that yield `AgentRegistry` and `Database` per request. Example:
```python
from fastapi import Depends, FastAPI
from app.agents import AgentRegistry
from app.config import get_settings
from app.db import Database

app = FastAPI(title="Kitchen Agents API")

def get_registry() -> AgentRegistry:
    settings = get_settings()
    db = Database(settings.database)
    try:
        yield AgentRegistry(db, settings)
    finally:
        db.close()
```
4. Add endpoints:
   - `GET /agents` → list agent names
   - `POST /agents/{name}/run` → accept `prompt`, trigger agent, return response and `stop_reason`
   - `POST /tools/{tool_name}` → accept JSON payload, call `registry.call_tool`
5. Start the server: `uvicorn app.api:app --reload --host 0.0.0.0 --port 8000`.

## Handling Long Operations
- **Sync**: For short prompts, run agent calls directly inside endpoint.
- **Background tasks**: Use `BackgroundTasks` for work that can finish quickly without streaming.
- **Queue**: For durable processing, enqueue jobs via RQ or Celery; return a job ID and expose `GET /jobs/{id}` for status polling.
- **Streaming**: If Bedrock streaming is needed, integrate `sse-starlette` or WebSocket endpoints to push partial responses.

## Next.js Consumption Pattern
1. Wrap FastAPI with a Next.js route handler (`app/api/agents/[name]/route.ts`) that forwards requests and injects session tokens.
2. Use `fetch` with `cache: "no-store"` for real-time agent feedback.
3. Display optimistic UI states while awaiting responses; poll `jobs` endpoint if background queues are used.

## Security & Observability
- Forward auth headers from Next.js, validate JWT/API keys at the FastAPI layer, and log denied requests.
- Rate-limit agent runs (e.g., `slowapi`) to protect Bedrock quotas.
- Add structured logging via `loguru` or standard library to trace agent/tool calls and durations.
- Monitor with OpenTelemetry exporters if you need distributed tracing across services.

## Launch Checklist
- [ ] Requirements updated and lockfile regenerated (if any).
- [ ] FastAPI app implements the minimal agent/tool endpoints.
- [ ] Uvicorn process managed by Procfile/systemd or container entrypoint.
- [ ] Next.js routes verified against staging FastAPI instance.
- [ ] Observability and error alerts configured before production rollout.
