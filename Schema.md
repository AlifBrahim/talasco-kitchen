-- Postgres schema for GenAI-Powered Kitchen Optimization & Stock Management
-- Assumes PostgreSQL 13+ (uses gen_random_uuid(); enable pgcrypto extension)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;    -- ← add this

-- =========
-- Tenancy, org, locations, users
-- =========
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  opens_at TIME,  -- optional planning aid
  closes_at TIME, -- optional planning aid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email CITEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','kitchen','foh','analyst')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========
-- Stations, SLAs, devices (KDS / table iPads)
-- =========
CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,             -- e.g., "Maki", "Grill", "Expedite"
  kind TEXT NOT NULL CHECK (kind IN ('prep','cook','expedite','bar','dessert')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE station_sla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  daypart TEXT NOT NULL,          -- e.g., 'lunch','dinner','late'
  target_prep_minutes INT NOT NULL CHECK (target_prep_minutes > 0),
  alert_after_minutes INT NOT NULL CHECK (alert_after_minutes > 0),
  UNIQUE (station_id, daypart)
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('kds','tablet','kiosk','caller')),
  label TEXT,
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL, -- KDS devices can bind to station
  table_number TEXT,                                         -- for table-side iPads
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- =========
-- Menu catalog, routing, recipes (BOM)
-- =========
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,                 -- optional POS code
  name TEXT NOT NULL,
  category TEXT,                   -- e.g., "Sushi", "Bowl"
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  avg_prep_minutes NUMERIC(6,2),   -- historical average; model can override per order
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE item_station_route (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (menu_item_id, station_id)
);

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,              -- e.g., 'kg','g','l','ml','ea'
  shelf_life_hours INT,            -- optional for waste/decay logic
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  qty NUMERIC(14,3) NOT NULL CHECK (qty >= 0),
  unit TEXT NOT NULL,              -- unit for this ingredient usage
  UNIQUE (menu_item_id, ingredient_id)
);

-- =========
-- Suppliers & purchasing
-- =========
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  lead_time_days INT DEFAULT 2
);

CREATE TABLE ingredient_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  pack_size NUMERIC(14,3) NOT NULL,
  pack_unit TEXT NOT NULL,
  price_per_pack NUMERIC(14,4) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (ingredient_id, supplier_id)
);

-- =========
-- Inventory (on-hand, movements, counts, waste)
-- =========
CREATE TABLE inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  on_hand NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  par_level NUMERIC(14,3),            -- target on-hand
  reorder_point NUMERIC(14,3),
  safety_stock NUMERIC(14,3),
  UNIQUE (location_id, ingredient_id)
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('receipt','count_adj','prep_consume','waste','transfer_in','transfer_out','return')),
  qty NUMERIC(14,3) NOT NULL,
  unit TEXT NOT NULL,
  reason TEXT,
  related_order_item_id UUID,         -- optional: consumption links to order items
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_loc_ing ON stock_movements(location_id, ingredient_id, occurred_at);

CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT
);

CREATE TABLE inventory_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  qty NUMERIC(14,3) NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE waste_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  qty NUMERIC(14,3),
  unit TEXT,
  reason TEXT CHECK (reason IN ('expired','overprep','damage','customer_return','other')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========
-- Orders, items, status, KDS tickets
-- =========
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('dine_in','qr','kiosk','phone','delivery','pickup','pos')),
  table_number TEXT,
  customer_name TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  promised_at TIMESTAMPTZ,              -- quoted ETA (e.g., from SmartQuote/our model)
  status TEXT NOT NULL CHECK (status IN ('open','in_progress','ready','served','cancelled'))
);
CREATE INDEX idx_orders_loc_time ON orders(location_id, placed_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  qty INT NOT NULL CHECK (qty > 0),
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued','firing','prepping','passed','served','cancelled')) DEFAULT 'queued',
  predicted_prep_minutes NUMERIC(6,2),  -- AI estimate at creation
  actual_prep_seconds INT,              -- captured after completion
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_item_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- One KDS ticket per station step for a given order item
CREATE TABLE kds_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL DEFAULT 1,         -- stage in routing
  status TEXT NOT NULL CHECK (status IN ('queued','firing','prepping','ready','passed','cancelled')) DEFAULT 'queued',
  priority_score NUMERIC(10,4) DEFAULT 0,       -- computed by AI
  priority_reason JSONB,                        -- explanation (e.g., {"wait":"11m>sla","bottleneck":"maki"})
  sla_minutes INT,                              -- SLA for this station/daypart at enqueue time
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_kds_station_priority ON kds_tickets(station_id, status, priority_score DESC);

-- =========
-- Forecasts & prep plans (pre-dining recommendations)
-- =========
-- Demand forecast per item, time bucket (e.g., 30/60 min) for a location
CREATE TABLE demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  bucket_start TIMESTAMPTZ NOT NULL,
  bucket_end   TIMESTAMPTZ NOT NULL,
  expected_qty NUMERIC(12,3) NOT NULL CHECK (expected_qty >= 0),
  model_version TEXT,
  features JSONB,                  -- e.g., {"dow":5,"holiday":0,"weather":"rain"}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, menu_item_id, bucket_start, bucket_end)
);
CREATE INDEX idx_forecast_lookup ON demand_forecasts(location_id, bucket_start, bucket_end);

-- Pre-dining prep plan output by the model
CREATE TABLE prep_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  plan_for TIMESTAMPTZ NOT NULL,           -- e.g., 2025-09-16 10:00 MYT (lunch prep)
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_version TEXT,
  note TEXT
);

CREATE TABLE prep_plan_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES prep_plans(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  recommended_qty NUMERIC(12,3) NOT NULL CHECK (recommended_qty >= 0),
  rationale JSONB,                            -- pointers to forecast, on-hand, reservations, etc.
  UNIQUE (plan_id, menu_item_id)
);

-- =========
-- Restocking recommendations & purchasing flow
-- =========
CREATE TABLE restock_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  recommended_qty_packs NUMERIC(12,3) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  recommended_by TEXT NOT NULL CHECK (recommended_by IN ('model','rule','manual')),
  rationale JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_number TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft','sent','confirmed','received','cancelled')) DEFAULT 'draft',
  eta DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  qty_packs NUMERIC(14,3) NOT NULL,
  price_per_pack NUMERIC(14,4) NOT NULL,
  UNIQUE (po_id, ingredient_id)
);

CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

CREATE TABLE goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  qty_packs NUMERIC(14,3) NOT NULL
);

-- =========
-- Alerts & monitoring (wait-time SLA, low stock, station overload)
-- =========
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('wait_sla_breach','low_stock','stockout','station_overload','prep_backlog','po_delay')),
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  entity JSONB,                   -- e.g., {"order_item_id": "...", "station_id": "..."} or {"ingredient_id": "..."}
  message TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  ack_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_alerts_kind_time ON alerts(kind, detected_at DESC);

-- =========
-- Analytics snapshots (optional but handy)
-- =========
CREATE TABLE service_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  daypart TEXT NOT NULL,
  orders INT NOT NULL DEFAULT 0,
  items INT NOT NULL DEFAULT 0,
  avg_wait_seconds INT,
  on_time_pct NUMERIC(5,2),
  waste_qty NUMERIC(14,3),
  UNIQUE (location_id, date, daypart)
);

-- =========
-- Helpful indexes
-- =========
CREATE INDEX idx_order_items_status ON order_items(status, created_at);
CREATE INDEX idx_kds_status_time ON kds_tickets(status, enqueued_at);
CREATE INDEX idx_inventory_levels_par ON inventory_levels(location_id, ingredient_id);

-- =========
-- Views (examples)
-- =========
-- Current prioritized queue per station (only active tickets)
CREATE OR REPLACE VIEW v_station_queue AS
SELECT
  kt.station_id,
  kt.id AS ticket_id,
  kt.order_item_id,
  kt.status,
  kt.priority_score,
  kt.priority_reason,
  kt.enqueued_at
FROM kds_tickets kt
WHERE kt.status IN ('queued','firing','prepping')
ORDER BY kt.station_id, kt.priority_score DESC, kt.enqueued_at ASC;

-- Items currently breaching SLA (wait-time)
CREATE OR REPLACE VIEW v_wait_sla_breaches AS
SELECT
  kt.id AS ticket_id,
  kt.station_id,
  oi.id AS order_item_id,
  EXTRACT(EPOCH FROM (now() - COALESCE(oi.started_at, oi.created_at))) / 60 AS minutes_elapsed,
  kt.sla_minutes
FROM kds_tickets kt
JOIN order_items oi ON oi.id = kt.order_item_id
WHERE kt.status IN ('queued','firing','prepping')
  AND kt.sla_minutes IS NOT NULL
  AND (now() - COALESCE(oi.started_at, oi.created_at)) > (kt.sla_minutes || ' minutes')::INTERVAL;