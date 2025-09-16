## Actors

-Kitchen staff / chefs → want clear, optimized order queues.

-Restaurant manager → wants stock levels optimized to cut waste + avoid 
shortages.

-Waiters / front staff → want alerts on delays to manage customer expectations.

-Customers → indirectly benefit via faster service & fewer “out of stock” items.

-Data collector / field agent → conducts on-site 7-day baseline data collection using standardized templates (purchases, sales, prep yield, waste, temperatures). May be assigned to the restaurant manager if no dedicated staff.

## User Stories

-As a chef, I want orders prioritized by prep time and wait time so that I can cook efficiently and reduce customer wait.

-As a restaurant manager, I want AI to predict daily prep needs so that I minimize food waste while avoiding stock-outs.

-As a waiter, I want alerts when customer wait time exceeds limits so that I can inform or compensate them.

-As a manager, I want real-time inventory tracking and restock suggestions so that I maintain optimal stock levels.

-As a data collector, I want downloadable spreadsheet templates for purchases, sales, prep yield, waste, and temperature logs so that I can collect consistent data.

-As a data collector, I want to run a 7-day baseline audit on-site to seed the system where no historical data exists.

-As a restaurant manager assigned as data collector, I want simple daily forms to enter totals and line items without integrations.

-As a manager, I want completeness checks for the 7-day period so that I know when the system is ready to generate forecasts and prep plans.

-As a small-restaurant owner without a POS, I want a zero-integration mode with simple daily sales entry and a menu template so that I can start immediately.

## Acceptance Criteria

Functional

-Orders appear in prioritized queue (by prep + wait time).

-System generates pre-dining prep recommendations (e.g., “Prepare 20 chicken portions for Friday dinner rush”).

-Alerts trigger if order wait time > X minutes.

-Stock updates in real-time after each order deduction.

-Restock alerts generated when stock < threshold (e.g., 10% remaining).

-Provide CSV/Excel templates for purchases, sales, prep yield, waste, and temperature logs with required fields and standardized units.

-In-app manual entry forms mirror templates; allow quick row add/edit, unit selection, and client-side validation for required fields and ranges.

-A 7-day baseline completeness gate (all daily templates submitted) before enabling predictions and prep recommendations.

-Role assignment lets either a dedicated data collector or the restaurant manager own the daily data tasks; checklist shows completion status.

-Datasets exportable as CSV/JSON for audits and external analysis.

Non-Functional

-Dashboard refresh < 5 seconds.

-Handles at least 200 concurrent orders.

-Works offline for at least 30 mins (local cache) in case of internet issues.

Edge Cases

-Sudden spike in orders → system re-prioritizes dynamically.

-Unexpected stock-out → system auto-removes unavailable items from menu.

-Supplier delay → adjust stock prediction accordingly.

-Missing purchase receipts → allow late entry and mark as backfilled.

-Inconsistent units (kg vs lb, ml vs oz) → prompt conversion and standardize.

-Partial day coverage during audit week → mark gaps and exclude from baseline metrics.

-Supplier holidays/closures within the 7-day period → adjust baseline expectations.

## Zero-System Mode (Universal Onboarding)

-Run a 7-day baseline audit using templates: purchases, sales, prep yield, waste, and temperature logs.

-Assign responsibility to a data collector or the restaurant manager; use a daily checklist with due times.

-Enter daily sales totals and top dishes; import menu via CSV template; map recipes to ingredients to enable stock deduction.

-After 7 days, generate baseline inventory and initial prep/ordering recommendations.

-Export datasets anytime (CSV/JSON); no vendor lock-in.

## Data Sources

[ ] Historical sales data → orders per day, peak hours, seasonality.

[ ] Inventory logs → stock levels, expiry dates.

[ ] Recipe data → ingredients per dish (for stock deduction).

[ ] Customer data (optional) → peak dining times, loyalty trends.