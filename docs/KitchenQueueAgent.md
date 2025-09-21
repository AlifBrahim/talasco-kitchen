# Kitchen Queue Agent — Station Dispatcher (Backend-First)

This document describes the queueing agent integration that follows the backend strictly. The single source of truth for prioritization is the Kitchen Agents API’s station dispatcher. No local heuristics are used.

- Backend API: FastAPI service in this repo
- Primary agent endpoint: `GET /agents/station-dispatcher`
- Queue list endpoint (contextual UI): `GET /queue`
- Frontend file: `client/pages/KitchenDisplay.tsx` (uses the agent to render a leftmost “Do Now” panel)

## Core Principle

Always fetch prioritization from the backend agent. Do not compute or approximate order locally. If the agent is unavailable, show a clear empty state (and optionally list `/queue` items purely for context without reordering logic).

## Endpoints (as implemented by the backend)

1) Station Dispatcher (recommendations)
- Method: `GET`
- Path: `/agents/station-dispatcher`
- Query params:
  - `category` (string, required by client usage; e.g., `Food`, `Drink`, `Dessert`)
  - `limit` (int, optional; backend default is `3`)
- Response: `AgentRecommendation[]`

AgentRecommendation shape (from backend models):
```
{
  action: string,          // e.g., "Do now: Order 42 · Burger"
  reason: string,          // short reason, e.g., "SLA risk, est 8.0m"
  risks?: string | null,
  payload?: {
    orderid?: number,      // numeric ID
    itemid?: number,       // numeric ID
    score?: number         // agent score
  } | null
}
```

2) Category Queue (context only)
- Method: `GET`
- Path: `/queue`
- Query params:
  - `category` (string)
  - `limit` (int, default `5`)
- Response: `QueueItem[]` (ordered by `orderdate ASC` by the backend)

QueueItem shape (from backend models/tools):
```
{
  orderid: number,
  tablenumber?: number | null,
  itemid: number,
  itemname: string,
  category: string,
  orderdate: string,
  promisedat?: string | null,
  status: string,          // 'queued' | 'prepping' | ...
  quantity: number,
  est_prep_minutes?: number | null,
  remaining_items?: number | null,
  wait_minutes?: number | null,
  sla_overdue?: boolean | null
}
```

## Frontend Integration (KitchenDisplay)

- Env var: `NEXT_PUBLIC_KITCHEN_AGENTS_API` (e.g., `http://localhost:8000`).
- Poll `GET {API}/agents/station-dispatcher?category=Food&limit=8` every ~10s.
- Render the top recommendation in a left “Do Now” panel. Render the rest to the right.
- Do not compute local scores. If the agent returns an empty list, show an empty state.
- Optional: populate a separate queue panel using `GET {API}/queue?category=Food&limit=10` purely for context.

Mapping recommendations to local orders (for action buttons):
- UI order/item IDs are strings; backend payload uses numbers.
- Use string comparison: `orders.find(o => o.id === String(payload.orderid))`.
- If a match isn’t found in the current view, disable action buttons and show “Not in current view”.

Example fetch (browser):
```
const API = process.env.NEXT_PUBLIC_KITCHEN_AGENTS_API;
const url = `${API}/agents/station-dispatcher?category=Food&limit=8`;
const recs = await fetch(url).then(r => r.json());
```

## Actions (optional, not required by the agent)

If you want to send actions to the backend tools API, the backend exposes:
- `POST /item/start` with body `{ orderid: number, itemid: number }`
- `POST /item/hold` with body `{ orderid: number, itemid: number, minutes: number }`
- `POST /item/pass` with body `{ orderid: number, itemid: number }`

Your current UI may already use internal app routes for status updates. If you switch to the backend tools API, ensure CORS allows it and update request bodies to match the backend.

## Error Handling and Fallbacks

- If the dispatcher call fails, show an empty state (e.g., “No Items to Cook”) and an error message. Do not compute local rankings.
- You may still render the queue from `/queue` as a contextual list, but do not use it to derive priority.

## Category and Stationing

- Pass the current station’s category explicitly (e.g., `Food`, `Drink`, `Dessert`).
- The backend may set default prep minutes per category; rely on the backend output rather than local assumptions.

## CORS and Configuration

- Backend sets CORS via `FRONTEND_ORIGIN` (default `http://localhost:3000`). Ensure it matches your frontend origin.
- Frontend uses `NEXT_PUBLIC_KITCHEN_AGENTS_API` to call the backend directly from the browser.

## Testing Checklist

- Verify `GET /agents/station-dispatcher?category=Food&limit=3` returns `200` and an array.
- Confirm the KitchenDisplay leftmost panel updates with the top `action`/`reason`.
- Check that action buttons enable only when the recommended `orderid`/`itemid` exists in the current UI dataset.
- Confirm CORS is configured so the browser can reach the backend.

## Notes

- No local scoring/heuristics are used in the UI or intermediate endpoints.
- The queue endpoint is for display context; prioritization comes strictly from the dispatcher.
