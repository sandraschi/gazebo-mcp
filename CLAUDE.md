# gazebo-mcp — Agent Context

## What this is
General-purpose Gazebo simulation via MCP. Load any SDF world, control it,
monitor state — all through MCP tools. 14 tools total (9 sim + 5 AI).

## Key paths
- `src/gazebo_mcp/server.py` — 14 MCP tools
- `web_sota/backend/server.py` — FastAPI backend (port 10991)
- `web_sota/src/` — React frontend (port 10990)
- `worlds/` — loaded SDF world depot
- `jobs/` — sim job state/control dirs

## Commands
- `uv run pytest tests/ -q` — unit tests
- `ruff check src/ web_sota/backend/` — lint
- `uv run python -m gazebo_mcp` — start MCP stdio
- `.\web_sota\start.ps1` — full web dashboard

## Gotchas
- Sim runs as subprocess for isolation (crash-safe)
- State tracking via process status + metadata.json
- Gazebo must be installed separately (gz sim or ign gazebo on PATH)
- AI tools fall back to Ollama when ctx.sample is unavailable
