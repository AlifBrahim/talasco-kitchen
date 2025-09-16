## Actors

-Kitchen staff / chefs → want clear, optimized order queues.
-Restaurant manager → wants stock levels optimized to cut waste + avoid shortages.
-Waiters / front staff → want alerts on delays to manage customer expectations.
-Customers → indirectly benefit via faster service & fewer “out of stock” items.

## User Stories

-As a chef, I want orders prioritized by prep time and wait time so that I can cook efficiently and reduce customer wait.
-As a restaurant manager, I want AI to predict daily prep needs so that I minimize food waste while avoiding stock-outs.
-As a waiter, I want alerts when customer wait time exceeds limits so that I can inform or compensate them.
-As a manager, I want real-time inventory tracking and restock suggestions so that I maintain optimal stock levels.

## Acceptance Criteria

Functional

-Orders appear in prioritized queue (by prep + wait time).
-System generates pre-dining prep recommendations (e.g., “Prepare 20 chicken portions for Friday dinner rush”).
-Alerts trigger if order wait time > X minutes.
-Stock updates in real-time after each order deduction.
-Restock alerts generated when stock < threshold (e.g., 10% remaining).

Non-Functional

-Dashboard refresh < 5 seconds.
-Handles at least 200 concurrent orders.
-Works offline for at least 30 mins (local cache) in case of internet issues.

Edge Cases

-Sudden spike in orders → system re-prioritizes dynamically.
-Unexpected stock-out → system auto-removes unavailable items from menu.
-Supplier delay → adjust stock prediction accordingly.

## Data Sources

[ ] Historical sales data → orders per day, peak hours, seasonality.
[ ] Inventory logs → stock levels, expiry dates.
[ ] Recipe data → ingredients per dish (for stock deduction).
[ ] Customer data (optional) → peak dining times, loyalty trends.