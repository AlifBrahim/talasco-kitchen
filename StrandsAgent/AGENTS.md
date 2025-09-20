# Repository Guidelines

## Project Structure & Module Organization
`main.py` is the CLI gateway that wires configuration, the PostgreSQL pool, and the agent registry. All runtime code sits in `app/`: `agents.py` declares the Bedrock-backed agents, `tools.py` exposes database-powered actions, while `config.py`, `db.py`, `utils.py`, and `seed_data.py` provide shared plumbing. Keep `db_schema.sql` aligned with tool queries and lean on `kitchen_agents_spec.md` when you adjust behaviour or add roles.

## Agent Roster & Responsibilities
- `station_dispatcher`: Chooses the next 1–3 tickets for a station, prioritising SLA risk and table completion.
- `supervisor`: Summarises station status, surfaces blockers, and recommends actions to keep service moving.
- `sla_watchdog`: Lists active SLA breaches and drafts concise alerts with severity guidance.
- `prep_planner`: Projects prep needs 30+ minutes out by combining forecasts and inventory data.
- `inventory_controller`: Bundles restock recommendations into purchase orders grouped by supplier.
- `substitution_waste_reducer`: Spots low coverage items, proposes safe swaps, and logs waste events.
- `kitchen_copilot`: Acts as the generalist; responds with Do/Why, relies on tools, and avoids invented data.

## Environment & Configuration
Create a venv with `python -m venv .venv`, activate it, then run `pip install -r requirements.txt`. Provide `DATABASE_URL` (or the discrete `DB_*`) plus Bedrock credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `BEDROCK_MODEL_ID`) in `.env`. Load the schema with `psql $DATABASE_URL -f db_schema.sql`.

## Build, Test, and Development Commands
- `python main.py list` – enumerate available agents.
- `python main.py run kitchen_copilot "Prompt"` – exercise an agent end-to-end.
- `python main.py tool prep_planner summarize_prep_plan --payload '{"plan_id": "..."}'` – invoke a tool directly.
- `python main.py seed` – insert deterministic demo data for quick manual testing.

## Coding Style & Naming Conventions
Follow PEP 8 with four-space indentation, 100-character lines, and type hints on public functions. Use `snake_case` for functions, files, and tool names; `PascalCase` for classes; and upper snake case for constants.

## Testing Guidelines
Introduce `pytest` suites under `tests/` with files like `test_prep_planner.py`. Reuse the IDs from `app/seed_data.py` to stand up predictable fixtures and mock Bedrock calls when asserting agent responses. Target tool edge cases first (empty queues, conflicting restock signals) so higher-level agent tests stay lightweight.

## Commit & Pull Request Guidelines
Write imperative commit subjects under 72 characters (e.g., "Add prep planner stress test") and keep related schema + seed updates grouped. Pull requests must outline the kitchen scenario addressed, list validation steps (commands, payloads), link any tracking issue, and attach screenshots or logs when tool output changes.
