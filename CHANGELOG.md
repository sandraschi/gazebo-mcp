# Changelog

## 0.2.0 (2026-07-04)

Full fleet certification: NSIS build pipeline, standard compliance, session injection, Biome, Docker.

### NSIS/Tauri Build Pipeline
- Created `run_server.py` — dual-transport entry point (HTTP when GAZEBO_MCP_PORT set, stdio otherwise)
- Created `gazebo-mcp-backend.spec` — PyInstaller spec with strip=False, upx=False, noarchive=True
- Fixed `tauri.conf.json`: frontendDist path, CSP port, bundled .env.example instead of .env
- Fixed `backend.rs`: port 10700→10991, hardened free_port() with multi-layer kill loop
- Fixed `build.ps1`: entry-point gate, frozen binary smoke test, size gate (>= 5 MB)
- Created `.env.example` — safe template for user credentials

### Standard Compliance
- Added tool annotations (READ_ONLY / MUTATING) to all 14 tools
- Created `glama.json` for Glama MCP registry
- Created `llms-full.txt` — comprehensive LLM documentation
- Added `prefab-ui>=0.14.0` to core dependencies
- Added `GET /api/v1/diagnostics` endpoint for CUA smoke testing
- Fixed `/api/health` to return standard fleet format (version, uptime_seconds, tool_count)
- Added CORS origins for Tauri WebView (tauri://localhost)

### Critical Bug Fixes
- Fixed `start.bat` — had literal `\n` instead of newlines, couldn't execute
- Removed cargo-cult `mujoco` dependency from pyproject.toml
- Fixed doubled description text
- Fixed orphaned recipe in justfile
- Created `tsconfig.json` (was missing entirely)
- Fixed `regex=`→`pattern=` deprecations in logging routes

### Web Dashboard
- Ctrl+Scroll zoom with localStorage persistence (`useZoom` hook)
- Skills page with REST endpoint (`GET /api/skills`, `GET /api/skills/{name}`)
- `color-scheme: dark` CSS for native form controls
- Added `/mcp` proxy in Vite config
- `data-testid` attributes on sidebar and app shell
- Help page dark theme fixes

### Repository
- Session context injection: `.claude-plugin/`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`
- Biome JS/TS linting config (`web_sota/biome.json`) with CI integration
- Pre-commit config (`.pre-commit-config.yaml` with ruff)
- Dockerfile + docker-compose.yml for containerized deployment
- CI improvements: push/PR triggers, nightly schedule, tsc + biome + vite build steps
- **Gazebo Fuel browser**: `GET /api/fuel`, `GET /api/fuel/tags`, `POST /api/fuel/load` with tag/category filtering, search, description, download stats
- Worlds page now has two tabs: Local Depot + Gazebo Fuel with category dropdown and one-click download
- Fixed Fuel API path (`/1.0/models` — was using wrong `/api/v1/models` that returned 404)
- 22 pytest tests passing, tsc --noEmit clean, Vite build clean

## 0.2.0-alpha (2026-06-11)

- Initial release: 14 MCP tools (9 sim + 5 AI)
- Sim tools: sim_status, load_world, start_sim, stop_sim, get_state, spawn_model, apply_control, list_worlds, list_jobs
- AI tools: agentic_sim_workflow, natural_language_control, analyze_sim_state, analyze_sim_logs, discover_model
- World depot: SDF management with .depot/registry.json
- Job isolation: per-simulation subprocess lifecycle
- Web dashboard: Vite + React at 10990
- docs/GAZEBO_VS_OTHERS.md — comparison with MuJoCo, Isaac Sim, PyBullet
- PRD.md, CHANGELOG.md, AGENTS.md, CLAUDE.md
- Fleet-standard port registration (10990/10991)
- llms.txt for Claude Desktop discovery
- start.ps1, start.bat, justfile, pyproject.toml
- GitHub CI with ruff lint + pytest on push/PR
