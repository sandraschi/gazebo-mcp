# gazebo-mcp

**General-purpose Gazebo simulator wrapper via MCP** — load worlds, control simulations, and monitor state from any MCP client (Claude Desktop, Cursor).

**Ports:** Backend 10991 / Frontend 10990

**Version:** 0.2.0-alpha

---

## Table of Contents

- [Quick Start](#quick-start)
- [Tools](#tools-14-total)
- [Architecture](#architecture)
- [Webapp](#webapp)
- [Fleet Integration](#fleet-integration)
- [Development](#development)
- [Prerequisites](#prerequisites)

---

## Quick Start

```powershell
git clone https://github.com/sandraschi/gazebo-mcp
cd gazebo-mcp
uv sync
uv run python -m gazebo_mcp
```

Or use the start script:

```powershell
.\start.bat          # backend + webapp
.\start.ps1 -Headless # backend only
```

---

## Tools (14 total)

| # | Tool | Description |
|---|------|-------------|
| 1 | `sim_status` | Health check — Gazebo CLI availability, version, depot stats |
| 2 | `load_world` | Load an SDF world file into the depot |
| 3 | `spawn_model` | Spawn a model into a running simulation via `gz service` |
| 4 | `start_sim` | Launch a Gazebo simulation as a background subprocess |
| 5 | `stop_sim` | Stop a running simulation |
| 6 | `get_state` | Query simulation process state and metadata |
| 7 | `apply_control` | Publish a command to a Gazebo topic via `gz topic` |
| 8 | `list_worlds` | List all worlds in the depot |
| 9 | `list_jobs` | List active and completed simulation jobs |
| 10 | `agentic_sim_workflow` | 🤖 Multi-step simulation orchestration via host LLM |
| 11 | `natural_language_control` | 🎯 NL commands to topic payloads |
| 12 | `analyze_sim_state` | 📊 NL analysis of sim state |
| 13 | `analyze_sim_logs` | 🔍 Root-cause analysis from sim stderr |
| 14 | `discover_model` | 🌐 Suggest SDF/URDF model URLs from description |

---

## Architecture

```
MCP client -> FastMCP (10991) -> subprocess (gz sim)
                                  -> SDF world loaded
                                  -> physics + sensor loop
                                  -> state via process info
```

Each simulation runs as an isolated subprocess.

---

## Webapp

Vite + React dashboard at **10990** with pages: Dashboard, Simulations, Worlds, World Detail, Logging, LLM, Help.

---

## Fleet Integration

- **freecad-mcp** (10944/10945) — generate geometry for Gazebo simulation
- **godot-mcp** (10992/10993) — visualize simulation data

---

## Development

```powershell
just lint              # ruff check
just test              # pytest
just dev               # backend + frontend with hot reload
just e2e               # Playwright e2e tests (future)
```

See `mcp-central-docs/standards/rules/` for fleet conventions.

---

## Prerequisites

- **Python 3.11+**
- **Gazebo** — either natively on PATH (`gz` / `ign`) or, on Windows, inside the
  **default WSL2 distro**. Native Windows Gazebo support is effectively
  nonexistent; WSL2 is the supported path here and is auto-detected.

### WSL2 mode (Windows)

If `gz` is not on the Windows PATH, the server probes `wsl -e bash -lc "command -v gz"`
and, on success, runs every Gazebo command as `wsl -e gz ...`. Depot paths are
translated to `/mnt/<drive>/...` automatically. GUI mode (`headless=False`)
renders through WSLg. `sim_status` reports the active mode in `gz_mode`
(`native` / `wsl` / null).

Install Gazebo in WSL2 Ubuntu: https://gazebosim.org/docs — verified against
Gazebo 10.1.0 in Ubuntu/WSL2 (gz sim headless e2e, 2026-06-11).

Caveat: `stop_sim` terminates the `wsl.exe` wrapper process; orphaned `gz`
processes inside the distro are possible after hard kills — `wsl --terminate
Ubuntu` is the big hammer.
