# Kitchen Agents Spec (Strands SDK) — Compliance with Problem Statement

> **Problem Statement**
>
> GenAI-Powered Kitchen Optimization and Stock Management for F&B. Restaurants face challenges in managing kitchen operations and inventory efficiently, especially during peak hours. Develop a generative AI solution that **optimizes kitchen workflows by prioritizing orders based on preparation time and customer wait time**, **raises real-time alerts for excessive wait times**, and **manages stock levels and pre-dining food preparation**. The system should **analyze historical data** (e.g., order patterns by day of the week) to **predict and recommend food prep quantities** before dining hours and **maintain optimal stock levels**. The solution should generate **actionable outputs**, such as prioritized order queues, alert notifications, and inventory restocking plans, to enhance kitchen efficiency, customer satisfaction and minimise cost of potential food waste.

---

## 1) Problem → Agent Feature Mapping

### 1. Prioritize kitchen workflow by prep time & wait time
- **Agent:** `station_dispatcher` (one per station) + `supervisor`
- **Primary Tools:**
  - `get_station_queue(station_id, limit=5)`
  - `start_ticket(ticket_id)` / `hold_ticket(ticket_id)` / `pass_ticket(ticket_id)`
- **Data Hooks:** `v_station_queue`, `kds_tickets.priority_reason`, `station_sla`
- **Output Example:**  
  _Do now_: Fire **KT-142 (Maki)**.  
  _Why_: 1.4× SLA; last item for Table 12; est 3.5m.
- **Complies with:** Prioritized order queues & real-time guidance

### 2. Raise real-time alerts for excessive wait times
- **Agent:** `sla_watchdog`
- **Primary Tools:**
  - `list_open_breaches(location_id)`
  - `ack_alert(alert_id)`
  - `notify(channel, message)`
- **Data Hooks:** `v_wait_sla_breaches` view, `alerts` table
- **Output Example:**  
  _Alert_: **Critical** — Ticket KT-233 (Grill) is 6.5m over SLA.
- **Complies with:** Alert notifications for excessive waits

### 3. Predict & recommend pre-dining prep quantities
- **Agent:** `prep_planner`
- **Primary Tools:**
  - `generate_prep_plan(location_id, window)` → writes `prep_plans`, `prep_plan_lines`
  - `summarize_prep_plan(plan_id)`
- **Data Hooks:** `demand_forecasts`, `recipes`, `inventory_levels`, `stations` capacity rules
- **Output Example:**  
  _Plan_: Prep **24 California Rolls**, **18 Spicy Tuna**; start rice at 11:20.  
  _Rationale_: forecast × on-hand × capacity.
- **Complies with:** Pre-dining food preparation recommendations

### 4. Maintain optimal stock levels & restocking plans
- **Agent:** `inventory_controller`
- **Primary Tools:**
  - `list_restock_risks(location_id)`
  - `create_po_from_recs(location_id, supplier_id)` → writes `purchase_orders/*`
- **Data Hooks:** `inventory_levels`, `stock_movements`, `ingredient_suppliers`, `suppliers`, `restock_recommendations`
- **Output Example:**  
  _PO Draft_: Supplier **Saba Fresh** — Salmon (4 packs), Nori (6 packs).  
  _Why_: ROP coverage < lead time; price/pack validated.
- **Complies with:** Inventory restocking plans & optimal stock

### 5. Minimize waste via smart substitutes & shelf-life awareness *(nice-to-have)*
- **Agent:** `substitution_waste_reducer`
- **Primary Tools:**
  - `suggest_substitute(ingredient_id)`
  - `log_waste(menu_item_id|ingredient_id, qty, reason)`
- **Data Hooks:** `recipes`, `ingredients.shelf_life_hours`, `waste_events`
- **Output Example:**  
  _Suggestion_: Low Avocado → use Cucumber for Maki (allergy-safe); adjust 6 orders.
- **Complies with:** Waste minimization

### 6. Explainability & Ops Copilot
- **Agent:** `kitchen_copilot` (chat/voice)
- **Primary Tools:** read-only wrappers + `explain_ticket(ticket_id)`, `explain_prep_plan(plan_id)`
- **Data Hooks:** consumes `priority_reason`/`rationale` JSON and SOPs
- **Output Example:** concise **Do now / Why / Risk** with optional one-click actions
- **Complies with:** Actionable outputs that enhance efficiency & satisfaction

---

## 2) Minimal Feature Contracts (Acceptance Criteria)

- **Prioritized Queues**
  - KDS shows top 3 tickets per station sorted by `priority_score`.
  - Updates within **≤3s** after order state changes.
  - Each ticket displays a one-line **Why** generated from `priority_reason`.

- **SLA Alerts**
  - Alert created **≤60s** after breach; deduplicated while open.
  - Severity escalates if wait > **2× SLA**.
  - `ack_alert` stops repeats and sets `acknowledged_at` in `alerts`.

- **Prep Plan**
  - Generated **≥30 min** before daypart start.
  - Each line: item, quantity, start time; rationale includes forecast & on-hand pointers.
  - Plan persisted in `prep_plans` and `prep_plan_lines`.

- **Restock Plan / PO Draft**
  - Recommendations daily; PO draft groups lines by supplier.
  - Each line includes **qty_packs**, **price_per_pack**, and **why** JSON.
  - All writes use transactions; idempotent on retries.

- **Waste Reduction**
  - When at-risk ingredient cover < shelf-life window, propose prep reduction/substitution with explanation.
  - Record accepted changes and any waste in `waste_events`.

---

## 3) Agents & Tools Catalog (Signatures)

### Agents
- `station_dispatcher`, `supervisor`
- `sla_watchdog`
- `prep_planner`
- `inventory_controller`
- `substitution_waste_reducer`
- `kitchen_copilot`

### Core Tool Signatures (Python-style)
```python
def get_station_queue(station_id: str, limit: int = 5) -> str: ...
def start_ticket(ticket_id: str) -> str: ...
def hold_ticket(ticket_id: str, minutes: int = 2) -> str: ...
def pass_ticket(ticket_id: str) -> str: ...

def list_open_breaches(location_id: str) -> str: ...
def ack_alert(alert_id: str) -> str: ...
def notify(channel: str, message: str) -> str: ...

def generate_prep_plan(location_id: str, window: dict) -> str: ...
def summarize_prep_plan(plan_id: str) -> str: ...

def list_restock_risks(location_id: str) -> str: ...
def create_po_from_recs(location_id: str, supplier_id: str) -> str: ...

def suggest_substitute(ingredient_id: str) -> str: ...
def log_waste(menu_item_id: str | None, ingredient_id: str | None, qty: float, reason: str) -> str: ...

def explain_ticket(ticket_id: str) -> str: ...
def explain_prep_plan(plan_id: str) -> str: ...
```

---

## 4) Data Model Hooks (Postgres)

- **Queues & Tickets:** `kds_tickets`, `v_station_queue`, `order_items`, `station_sla`
- **Alerts:** `v_wait_sla_breaches`, `alerts`
- **Prep:** `demand_forecasts`, `prep_plans`, `prep_plan_lines`, `recipes`, `inventory_levels`
- **Inventory & Purchasing:** `inventory_levels`, `stock_movements`, `ingredient_suppliers`, `suppliers`, `restock_recommendations`, `purchase_orders`, `purchase_order_items`
- **Waste:** `waste_events`
- **Analytics:** `service_periods`

---

## 5) Example Prompts (Agent System Prompts)

- **Kitchen Copilot (system):**  
  “Be brief and decisive. Output **Do now**, **Why**, **Risks (optional)**. Use tools for facts and actions; never invent data.”

- **Station Dispatcher (system):**  
  “Recommend the next 1–3 tickets to fire for this station. Weigh SLA breach risk, remaining prep time, order completeness. Prefer actions that unblock tables.”

- **SLA Watchdog (system):**  
  “List current SLA breaches and notify with severity. Offer to acknowledge when requested. Keep messages under 120 characters.”

---

## 6) Evaluation Metrics (KPIs)

- SLA hit rate ↑, P50/P90 wait time ↓, items/hour per station ↑, low-stock/stockout incidents ↓, waste cost/revenue ↓, % POs on time ↑.

---

## 7) Deployment Notes

- Implement agents with **Strands SDK**; tools call Postgres and/or services.  
- Expose chat + actions in KDS/FOH UI (WebSocket for pushes).  
- Add rate limits & idempotency to tool endpoints.  
- Optional: Attach Bedrock Guardrails/Knowledge Base via a tool if deployed on AWS.

