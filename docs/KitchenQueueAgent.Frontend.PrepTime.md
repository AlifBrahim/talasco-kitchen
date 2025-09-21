# Frontend — Kitchen Display (Prep-Time Priority)

This guide explains how the Kitchen Display should consume the Station Dispatcher’s prep-time–based recommendations and render the “Do Now” panel without local heuristics.

- Dispatcher endpoint: `GET {API}/agents/station-dispatcher?category=Food&limit=8`
- Contextual queue: `GET {API}/queue?category=Food&limit=10`
- API base: `NEXT_PUBLIC_KITCHEN_AGENTS_API` (e.g., `http://localhost:8000`)

## Contract

AgentRecommendation:
```
{
  action: string,          // "Do now: Order 42 · Burger"
  reason: string,          // "Shortest prep (6.0m)" or with suffix ", +tie by wait"
  payload?: {
    orderid?: number,
    itemid?: number,
    score?: number         // optional 1/pred_minutes for reference
  } | null
}
```

QueueItem (context-only):
```
{
  orderid: number,
  tablenumber?: number | null,
  itemid: number,
  itemname: string,
  category: string,
  orderdate: string,
  promisedat?: string | null,
  status: string,
  quantity: number,
  est_prep_minutes?: number | null,
  predicted_prep_minutes?: number | null,
  menu_avg_prep_minutes?: number | null,
  menu_prep_time_minutes?: number | null,
  remaining_items?: number | null,
  wait_minutes?: number | null,
  sla_overdue?: boolean | null
}
```

Notes:
- Frontend must not compute local rankings. Render dispatcher output as-is.
- `payload.orderid`/`itemid` are numeric; compare them to string IDs in UI with `String(payload.orderid)`.
- If the dispatcher returns `[]`, show an empty state (e.g., “No Items to Cook”).

## UI Behavior

- Poll dispatcher every ~10s for the selected `category` (`Food`, `Drink`, `Dessert`).
- Left panel: pin the first recommendation `recs[0]` as “Do Now”.
- Right panel: show the contextual queue from `/queue` unmodified (for awareness only).
- Show `reason` under the action. If present, show `score` as small text.
- If the referenced order/item is not loaded in the current UI orders view, disable action buttons and show “Not in current view”.

## Example (React/Next.js)

```
const API = process.env.NEXT_PUBLIC_KITCHEN_AGENTS_API;
const url = `${API}/agents/station-dispatcher?category=Food&limit=8`;
const recs = await fetch(url).then(r => r.json());

const queue = await fetch(`${API}/queue?category=Food&limit=10`).then(r => r.json());
```

Render:
- Title: “Do Now: Order X · Item”
- Reason: text from `reason` (e.g., “Shortest prep (6.0m), +tie by wait”).
- Optional: a small “Score” if `payload.score` is present.

## States

- Loading: show spinner or subtle “Loading…” text.
- Empty: show a neutral placeholder: “No Items to Cook”.
- Error: show a short message; do not attempt local ranking.

## Category & Routing

- Pass the category explicitly per station view.
- Switching category updates both the dispatcher call and the contextual queue call.

## Optional Extension: Order Completion Objective

If the backend exposes an order-completion–aware mode (e.g., `?mode=order`), the UI does not change. The ranking still comes from the backend. You may display richer `reason` text like:
- “Finish table: last item, Shortest prep (6.0m)”
- “Shortest prep (4.0m), +batch 3× Burger”

No client-side computation is required; simply render `action` and `reason` supplied by the agent.

## Quick Checks

- Top recommendation updates as queue changes and is placed on the left.
- Reasons read as prep-time based; ties sometimes include “+tie by wait”.
- Queue panel shows `Est X.Xm` when `est_prep_minutes` is available.

