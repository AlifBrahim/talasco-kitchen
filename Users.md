# 1) Set up the restaurant

**As the owner**, I register my company and outlets so everyone works in the right timezone and team.

- I create my company profile → `orgs`.
- I add each restaurant branch with hours/address → `locations`.
- I invite staff and set roles (manager, kitchen, FOH) → `users`.

**As the kitchen lead**, I define where work happens and how fast it should be.

- I list my stations (Maki, Grill, Expo) → `stations`.
- I set target prep times and alert thresholds per daypart → `station_sla`.
- I link devices (KDS screens, table iPads, kiosks, number callers) to stations/tables → `devices`.

# 2) Build the menu and “how it flows”

**As the chef**, I describe what we sell and how it’s made.

- I add dishes/SKUs (with average prep time) → `menu_items`.
- I say which stations each dish passes through and in what order → `item_station_route`.
- I list ingredients we stock (unit, shelf life) → `ingredients`.
- I write each dish’s recipe (ingredient quantities) → `recipes`.

# 3) Start of day: forecast & prep

**As the manager**, I want to know what to prep before doors open.

- The AI predicts item demand in time buckets (e.g., 12:00–13:00) → `demand_forecasts`.
- It generates a prep plan for lunch (when to start, how much to make) → `prep_plans`.
- The plan lists recommended quantities per dish with a short “why” → `prep_plan_lines`.

# 4) Taking and making orders

**As a guest/FOH**, I place an order from the table iPad or POS.

- Each order (source: dine-in/QR/delivery) is saved → `orders`.
- Each line item (dish, qty, notes) is saved → `order_items`.

**As a station cook**, I see a smart, prioritized queue.

- For each line item and station step, a work ticket is created → `kds_tickets`
(it carries a **priority\_score**, an explanation, SLA minutes, and timestamps).
- When a ticket or item changes state (queued → prepping → passed), it’s tracked → `order_item_status_history`.

# 5) Live monitoring & alerts

**As the expo/manager**, I don’t want long waits or bottlenecks.

- If an item is taking too long vs. the station SLA, raise an alert → `alerts` (`kind='wait_sla_breach'`).
- If a station gets overloaded, also alert → `alerts` (`kind='station_overload'`).

# 6) Inventory: usage, counts, and waste

**As the inventory clerk**, I need accurate on-hand.

- Current stock per ingredient per location → `inventory_levels`.
- Any change to stock (receipts, prep consumption, waste, transfers, count adjustments) is logged → `stock_movements`.
- During stocktake, I create a count session → `inventory_counts`, and record lines → `inventory_count_lines`.
- If something is thrown away (expired/over-prep/damaged), I log it → `waste_events`.

# 7) Buying more stock (restocking & POs)

**As the purchaser**, I want the system to tell me what to buy and from whom.

- The model suggests what to reorder (packs, which supplier, why) → `restock_recommendations`.
- My approved suppliers live here → `suppliers`.
- Who sells which ingredient, at what pack size/price, and who’s primary → `ingredient_suppliers`.
- I raise a purchase order (status: draft/sent/received) → `purchase_orders`.
- The items on that PO (ingredient, pack qty, price) → `purchase_order_items`.
- When goods arrive, I book a receipt → `goods_receipts`, and record received lines → `goods_receipt_lines`
(which then flow into `stock_movements` to update `inventory_levels`).
- If a PO is late, trigger an alert → `alerts` (`kind='po_delay'`).

# 8) End-of-day performance

**As the owner**, I want quick KPIs by shift.

- For each date/daypart, I store totals (orders, items, avg wait, on-time %, waste) → `service_periods`.
- Low stock or stockouts during service also raise alerts → `alerts` (`kind='low_stock'`/`stockout`).

---

## Quick cheat sheet (all tables in one line each)

- `orgs` – your company.
- `locations` – each outlet.
- `users` – staff & roles.
- `stations` – kitchen areas.
- `station_sla` – target prep/alert times.
- `devices` – KDS screens, iPads, kiosks.
- `menu_items` – dishes/SKUs.
- `item_station_route` – dish → station flow.
- `ingredients` – stock items.
- `recipes` – dish BOMs.
- `suppliers` – vendors.
- `ingredient_suppliers` – who sells what, pack/price.
- `inventory_levels` – on-hand by ingredient.
- `stock_movements` – every in/out change.
- `inventory_counts` / `inventory_count_lines` – stocktakes.
- `waste_events` – logged waste.
- `orders` – customer orders.
- `order_items` – order lines.
- `order_item_status_history` – lifecycle audit.
- `kds_tickets` – station work cards with priority/SLA.
- `demand_forecasts` – predicted demand.
- `prep_plans` / `prep_plan_lines` – what to make before service.
- `restock_recommendations` – suggested reorders.
- `purchase_orders` / `purchase_order_items` – what you bought.
- `goods_receipts` / `goods_receipt_lines` – what arrived.
- `alerts` – issues to act on.
- `service_periods` – daypart KPIs.

If you want, I can tailor the stories for a specific concept (e.g., sushi bar with maki/sashimi stations) and include sample alert messages and example rows.

---

# Dari customer duduk sampai makanan sampai

# User story: “Order to table”

**As a dine-in guest**, I want to browse the menu at my table and place my order so that my food arrives together, quickly, and as I requested.

## Narrative (happy path)

1. **Sit & browse**
    
    Aisha sits at Table 12. The table iPad wakes, shows the menu, today’s specials, and an estimated wait for popular items. Aisha could also sees from the menu which menu is fast and which menu require her to wait longer.
    
2. **Customize & submit**
    
    She adds a Salmon Maki (no mayo), a Chicken Don, and a Green Tea. At checkout, the app shows a **quoted time** (e.g., “~14 min”). She taps **Place Order**.
    
3. **Order captured & routed**
    
    The system creates an order and **splits it by station**: Sushi station gets the maki; Grill line gets the don; Drinks goes to the beverage station. Each station’s **KDS** instantly shows a new ticket.
    
4. **Smart queueing**
    
    Each ticket gets a **priority score** based on (a) predicted prep time, (b) how long Aisha has already waited, and (c) current station load. Sushi is busy, so the maki ticket is bumped up; Drinks is free, so tea fires immediately. The KDS lists tickets in priority order with a short reason (e.g., “+3: guest wait > SLA”).
    
5. **Make & track**
- A cook **claims** the maki ticket; a timer starts.
- Grill starts the don; the system suggests firing times so both dishes **finish together**.
- If a timer nears the **station SLA**, the KDS flashes and a manager ping goes out.
1. **Finish & pass**
    
    The sushi cook taps **Ready**; the maki moves to **Pass/Expo**. Grill finishes the don; Expo now sees **both items ready for Table 12**. Expo checks modifiers (“no mayo” tag is visible), plates, and bundles the order.
    
2. **Serve & confirm**
    
    The server picks up the tray, serves Aisha, and taps **Served**. The order flips to **served/closed**. The system records actual prep times vs. quoted time.
    
3. **Behind the scenes**
- The system logs **ingredient usage** from recipes, updates on-hand stock, and triggers a low-stock alert if needed.
- Prep/wait data feeds tonight’s **learning loop** and tomorrow’s **prep plan**.

---

## Edge cases (brief)

- **Bottleneck:** Sushi runs behind; the system auto-extends quotes for new orders and pings Expo to stage the don later so dishes still land together.
- **Out of stock risk:** If salmon is low, the tablet flags it (“Limited”) or suggests alternates before checkout.
- **Allergy/modifier:** “No mayo” follows the ticket through stations and is highlighted at Expo.

---

## Acceptance criteria (plain Gherkin)

- **Given** a guest at a table iPad, **when** they place an order with modifiers, **then** an order and line items are created and a quoted time is shown.
- **Given** an order is created, **when** items are routed, **then** each station receives a ticket and the KDS orders tickets by priority.
- **Given** a ticket is claimed, **when** prep starts, **then** the system tracks elapsed time and compares it to the station SLA.
- **Given** prep time exceeds SLA, **when** the threshold is crossed, **then** a visual/audio alert appears at the station and a manager notification is sent.
- **Given** multiple items for the same table, **when** stations finish at different times, **then** Expo can hold early items so all items are ready together.
- **Given** items are passed to Expo, **when** the server serves them, **then** the order status becomes *served* and actual prep times are stored.
- **Given** recipes define ingredient use, **when** items are served, **then** inventory is decremented and low-stock alerts may be raised.

If you want, I can tailor the same story to your exact station layout (e.g., Maki, Fry, Grill, Expo) and include sample KDS screen text and alerts.