"""Database-backed tool implementations for the kitchen agents."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any

from strands import ToolContext, tool

from .db import Database
from .utils import serialize_row, serialize_rows

LOGGER = logging.getLogger(__name__)


def _parse_timestamp(value: str, field_name: str) -> datetime:
    try:
        normalised = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalised)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"Invalid timestamp for {field_name}: {value}") from exc


def _success(payload: Any) -> dict[str, Any]:
    return {"status": "success", "content": [{"json": payload}]}


def _text_success(message: str, payload: Any | None = None) -> dict[str, Any]:
    content: list[dict[str, Any]] = [{"text": message}]
    if payload is not None:
        content.append({"json": payload})
    return {"status": "success", "content": content}


def _error(message: str) -> dict[str, Any]:
    return {"status": "error", "content": [{"text": message}]}


class KitchenTools:
    """Collection of Strands tools that operate on the kitchen database."""

    def __init__(self, db: Database):
        self._db = db

    # --- Station dispatch tools -------------------------------------------------

    @tool(context=True)
    def get_station_queue(self, station_id: str, limit: int = 5, tool_context: ToolContext | None = None) -> dict:
        """Fetch tickets for a station ordered by priority."""
        LOGGER.info("Fetching station queue | station_id=%s limit=%s", station_id, limit)
        rows = self._db.fetch_all(
            """
            SELECT ticket_id, status, priority_score, priority_reason, enqueued_at
            FROM v_station_queue
            WHERE station_id = %s
            ORDER BY priority_score DESC NULLS LAST, enqueued_at ASC
            LIMIT %s
            """,
            (station_id, limit),
        )
        serialised = serialize_rows(rows)
        for row in serialised:
            if isinstance(row.get("priority_reason"), str):
                try:
                    row["priority_reason"] = json.loads(row["priority_reason"])
                except json.JSONDecodeError:
                    pass
        return _success({"tickets": serialised})

    @tool(context=True)
    def start_ticket(self, ticket_id: str, tool_context: ToolContext | None = None) -> dict:
        """Mark a ticket as actively firing."""
        LOGGER.info("Starting ticket | ticket_id=%s", ticket_id)
        row = self._db.fetch_one(
            """
            UPDATE kds_tickets
            SET status = 'firing', started_at = COALESCE(started_at, now())
            WHERE id = %s
            RETURNING id, status, started_at
            """,
            (ticket_id,),
        )
        if not row:
            return _error(f"Ticket {ticket_id} not found")
        return _text_success("Ticket moved to firing", serialize_row(row))

    @tool(context=True)
    def hold_ticket(self, ticket_id: str, minutes: int = 2, tool_context: ToolContext | None = None) -> dict:
        """Temporarily delay a ticket by shifting its enqueue time."""
        LOGGER.info("Holding ticket | ticket_id=%s minutes=%s", ticket_id, minutes)
        row = self._db.fetch_one(
            """
            UPDATE kds_tickets
            SET status = 'queued',
                enqueued_at = now() + make_interval(mins => %s),
                priority_score = COALESCE(priority_score, 0) * 0.8
            WHERE id = %s
            RETURNING id, status, enqueued_at, priority_score
            """,
            (minutes, ticket_id),
        )
        if not row:
            return _error(f"Ticket {ticket_id} not found")
        return _text_success("Ticket held", serialize_row(row))

    @tool(context=True)
    def pass_ticket(self, ticket_id: str, tool_context: ToolContext | None = None) -> dict:
        """Complete a ticket and move it down the queue."""
        LOGGER.info("Passing ticket | ticket_id=%s", ticket_id)
        row = self._db.fetch_one(
            """
            UPDATE kds_tickets
            SET status = 'passed', completed_at = now()
            WHERE id = %s
            RETURNING id, status, completed_at
            """,
            (ticket_id,),
        )
        if not row:
            return _error(f"Ticket {ticket_id} not found")
        return _text_success("Ticket passed to next step", serialize_row(row))

    # --- SLA watchdog tools -----------------------------------------------------

    @tool(context=True)
    def list_open_breaches(self, location_id: str, tool_context: ToolContext | None = None) -> dict:
        """List tickets breaching wait-time SLA for a location."""
        LOGGER.info("Listing open SLA breaches | location_id=%s", location_id)
        rows = self._db.fetch_all(
            """
            SELECT b.ticket_id,
                   b.station_id,
                   s.name AS station_name,
                   b.minutes_elapsed,
                   b.sla_minutes,
                   (b.minutes_elapsed / NULLIF(b.sla_minutes, 0)) AS sla_ratio
            FROM v_wait_sla_breaches b
            JOIN stations s ON s.id = b.station_id
            WHERE s.location_id = %s
            ORDER BY b.minutes_elapsed DESC
            """,
            (location_id,),
        )
        payload = []
        for row in rows:
            data = serialize_row(row)
            ratio = data.get("sla_ratio")
            if isinstance(ratio, (float, int)):
                if ratio >= 2:
                    data["severity"] = "critical"
                elif ratio >= 1.2:
                    data["severity"] = "warning"
                else:
                    data["severity"] = "info"
            payload.append(data)
        return _success({"breaches": payload})

    @tool(context=True)
    def ack_alert(self, alert_id: str, tool_context: ToolContext | None = None) -> dict:
        """Acknowledge an alert to stop repeated notifications."""
        LOGGER.info("Acknowledging alert | alert_id=%s", alert_id)
        row = self._db.fetch_one(
            """
            UPDATE alerts
            SET acknowledged_at = now()
            WHERE id = %s
            RETURNING id, message, kind, severity, acknowledged_at
            """,
            (alert_id,),
        )
        if not row:
            return _error(f"Alert {alert_id} not found")
        return _text_success("Alert acknowledged", serialize_row(row))

    @tool(context=True)
    def notify(self, channel: str, message: str, tool_context: ToolContext | None = None) -> dict:
        """Log a notification for downstream systems to consume."""
        LOGGER.warning("Notification dispatched | channel=%s message=%s", channel, message)
        return _text_success("Notification recorded", {"channel": channel, "message": message})

    # --- Prep planner tools -----------------------------------------------------

    @tool(context=True)
    def generate_prep_plan(
        self,
        location_id: str,
        window: dict[str, str],
        tool_context: ToolContext | None = None,
    ) -> dict:
        """Create or refresh a prep plan for a location and time window."""
        if "start" not in window or "end" not in window:
            raise ValueError("window.start and window.end are required ISO-8601 timestamps")

        start_at = _parse_timestamp(window["start"], "window.start")
        end_at = _parse_timestamp(window["end"], "window.end")
        if end_at <= start_at:
            raise ValueError("window.end must be later than window.start")

        LOGGER.info(
            "Generating prep plan | location_id=%s start=%s end=%s", location_id, start_at.isoformat(), end_at.isoformat()
        )

        with self._db.transaction() as cur:
            cur.execute(
                """
                SELECT id
                FROM prep_plans
                WHERE location_id = %s AND plan_for = %s
                """,
                (location_id, start_at),
            )
            existing = cur.fetchone()
            if existing:
                plan_id = existing["id"]
                cur.execute("DELETE FROM prep_plan_lines WHERE plan_id = %s", (plan_id,))
            else:
                cur.execute(
                    """
                    INSERT INTO prep_plans (location_id, plan_for, model_version, note)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (location_id, start_at, "planner-v0", json.dumps({"window": window})),
                )
                plan_id = cur.fetchone()["id"]

            cur.execute(
                """
                SELECT menu_item_id, SUM(expected_qty) AS expected_qty
                FROM demand_forecasts
                WHERE location_id = %s AND bucket_start >= %s AND bucket_end <= %s
                GROUP BY menu_item_id
                """,
                (location_id, start_at, end_at),
            )
            forecasts = cur.fetchall()

            total_lines = 0
            for forecast in forecasts:
                menu_item_id = forecast["menu_item_id"]
                expected_qty = forecast["expected_qty"] or Decimal("0")

                cur.execute(
                    """
                    SELECT r.ingredient_id,
                           r.qty,
                           i.on_hand,
                           i.unit
                    FROM recipes r
                    LEFT JOIN inventory_levels i ON i.ingredient_id = r.ingredient_id AND i.location_id = %s
                    WHERE r.menu_item_id = %s
                    """,
                    (location_id, menu_item_id),
                )
                ingredients = cur.fetchall()

                available_portions: float | None = None
                ingredient_details: list[dict[str, Any]] = []
                for ingredient in ingredients:
                    qty = ingredient["qty"] or 0
                    on_hand = ingredient.get("on_hand") or 0
                    if qty and on_hand is not None:
                        possible = float(on_hand) / float(qty) if qty else 0
                        available_portions = possible if available_portions is None else min(available_portions, possible)
                    ingredient_details.append(serialize_row(ingredient))

                available_portions = available_portions or 0.0
                recommended_qty = max(float(expected_qty) - available_portions, 0.0)

                rationale = {
                    "expected_qty": float(expected_qty),
                    "available_portions": available_portions,
                    "ingredients": ingredient_details,
                    "window": window,
                }

                if recommended_qty <= 0:
                    continue

                cur.execute(
                    """
                    INSERT INTO prep_plan_lines (plan_id, menu_item_id, recommended_qty, rationale)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (plan_id, menu_item_id)
                    DO UPDATE SET recommended_qty = EXCLUDED.recommended_qty, rationale = EXCLUDED.rationale
                    """,
                    (plan_id, menu_item_id, recommended_qty, json.dumps(rationale)),
                )
                total_lines += 1

        return _text_success(
            "Prep plan generated",
            {"plan_id": plan_id, "lines": total_lines, "window": window},
        )

    @tool(context=True)
    def summarize_prep_plan(self, plan_id: str, tool_context: ToolContext | None = None) -> dict:
        """Summarise a stored prep plan."""
        LOGGER.info("Summarising prep plan | plan_id=%s", plan_id)
        plan = self._db.fetch_one(
            """
            SELECT p.id, p.plan_for, p.generated_at, p.model_version, p.note, l.name AS location_name
            FROM prep_plans p
            JOIN locations l ON l.id = p.location_id
            WHERE p.id = %s
            """,
            (plan_id,),
        )
        if not plan:
            return _error(f"Prep plan {plan_id} not found")

        lines = self._db.fetch_all(
            """
            SELECT ppl.menu_item_id,
                   mi.name,
                   ppl.recommended_qty,
                   ppl.rationale
            FROM prep_plan_lines ppl
            JOIN menu_items mi ON mi.id = ppl.menu_item_id
            WHERE ppl.plan_id = %s
            ORDER BY mi.name
            """,
            (plan_id,),
        )
        payload = serialize_row(plan)
        payload["lines"] = []
        for line in lines:
            entry = serialize_row(line)
            if isinstance(entry.get("rationale"), str):
                try:
                    entry["rationale"] = json.loads(entry["rationale"])
                except json.JSONDecodeError:
                    pass
            payload["lines"].append(entry)

        return _success(payload)

    # --- Inventory tools --------------------------------------------------------

    @tool(context=True)
    def list_restock_risks(self, location_id: str, tool_context: ToolContext | None = None) -> dict:
        """Retrieve restock recommendations for a location."""
        LOGGER.info("Listing restock risks | location_id=%s", location_id)
        rows = self._db.fetch_all(
            """
            SELECT rr.id,
                   rr.ingredient_id,
                   ing.name AS ingredient_name,
                   rr.recommended_qty_packs,
                   rr.supplier_id,
                   sup.name AS supplier_name,
                   rr.rationale,
                   rr.created_at
            FROM restock_recommendations rr
            JOIN ingredients ing ON ing.id = rr.ingredient_id
            LEFT JOIN suppliers sup ON sup.id = rr.supplier_id
            WHERE rr.location_id = %s
            ORDER BY rr.created_at DESC
            """,
            (location_id,),
        )
        payload = []
        for row in rows:
            serialised = serialize_row(row)
            rationale = serialised.get("rationale")
            if isinstance(rationale, str):
                try:
                    serialised["rationale"] = json.loads(rationale)
                except json.JSONDecodeError:
                    pass
            payload.append(serialised)
        return _success({"recommendations": payload})

    @tool(context=True)
    def create_po_from_recs(
        self,
        location_id: str,
        supplier_id: str,
        tool_context: ToolContext | None = None,
    ) -> dict:
        """Create a draft purchase order from current recommendations."""
        LOGGER.info("Creating PO from recommendations | location_id=%s supplier_id=%s", location_id, supplier_id)

        with self._db.transaction() as cur:
            cur.execute(
                """
                SELECT rr.id,
                       rr.ingredient_id,
                       ing.name AS ingredient_name,
                       rr.recommended_qty_packs,
                       rr.rationale,
                       isp.price_per_pack
                FROM restock_recommendations rr
                JOIN ingredients ing ON ing.id = rr.ingredient_id
                LEFT JOIN ingredient_suppliers isp
                    ON isp.ingredient_id = rr.ingredient_id AND isp.supplier_id = %s
                WHERE rr.location_id = %s AND (rr.supplier_id = %s OR rr.supplier_id IS NULL)
                """,
                (supplier_id, location_id, supplier_id),
            )
            recs = cur.fetchall()
            if not recs:
                return _error("No restock recommendations available for the supplier")

            now_str = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            po_number = f"PO-{now_str}"
            cur.execute(
                """
                INSERT INTO purchase_orders (org_id, location_id, supplier_id, po_number)
                SELECT l.org_id, l.id, %s, %s
                FROM locations l
                WHERE l.id = %s
                RETURNING id
                """,
                (supplier_id, po_number, location_id),
            )
            po_row = cur.fetchone()
            if not po_row:
                raise RuntimeError("Failed to create purchase order header")
            po_id = po_row["id"]

            line_payload: list[dict[str, Any]] = []
            for rec in recs:
                qty_packs = rec["recommended_qty_packs"]
                price = rec.get("price_per_pack") or 0
                cur.execute(
                    """
                    INSERT INTO purchase_order_items (po_id, ingredient_id, qty_packs, price_per_pack)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (po_id, ingredient_id)
                    DO UPDATE SET qty_packs = EXCLUDED.qty_packs, price_per_pack = EXCLUDED.price_per_pack
                    RETURNING id
                    """,
                    (po_id, rec["ingredient_id"], qty_packs, price),
                )
                line_payload.append(
                    {
                        "ingredient_id": rec["ingredient_id"],
                        "ingredient_name": rec["ingredient_name"],
                        "qty_packs": float(qty_packs),
                        "price_per_pack": float(price),
                    }
                )

        return _text_success(
            "Purchase order drafted",
            {"po_id": po_id, "po_number": po_number, "lines": line_payload},
        )

    # --- Waste & substitution tools --------------------------------------------

    @tool(context=True)
    def suggest_substitute(self, ingredient_id: str, tool_context: ToolContext | None = None) -> dict:
        """Suggest an alternative ingredient with available stock."""
        LOGGER.info("Suggesting substitute | ingredient_id=%s", ingredient_id)
        ingredient = self._db.fetch_one(
            """
            SELECT id, name, unit
            FROM ingredients
            WHERE id = %s
            """,
            (ingredient_id,),
        )
        if not ingredient:
            return _error(f"Ingredient {ingredient_id} not found")

        rows = self._db.fetch_all(
            """
            SELECT ing.id,
                   ing.name,
                   inv.on_hand,
                   inv.unit
            FROM ingredients ing
            JOIN inventory_levels inv ON inv.ingredient_id = ing.id
            WHERE ing.unit = %s AND ing.id <> %s
            ORDER BY inv.on_hand DESC NULLS LAST
            LIMIT 3
            """,
            (ingredient["unit"], ingredient_id),
        )
        payload = {
            "ingredient": serialize_row(ingredient),
            "candidates": serialize_rows(rows),
        }
        return _success(payload)

    @tool(context=True)
    def log_waste(
        self,
        menu_item_id: str | None,
        ingredient_id: str | None,
        qty: float,
        reason: str,
        location_id: str,
        tool_context: ToolContext | None = None,
    ) -> dict:
        """Record a waste event for traceability."""
        LOGGER.info(
            "Logging waste | menu_item_id=%s ingredient_id=%s qty=%s reason=%s location_id=%s",
            menu_item_id,
            ingredient_id,
            qty,
            reason,
            location_id,
        )
        row = self._db.fetch_one(
            """
            INSERT INTO waste_events (location_id, menu_item_id, ingredient_id, qty, reason)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, occurred_at
            """,
            (location_id, menu_item_id, ingredient_id, qty, reason),
        )
        return _text_success("Waste event recorded", serialize_row(row))

    # --- Explainability tools ---------------------------------------------------

    @tool(context=True)
    def explain_ticket(self, ticket_id: str, tool_context: ToolContext | None = None) -> dict:
        """Provide context for why a ticket is prioritised."""
        LOGGER.info("Explaining ticket | ticket_id=%s", ticket_id)
        row = self._db.fetch_one(
            """
            SELECT kt.id,
                   kt.status,
                   kt.priority_score,
                   kt.priority_reason,
                   kt.enqueued_at,
                   oi.menu_item_id,
                   mi.name AS menu_item_name,
                   oi.qty,
                   o.table_number,
                   o.placed_at
            FROM kds_tickets kt
            JOIN order_items oi ON oi.id = kt.order_item_id
            JOIN menu_items mi ON mi.id = oi.menu_item_id
            JOIN orders o ON o.id = oi.order_id
            WHERE kt.id = %s
            """,
            (ticket_id,),
        )
        if not row:
            return _error(f"Ticket {ticket_id} not found")
        data = serialize_row(row)
        reason = data.get("priority_reason")
        if isinstance(reason, str):
            try:
                data["priority_reason"] = json.loads(reason)
            except json.JSONDecodeError:
                pass
        return _success(data)

    @tool(context=True)
    def explain_prep_plan(self, plan_id: str, tool_context: ToolContext | None = None) -> dict:
        """Explain the drivers for a prep plan."""
        LOGGER.info("Explaining prep plan | plan_id=%s", plan_id)
        summary = self.summarize_prep_plan(plan_id, tool_context)
        if summary["status"] == "error":
            return summary
        payload = summary["content"][0]["json"]  # type: ignore[index]
        highlights: list[str] = []
        for line in payload.get("lines", []):
            rationale = line.get("rationale", {})
            expected = rationale.get("expected_qty")
            available = rationale.get("available_portions")
            name = line.get("name", line.get("menu_item_id"))
            highlights.append(
                f"Prep {line['recommended_qty']} of {name}: forecast {expected}, on-hand covers {available}."
            )
        return _success({"plan": payload, "highlights": highlights})
