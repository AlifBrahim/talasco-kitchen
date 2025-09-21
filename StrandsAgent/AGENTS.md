# Repository Guidelines

## Project Structure & Module Organization
- `main.py` — CLI gateway that wires configuration, the PostgreSQL pool, and the agent registry.
- `app/` — runtime code:
  - `agents.py` (Bedrock‑backed agents), `tools.py` (database tools)
  - `config.py`, `db.py`, `utils.py`, `seed_data.py`
- `db_schema.sql` — keep aligned with tool queries.
- `kitchen_agents_spec.md` — behaviour/role reference for agents.
- `tests/` — pytest suites targeting tools and agents.

## Build, Test, and Development Commands
- Setup env:
  - `python -m venv .venv && source .venv/bin/activate` (Windows: `./.venv/Scripts/Activate.ps1`)
  - `pip install -r requirements.txt`
- Configure `.env` with: `DATABASE_URL` (or `DB_*`), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `BEDROCK_MODEL_ID`.
- Load schema: `psql $DATABASE_URL -f db_schema.sql`
- Seed demo data: `python main.py seed`
- List agents: `python main.py list`
- Run an agent: `python main.py run kitchen_copilot "How’s prep looking?"`
- Call a tool directly: `python main.py tool prep_planner summarize_prep_plan --payload '{"plan_id": "..."}'`
- Tests: `pytest -q` (add tests under `tests/`)

## Coding Style & Naming Conventions
- PEP 8, 4‑space indent, 100‑char lines, type hints on public functions.
- Naming: `snake_case` for files/functions/tools, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants.
- Keep diffs small and focused; update `db_schema.sql` and seeds together when schema changes.

## Testing Guidelines
- Use `pytest`; name files `test_*.py`. Mock Bedrock calls; reuse IDs from `app/seed_data.py` for deterministic fixtures.
- Prioritise tool edge cases (empty queues, conflicting restock signals) so agent tests stay light.
- Run locally with `pytest -q`; add assertions for returned shapes and error handling.

## Commit & Pull Request Guidelines
- Commits: imperative subject ≤72 chars (e.g., "Add prep planner stress test"). Group related schema + seed updates.
- PRs: describe the kitchen scenario addressed, list validation steps (commands/payloads), link any issue, and attach logs/screenshots when tool output changes.

## Agent Roster (Quick Reference)
- `station_dispatcher` — ticket selection by SLA/table completion.
- `supervisor` — station status, blockers, guidance.
- `sla_watchdog` — active breaches + alerts.
- `prep_planner` — 30‑min+ prep projections.
- `inventory_controller` — restock recommendations as POs.
- `substitution_waste_reducer` — safe swaps, waste logging.
- `kitchen_copilot` — generalist; explain Do/Why; rely on tools.
