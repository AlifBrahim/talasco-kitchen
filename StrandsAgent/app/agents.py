"""Agent factory matching the kitchen spec."""

from __future__ import annotations

import logging
from typing import Callable, Dict

from strands import Agent
from strands.models import BedrockModel

from .config import Settings, get_settings
from .db import Database
from .tools import KitchenTools

LOGGER = logging.getLogger(__name__)


def _build_model(settings: Settings) -> BedrockModel:
    model_kwargs: dict[str, object] = {}
    if settings.aws.region:
        model_kwargs["region_name"] = settings.aws.region
    if settings.aws.bedrock_model_id:
        model_kwargs["model_id"] = settings.aws.bedrock_model_id
    LOGGER.debug("Creating Bedrock model with kwargs=%s", model_kwargs)
    return BedrockModel(**model_kwargs)


class AgentRegistry:
    """Factory for all configured kitchen agents."""

    def __init__(self, db: Database, settings: Settings | None = None) -> None:
        self._db = db
        self._settings = settings or get_settings()
        self._tools = KitchenTools(db)

    def _agent(self, name: str, system_prompt: str, tools: list, description: str | None = None) -> Agent:
        return Agent(
            model=_build_model(self._settings),
            system_prompt=system_prompt,
            agent_id=name,
            name=name,
            description=description,
            tools=tools,
            callback_handler=None,
        )

    def build_station_dispatcher(self) -> Agent:
        prompt = (
            "Recommend the next 1–3 tickets to fire for this station. Weigh SLA risk, prep time, "
            "and table completion. Answer with clear Do / Why guidance."
        )
        tools = [
            self._tools.get_station_queue,
            self._tools.start_ticket,
            self._tools.hold_ticket,
            self._tools.pass_ticket,
            self._tools.explain_ticket,
        ]
        return self._agent("station_dispatcher", prompt, tools)

    def build_supervisor(self) -> Agent:
        prompt = (
            "Act as kitchen supervisor. Aggregate station statuses, highlight blockers, and recommend actions "
            "that unblock tables while respecting SLAs."
        )
        tools = [
            self._tools.get_station_queue,
            self._tools.list_open_breaches,
            self._tools.notify,
            self._tools.explain_ticket,
        ]
        return self._agent("supervisor", prompt, tools)

    def build_sla_watchdog(self) -> Agent:
        prompt = (
            "List current SLA breaches and recommend concise alerts with severity. "
            "Keep responses under 120 characters when possible."
        )
        tools = [
            self._tools.list_open_breaches,
            self._tools.ack_alert,
            self._tools.notify,
            self._tools.explain_ticket,
        ]
        return self._agent("sla_watchdog", prompt, tools)

    def build_prep_planner(self) -> Agent:
        prompt = (
            "Generate pre-service prep plans at least 30 minutes ahead. Combine forecasts with on-hand stock and "
            "output item, quantity, start time plus rationale referencing forecast and inventory."
        )
        tools = [
            self._tools.generate_prep_plan,
            self._tools.summarize_prep_plan,
            self._tools.explain_prep_plan,
        ]
        return self._agent("prep_planner", prompt, tools)

    def build_inventory_controller(self) -> Agent:
        prompt = (
            "Maintain optimal stock. Review restock recommendations, group by supplier, and draft purchase orders "
            "with quantities, pricing, and rationale."
        )
        tools = [
            self._tools.list_restock_risks,
            self._tools.create_po_from_recs,
            self._tools.notify,
        ]
        return self._agent("inventory_controller", prompt, tools)

    def build_substitution_waste_reducer(self) -> Agent:
        prompt = (
            "Reduce waste by spotting low coverage ingredients, proposing safe substitutes, and logging overprep or "
            "expired waste when actions are taken."
        )
        tools = [
            self._tools.suggest_substitute,
            self._tools.log_waste,
            self._tools.notify,
        ]
        return self._agent("substitution_waste_reducer", prompt, tools)

    def build_kitchen_copilot(self) -> Agent:
        prompt = (
            "Be brief and decisive. Respond with Do now / Why / Risks (optional). Use tools for facts and actions; "
            "never invent data."
        )
        tools = [
            self._tools.get_station_queue,
            self._tools.list_open_breaches,
            self._tools.summarize_prep_plan,
            self._tools.list_restock_risks,
            self._tools.explain_ticket,
            self._tools.explain_prep_plan,
        ]
        return self._agent("kitchen_copilot", prompt, tools)

    def all_agents(self) -> Dict[str, Agent]:
        return {name: builder() for name, builder in self._builders().items()}

    def get_agent(self, name: str) -> Agent:
        builders = self._builders()
        if name not in builders:
            raise KeyError(f"Unknown agent '{name}'")
        return builders[name]()

    def _builders(self) -> dict[str, Callable[[], Agent]]:
        return {
            "station_dispatcher": self.build_station_dispatcher,
            "supervisor": self.build_supervisor,
            "sla_watchdog": self.build_sla_watchdog,
            "prep_planner": self.build_prep_planner,
            "inventory_controller": self.build_inventory_controller,
            "substitution_waste_reducer": self.build_substitution_waste_reducer,
            "kitchen_copilot": self.build_kitchen_copilot,
        }

    def agent_names(self) -> list[str]:
        return list(self._builders().keys())

    def call_tool(self, tool_name: str, **payload: object) -> object:
        """Invoke a KitchenTools method directly with provided payload."""
        if not hasattr(self._tools, tool_name):
            raise KeyError(f"Unknown tool '{tool_name}'")
        tool = getattr(self._tools, tool_name)
        return tool(**payload)
