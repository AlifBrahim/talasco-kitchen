## Actors & User Roles

### Admin/Owner
- Full system control and configuration
- Manages users, locations, and organizational settings
- Reviews high-level analytics and performance metrics
- Configures system-wide policies and integrations

### Manager
- Runs daily service operations and manages staff
- Sets and monitors SLA targets for different stations
- Reviews and responds to operational alerts
- Manages inventory levels and supplier relationships

### Kitchen Staff (Chef/Cook)
- Works tickets on the Kitchen Display System (KDS)
- Needs clear, optimized order queues prioritized by prep time and wait time
- Requires real-time alerts for SLA breaches and station overloads
- Benefits from demand forecasting and prep recommendations

### Front-of-House (Server/Cashier)
- Takes and serves orders, marks items as served
- Needs alerts on delays to manage customer expectations
- Requires visibility into order status and estimated completion times
- Handles customer inquiries and manages table service

### Customer (Guest)
- Orders via table iPad/QR code (no login required)
- Indirectly benefits from faster service and fewer "out of stock" items
- Expects accurate wait times and order accuracy


## User Stories

### Admin/Owner Stories
- As an admin, I want to manage user roles and permissions so that I can control system access appropriately.
- As an admin, I want to configure multiple locations and their settings so that I can manage a restaurant chain effectively.
- As an admin, I want to set system-wide policies and integrations so that all locations operate consistently.

### Manager Stories
- As a manager, I want AI to predict daily prep needs so that I minimize food waste while avoiding stock-outs.
- As a manager, I want real-time inventory tracking and restock suggestions so that I maintain optimal stock levels.
- As a manager, I want to set and monitor SLA targets for different stations so that I can ensure service quality.
- As a manager, I want to review and respond to operational alerts so that I can address issues quickly.

### Kitchen Staff Stories
- As a chef, I want orders prioritized by prep time and wait time so that I can cook efficiently and reduce customer wait.
- As a kitchen staff member, I want clear visual displays of my work queue so that I can focus on cooking without confusion.
- As a chef, I want alerts when orders are approaching SLA breach so that I can prioritize accordingly.

### Front-of-House Stories
- As a server, I want alerts when customer wait time exceeds limits so that I can inform or compensate them.
- As a cashier, I want to easily mark orders as served so that kitchen staff know when items are ready.
- As FOH staff, I want visibility into order status so that I can answer customer questions accurately.


## Acceptance Criteria

### Functional Requirements

#### Role-Based Access Control
- Admin/Owner can manage all users, locations, and system settings
- Manager can set SLAs, review alerts, and manage inventory
- Kitchen staff can only access KDS tickets and order queues
- Front-of-House can take orders and mark items as served
- Customers can order via table iPad/QR without login

#### Order Management
- Orders appear in prioritized queue (by prep + wait time)
- KDS tickets route to appropriate stations based on menu item routing
- Real-time order status updates across all user interfaces
- SLA monitoring and breach alerts for kitchen staff

#### Predictive Analytics
- System generates pre-dining prep recommendations (e.g., "Prepare 20 chicken portions for Friday dinner rush")
- Demand forecasting based on historical patterns and external factors
- Prep plans generated with specific quantities and timing recommendations

#### Alert System
- Alerts trigger if order wait time > X minutes
- Station overload alerts when capacity exceeds thresholds
- Low stock alerts generated when inventory < par levels
- Role-specific alert routing (managers get all alerts, kitchen gets SLA alerts)

#### Inventory Management
- Stock updates in real-time after each order deduction
- Multi-location inventory tracking with transfer capabilities
- Supplier integration for automated reordering
- Waste tracking and cost analysis

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