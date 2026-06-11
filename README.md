# gazebo-mcp

**General-purpose Gazebo simulator wrapper via MCP** — load worlds, control simulations, and monitor state from any MCP client (Claude Desktop, Cursor).

**Ports:** Backend 10991 / Frontend 10990

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

## Tools

| Tool | Description |
|------|-------------|
| `sim_status` | Health check — Gazebo CLI availability, version, depot stats |
| `load_world` | Load an SDF world file into the depot |
| `spawn_model` | Spawn a model into a running simulation via `gz service` |
| `start_sim` | Launch a Gazebo simulation as a background subprocess |
| `stop_sim` | Stop a running simulation |
| `get_state` | Query simulation process state and metadata |
| `apply_control` | Publish a command to a Gazebo topic via `gz topic` |
| `list_worlds` | List all worlds in the depot |
| `list_jobs` | List active and completed simulation jobs |
| `agentic_sim_workflow` | Autonomous multi-step simulation workflow via LLM |
| `natural_language_control` | Convert NL commands to topic payloads |
| `analyze_sim_state` | Natural-language analysis of sim state |
| `analyze_sim_logs` | Root-cause analysis from sim stderr |
| `discover_model` | Suggest SDF/URDF model URLs from description |

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

Vite + React dashboard at **10990** with world depot browser, simulation control panel, and LLM interface.

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
```

See `mcp-central-docs/standards/rules/` for fleet conventions.

---

## Prerequisites

- **Python 3.11+**
- **Gazebo (Ignition)** — see https://gazebosim.org for install instructions
- `gz sim` or `ign gazebo` on PATH
