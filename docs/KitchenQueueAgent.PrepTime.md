# Kitchen Queue Agent — Prep-Time–Based Prioritization

This guide specifies how the station dispatcher must prioritize items using the menu catalog’s prep-time field. Use this as an addendum to `docs/KitchenQueueAgent.md`. The backend agent (source of truth) determines ordering; the frontend must not compute local heuristics.

- Primary agent endpoint: `GET /agents/station-dispatcher?category=Food&limit=8`
- Contextual queue endpoint: `GET /queue?category=Food&limit=10`
- Frontend: calls the above and renders as-is (no local ranking)

## Data Fields

Use the menu-level prep-time as the baseline estimate:
- Normalized schema: `menu_items.avg_prep_minutes` (numeric)
- Legacy schema: `menuitems.prep_time_minutes` (numeric)
- Enqueue-time copy: `order_items.predicted_prep_minutes` should be seeded from the menu value and may be overridden later by models or operations tools.

If multiple fields exist, resolve in this order:
1) `order_items.predicted_prep_minutes` (if present)
2) `menu_items.avg_prep_minutes` (normalized) or `menuitems.prep_time_minutes` (legacy)
3) Default fallback: `null` → treat as a large number for ranking so known items are preferred first

## Dispatcher Rule (Required)

When producing `AgentRecommendation[]` for a given `category`:
- Select candidate items for that category.
- Determine `pred_minutes` per item using the resolution order above.
- Sort strictly by `pred_minutes ASC` (shortest first).
- Produce the top N recommendations as the response (N = `limit`, default 3–8).

Optional (tie-breakers only, do not override primary rule):
- If `pred_minutes` are equal, prefer the item with greater `wait_minutes`.
- If `pred_minutes` and `wait_minutes` are equal, prefer status `prepping` over `queued`.

## Response Shape (Unchanged)

Return the standard payload documented in `KitchenQueueAgent.md`:
```
{
  action: string,          // e.g., "Do now: Order 42 · Burger"
  reason: string,          // e.g., "Shortest prep (6.0m)"
  payload?: {
    orderid?: number,
    itemid?: number,
    score?: number         // optional; you may omit or set to 1/pred_minutes
  } | null
}
```

Suggested `reason` strings:
- `Shortest prep (X.Xm)`
- `Shortest prep (X.Xm), +tie by wait`

## Contextual Queue (Read-Only)

- `GET /queue` may include `est_prep_minutes` per item.
- The dispatcher may use these values directly, but must still obey the prioritization rule above.
- The frontend may render `/queue` for context only; do not use it to derive priority.

## Frontend Contract (Reminder)

- Pass `category` explicitly (e.g., `Food`, `Drink`, `Dessert`).
- Do not compute or approximate order locally.
- If the dispatcher fails or returns empty, show an empty state (e.g., “No Items to Cook”).

## Validation Checklist

- Verify items with lower prep times appear first in `GET /agents/station-dispatcher?category=Food`.
- For ties, confirm ordering falls back to higher wait minutes.
- Ensure recommendations include a prep-based `reason` string.
- Confirm the frontend displays the top recommendation in the “Do Now” panel without reordering.

## Notes

- This policy keeps prioritization simple, predictable, and data-driven by catalog prep times.
- You may later enhance `predicted_prep_minutes` with ML or station load, but the primary sort must remain prep-time–based unless this document is updated.
