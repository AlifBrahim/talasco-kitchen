- - =========
-- Helpful indexes
-- =========
CREATE INDEX idx_orderitems_status ON orderitems(status, started_at);
- - =========
-- Order Items (junction: orders ↔ menuitems)
-- =========
CREATE TABLE orderitems (
orderid INT NOT NULL REFERENCES orders(orderid) ON DELETE CASCADE,
itemid INT NOT NULL REFERENCES menuitems(itemid) ON DELETE RESTRICT,
quantity INT NOT NULL DEFAULT 1,
status VARCHAR(20) NOT NULL DEFAULT 'queued'
CHECK (status IN ('queued','prepping','ready','served','completed','cancelled')),
started_at TIMESTAMP,
completed_at TIMESTAMP,
notes TEXT,
PRIMARY KEY (orderid, itemid)
);
- - =========
-- Orders
-- =========
CREATE TABLE orders (
orderid SERIAL PRIMARY KEY,
orderdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
tablenumber VARCHAR(10),
status VARCHAR(20) NOT NULL DEFAULT 'open'
CHECK (status IN ('open','in_progress','ready','served','completed','cancelled')),
promisedat TIMESTAMP,
totaltime VARCHAR(20),
started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
completed_at TIMESTAMP
);
- - =========
-- Menu Item Ingredients (junction table: menuitems ↔ ingredients)
-- =========
CREATE TABLE menuitemingredients (
itemid INT NOT NULL REFERENCES menuitems(itemid) ON DELETE CASCADE,
ingredientid INT NOT NULL REFERENCES ingredients(ingredientid) ON DELETE CASCADE,
quantityneeded NUMERIC(10,2) NOT NULL,
PRIMARY KEY (itemid, ingredientid)
);
- - =========
-- Menu Items
-- =========
CREATE TABLE menuitems (
itemid SERIAL PRIMARY KEY,
sku VARCHAR(10) UNIQUE NOT NULL,
itemname VARCHAR(100) NOT NULL,
price NUMERIC(10,2) NOT NULL,
category VARCHAR(20) NOT NULL CHECK (category IN ('Food','Drink','Dessert')),
is_active BOOLEAN NOT NULL DEFAULT TRUE,
image_path VARCHAR(255),
prep_time_minutes INT NOT NULL DEFAULT 5 CHECK (prep_time_minutes > 0)

);
- - =========
-- Ingredients
-- =========
CREATE TABLE ingredients (
ingredientid SERIAL PRIMARY KEY,
ingredientname VARCHAR(100) NOT NULL,
unit VARCHAR(20),
stockquantity NUMERIC(10,2) NOT NULL DEFAULT 0,
category VARCHAR(50),
lowthreshold NUMERIC(10,2) NOT NULL DEFAULT 5,
updatedat TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sections (
    sectionid SERIAL PRIMARY KEY,
    sectionname VARCHAR(50) NOT NULL UNIQUE,
    max_capacity INT NOT NULL
);

CREATE INDEX idx_ingredients_category ON ingredients(category);
- - Postgres schema for Restaurant Ordering System (Menu, Orders, Ingredients)
-- Assumes PostgreSQL 13+

