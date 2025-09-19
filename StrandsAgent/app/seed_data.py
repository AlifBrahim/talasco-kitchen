"""Utilities to populate the database with demo data for exercising the agents."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from .db import Database

LOGGER = logging.getLogger(__name__)

# Pre-defined identifiers to keep the seeding idempotent.
ORG_ID = "11111111-1111-1111-1111-111111111111"
LOCATION_ID = "22222222-2222-2222-2222-222222222222"
STATION_ID = "33333333-3333-3333-3333-333333333333"
SUPPLIER_ID = "44444444-4444-4444-4444-444444444444"
INGREDIENT_RICE_ID = "55555555-5555-5555-5555-555555555555"
INGREDIENT_NORI_ID = "55555555-5555-5555-5555-555555555556"
MENU_ITEM_ID = "66666666-6666-6666-6666-666666666666"
FORECAST_BUCKET_START = datetime(2025, 1, 10, 3, 0, tzinfo=timezone.utc)
FORECAST_BUCKET_END = datetime(2025, 1, 10, 5, 0, tzinfo=timezone.utc)
RESTOCK_REC_ID = "77777777-7777-7777-7777-777777777777"
ORDER_ID = "88888888-8888-8888-8888-888888888888"
ORDER_ITEM_ID = "99999999-9999-9999-9999-999999999999"
KDS_TICKET_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ALERT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
PREP_PLAN_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
USER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"


def _json(data: Any) -> str:
    return json.dumps(data, separators=(",", ":"))


def seed_demo_data(db: Database) -> None:
    """Insert a small set of rows to make each agent/tool immediately testable."""

    LOGGER.info("Seeding demo data into database")
    now = datetime.now(tz=timezone.utc)
    long_wait_started_at = now - timedelta(minutes=45)

    with db.transaction() as cur:
        # orgs / locations / users
        cur.execute(
            """
            INSERT INTO orgs (id, name, timezone)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, timezone = EXCLUDED.timezone
            """,
            (ORG_ID, "Talasco Demo Kitchens", "Asia/Kuala_Lumpur"),
        )
        cur.execute(
            """
            INSERT INTO locations (id, org_id, name, address)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address
            """,
            (LOCATION_ID, ORG_ID, "Bukit Bintang HQ", "123 Demo Street"),
        )
        cur.execute(
            """
            INSERT INTO users (id, org_id, full_name, email, role)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, role = EXCLUDED.role
            """,
            (USER_ID, ORG_ID, "Kitchen Lead", "lead@example.com", "manager"),
        )

        # stations / SLA
        cur.execute(
            """
            INSERT INTO stations (id, location_id, name, kind)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, is_active = TRUE
            """,
            (STATION_ID, LOCATION_ID, "Maki", "prep"),
        )
        cur.execute(
            """
            INSERT INTO station_sla (id, station_id, daypart, target_prep_minutes, alert_after_minutes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (station_id, daypart)
            DO UPDATE SET target_prep_minutes = EXCLUDED.target_prep_minutes, alert_after_minutes = EXCLUDED.alert_after_minutes
            """,
            ("33333333-3333-3333-3333-333333333334", STATION_ID, "lunch", 10, 15),
        )

        # ingredients / supplier / inventory
        cur.execute(
            """
            INSERT INTO ingredients (id, org_id, sku, name, unit, shelf_life_hours)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit, shelf_life_hours = EXCLUDED.shelf_life_hours
            """,
            (INGREDIENT_RICE_ID, ORG_ID, "RICE-SUSHI", "Sushi Rice", "kg", 48),
        )
        cur.execute(
            """
            INSERT INTO ingredients (id, org_id, sku, name, unit, shelf_life_hours)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit, shelf_life_hours = EXCLUDED.shelf_life_hours
            """,
            (INGREDIENT_NORI_ID, ORG_ID, "NORI-10", "Nori Sheets", "pack", 72),
        )
        cur.execute(
            """
            INSERT INTO suppliers (id, org_id, name, email, lead_time_days)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, lead_time_days = EXCLUDED.lead_time_days
            """,
            (SUPPLIER_ID, ORG_ID, "Saba Fresh", "saba@example.com", 2),
        )
        cur.execute(
            """
            INSERT INTO ingredient_suppliers (id, ingredient_id, supplier_id, pack_size, pack_unit, price_per_pack, is_primary)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (ingredient_id, supplier_id)
            DO UPDATE SET pack_size = EXCLUDED.pack_size, pack_unit = EXCLUDED.pack_unit, price_per_pack = EXCLUDED.price_per_pack, is_primary = EXCLUDED.is_primary
            """,
            ("44444444-4444-4444-4444-444444444445", INGREDIENT_RICE_ID, SUPPLIER_ID, 10, "kg", 45.0, True),
        )
        cur.execute(
            """
            INSERT INTO ingredient_suppliers (id, ingredient_id, supplier_id, pack_size, pack_unit, price_per_pack, is_primary)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (ingredient_id, supplier_id)
            DO UPDATE SET pack_size = EXCLUDED.pack_size, pack_unit = EXCLUDED.pack_unit, price_per_pack = EXCLUDED.price_per_pack, is_primary = EXCLUDED.is_primary
            """,
            ("44444444-4444-4444-4444-444444444446", INGREDIENT_NORI_ID, SUPPLIER_ID, 50, "sheet", 18.0, True),
        )
        cur.execute(
            """
            INSERT INTO inventory_levels (id, location_id, ingredient_id, on_hand, unit, par_level, reorder_point)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (location_id, ingredient_id)
            DO UPDATE SET on_hand = EXCLUDED.on_hand, unit = EXCLUDED.unit, par_level = EXCLUDED.par_level, reorder_point = EXCLUDED.reorder_point
            """,
            ("55555555-5555-5555-5555-555555555557", LOCATION_ID, INGREDIENT_RICE_ID, 8, "kg", 12, 6),
        )
        cur.execute(
            """
            INSERT INTO inventory_levels (id, location_id, ingredient_id, on_hand, unit, par_level, reorder_point)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (location_id, ingredient_id)
            DO UPDATE SET on_hand = EXCLUDED.on_hand, unit = EXCLUDED.unit, par_level = EXCLUDED.par_level, reorder_point = EXCLUDED.reorder_point
            """,
            ("55555555-5555-5555-5555-555555555558", LOCATION_ID, INGREDIENT_NORI_ID, 1, "pack", 10, 4),
        )

        # menu + recipes
        cur.execute(
            """
            INSERT INTO menu_items (id, org_id, name, category, avg_prep_minutes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, avg_prep_minutes = EXCLUDED.avg_prep_minutes
            """,
            (MENU_ITEM_ID, ORG_ID, "California Roll", "Sushi", 6),
        )
        cur.execute(
            """
            INSERT INTO item_station_route (id, menu_item_id, station_id, sequence)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (menu_item_id, station_id) DO UPDATE SET sequence = EXCLUDED.sequence
            """,
            ("66666666-6666-6666-6666-666666666667", MENU_ITEM_ID, STATION_ID, 1),
        )
        cur.execute(
            """
            INSERT INTO recipes (id, menu_item_id, ingredient_id, qty, unit)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (menu_item_id, ingredient_id) DO UPDATE SET qty = EXCLUDED.qty, unit = EXCLUDED.unit
            """,
            ("66666666-6666-6666-6666-666666666668", MENU_ITEM_ID, INGREDIENT_RICE_ID, 0.15, "kg"),
        )
        cur.execute(
            """
            INSERT INTO recipes (id, menu_item_id, ingredient_id, qty, unit)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (menu_item_id, ingredient_id) DO UPDATE SET qty = EXCLUDED.qty, unit = EXCLUDED.unit
            """,
            ("66666666-6666-6666-6666-666666666669", MENU_ITEM_ID, INGREDIENT_NORI_ID, 1, "sheet"),
        )

        # demand forecast for prep planner
        cur.execute(
            """
            INSERT INTO demand_forecasts (id, location_id, menu_item_id, bucket_start, bucket_end, expected_qty, features)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (location_id, menu_item_id, bucket_start, bucket_end)
            DO UPDATE SET expected_qty = EXCLUDED.expected_qty, features = EXCLUDED.features
            """,
            (
                "77777777-7777-7777-7777-777777777778",
                LOCATION_ID,
                MENU_ITEM_ID,
                FORECAST_BUCKET_START,
                FORECAST_BUCKET_END,
                36,
                _json({"dow": 5, "daypart": "lunch"}),
            ),
        )

        # Existing prep plan for explain/summarize
        cur.execute(
            """
            INSERT INTO prep_plans (id, location_id, plan_for, model_version, note)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET model_version = EXCLUDED.model_version, note = EXCLUDED.note
            """,
            (PREP_PLAN_ID, LOCATION_ID, FORECAST_BUCKET_START, "planner-v0", "Seeded demo prep plan"),
        )
        cur.execute(
            """
            INSERT INTO prep_plan_lines (id, plan_id, menu_item_id, recommended_qty, rationale)
            VALUES (%s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (plan_id, menu_item_id)
            DO UPDATE SET recommended_qty = EXCLUDED.recommended_qty, rationale = EXCLUDED.rationale
            """,
            (
                "cccccccc-cccc-cccc-cccc-cccccccccccd",
                PREP_PLAN_ID,
                MENU_ITEM_ID,
                24,
                _json({"expected_qty": 36, "available_portions": 12, "window": {
                    "start": FORECAST_BUCKET_START.isoformat(),
                    "end": FORECAST_BUCKET_END.isoformat(),
                }}),
            ),
        )

        # Restock recommendations
        cur.execute(
            """
            INSERT INTO restock_recommendations (id, location_id, ingredient_id, recommended_qty_packs, supplier_id, recommended_by, rationale)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET recommended_qty_packs = EXCLUDED.recommended_qty_packs, supplier_id = EXCLUDED.supplier_id, rationale = EXCLUDED.rationale
            """,
            (
                RESTOCK_REC_ID,
                LOCATION_ID,
                INGREDIENT_NORI_ID,
                8,
                SUPPLIER_ID,
                "model",
                _json({"reason": "Coverage < 1 shift", "on_hand": 1, "par": 10}),
            ),
        )

        # Orders / tickets for queue + SLA views
        cur.execute(
            """
            INSERT INTO orders (id, location_id, source, status, placed_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, placed_at = EXCLUDED.placed_at
            """,
            (ORDER_ID, LOCATION_ID, "dine_in", "in_progress", long_wait_started_at),
        )
        cur.execute(
            """
            INSERT INTO order_items (id, order_id, menu_item_id, qty, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, created_at = EXCLUDED.created_at
            """,
            (ORDER_ITEM_ID, ORDER_ID, MENU_ITEM_ID, 2, "queued", long_wait_started_at),
        )
        cur.execute(
            """
            INSERT INTO kds_tickets (id, order_item_id, station_id, status, priority_score, priority_reason, sla_minutes, enqueued_at)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            ON CONFLICT (id)
            DO UPDATE SET status = EXCLUDED.status, priority_score = EXCLUDED.priority_score, priority_reason = EXCLUDED.priority_reason, sla_minutes = EXCLUDED.sla_minutes, enqueued_at = EXCLUDED.enqueued_at
            """,
            (
                KDS_TICKET_ID,
                ORDER_ITEM_ID,
                STATION_ID,
                "queued",
                0.95,
                _json({"wait": "45m>sla", "table": "T12"}),
                12,
                long_wait_started_at,
            ),
        )

        # Alert for watchdog acknowledgement
        cur.execute(
            """
            INSERT INTO alerts (id, org_id, location_id, kind, severity, entity, message, detected_at)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            ON CONFLICT (id)
            DO UPDATE SET severity = EXCLUDED.severity, entity = EXCLUDED.entity, message = EXCLUDED.message, detected_at = EXCLUDED.detected_at, acknowledged_at = NULL
            """,
            (
                ALERT_ID,
                ORG_ID,
                LOCATION_ID,
                "wait_sla_breach",
                "critical",
                _json({"ticket_id": KDS_TICKET_ID, "station_id": STATION_ID}),
                "Ticket KT-101 is 3x SLA",
                long_wait_started_at,
            ),
        )

    LOGGER.info("Demo data seeded successfully")


__all__ = ["seed_demo_data", "LOCATION_ID", "ORG_ID", "STATION_ID", "PREP_PLAN_ID", "RESTOCK_REC_ID", "ALERT_ID"]
