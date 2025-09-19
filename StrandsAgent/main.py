"""CLI harness for interacting with the kitchen agents."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from typing import Any

from app.agents import AgentRegistry
from app.config import get_settings
from app.db import Database
from app.seed_data import seed_demo_data


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def _load_payload(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    raw = raw.strip()

    # PowerShell or shells may preserve outer quotes; strip matching pairs for JSON objects.
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in {'"', "'"}:
        raw = raw[1:-1]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        try:
            import ast

            parsed = ast.literal_eval(raw)
            if isinstance(parsed, dict):
                return parsed
        except (ValueError, SyntaxError):
            pass

        # Attempt to parse simple key:value pairs without quotes.
        candidate = raw.strip()
        if candidate.startswith("{") and candidate.endswith("}" ):
            candidate = candidate[1:-1]
            pairs = [part.strip() for part in candidate.split(",") if part.strip()]
            simple: dict[str, Any] = {}
            try:
                for part in pairs:
                    if ":" in part:
                        key, value = part.split(":", 1)
                    elif "=" in part:
                        key, value = part.split("=", 1)
                    else:
                        raise ValueError
                    key = key.strip().strip("'\"")
                    value = value.strip().strip("'\"")
                    simple[key] = value
                if simple:
                    return simple
            except ValueError:
                pass

        raise SystemExit(f"Invalid JSON payload: {raw}")


def run() -> None:
    try:
        settings = get_settings()
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    configure_logging(settings.log_level)

    parser = argparse.ArgumentParser(description="Kitchen Agents CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list", help="List all available agents")

    run_parser = subparsers.add_parser("run", help="Invoke an agent with a prompt")
    run_parser.add_argument("agent", help="Agent name")
    run_parser.add_argument("prompt", help="User prompt to send")

    tool_parser = subparsers.add_parser("tool", help="Call an agent tool directly")
    tool_parser.add_argument("agent", help="Agent name")
    tool_parser.add_argument("tool_name", help="Tool method name (snake_case)")
    tool_parser.add_argument("--payload", help="JSON payload forwarded to the tool", default=None)

    subparsers.add_parser("seed", help="Insert demo data to exercise the agents")

    args = parser.parse_args()

    database = Database(settings.database)
    registry = AgentRegistry(database, settings)

    try:
        if args.command == "list":
            for name in registry.agent_names():
                print(name)
        elif args.command == "run":
            agent = registry.get_agent(args.agent)
            logging.info("Invoking agent '%s'", args.agent)
            result = agent(args.prompt)
            logging.info("Agent completed with stop reason=%s", result.stop_reason)
            print(str(result).strip())
        elif args.command == "tool":
            payload = _load_payload(args.payload)
            logging.info("Calling tool '%s' on agent '%s' with payload=%s", args.tool_name, args.agent, payload)
            # Instantiate the agent to ensure Bedrock credentials/config valid even when calling tool directly.
            _ = registry.get_agent(args.agent)
            result = registry.call_tool(args.tool_name, **payload)
            print(json.dumps(result, indent=2, default=str))
        elif args.command == "seed":
            seed_demo_data(database)
            print("Demo data seeded.")
    finally:
        database.close()


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        sys.exit(130)
