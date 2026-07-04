# gazebo-mcp

**Gazebo[^1] simulation via MCP[^2]. Load SDF[^3] worlds, spawn models, control via ROS 2 topics — through 14 MCP tools with AI workflows, a web dashboard, and a Tauri/NSIS native installer.**

[![CI](https://github.com/sandraschi/gazebo-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sandraschi/gazebo-mcp/actions/workflows/ci.yml)
[![Ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![FastMCP](https://img.shields.io/badge/FastMCP-3.4-blue)](https://github.com/jlowin/fastmcp)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

gazebo-mcp bridges Gazebo Garden/Harmonic with the MCP ecosystem. Load any SDF/URDF world, spawn models at runtime, start and stop physics, read simulation state, and publish control commands via ROS 2 topics — all through MCP tools. The server manages a world depot, a job queue, and integrates with the fleet simulation pipeline.

Built for the fleet simulation pipeline: gazebo-mcp provides a high-fidelity physics backend consumed by unitree-mcp, limx-robotics-mcp, and other robot-specific fleet MCPs for multi-robot scenarios, sensor simulation, and environment interaction.

**New in 0.2.0:** Tool annotations (READ_ONLY/MUTATING), Ctrl+Scroll zoom in desktop app, Skills page, `/api/v1/diagnostics` endpoint, Tauri/NSIS build pipeline with full CUA smoke testing, session context injection (`.cursorrules` + plugin), Biome JS/TS linting, Docker support, Gazebo Fuel browser with tag/category filtering and one-click download.

## Table of Contents

- [Quick Start](#quick-start)
- [Tools](#tools)
- [Web Dashboard](#web-dashboard)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Ports](#ports)
- [Footnotes](#footnotes)

## Quick Start

```powershell
# 1. Clone and enter
git clone https://github.com/sandraschi/gazebo-mcp
cd gazebo-mcp

# 2. Run the MCP server (stdio)
uv run python -m gazebo_mcp

# 3. Or launch the full web dashboard
.\start.ps1
```

## Tools

All 14 tools are annotated with READ_ONLY or MUTATING for agent safety.

| # | Tool | Annotation | Description |
|---|------|-----------|-------------|
| 1 | `sim_status` | READ_ONLY | Health check — Gazebo availability, active worlds, job queue depth |
| 2 | `load_world` | MUTATING | Load an SDF world file into the world depot |
| 3 | `spawn_model` | MUTATING | Spawn a model into a running Gazebo simulation |
| 4 | `start_sim` | MUTATING | Start physics stepping in a loaded world |
| 5 | `stop_sim` | MUTATING | Stop physics stepping |
| 6 | `get_state` | READ_ONLY | Read model poses, joint states, sensor data via Gazebo topics |
| 7 | `apply_control` | MUTATING | Publish control commands (velocity, torque, position) via ROS 2 |
| 8 | `list_worlds` | READ_ONLY | List all worlds in the depot |
| 9 | `list_jobs` | READ_ONLY | List active and completed simulation jobs |
| 10 | `agentic_sim_workflow` | MUTATING | Multi-step Gazebo workflow via LLM sampling |
| 11 | `natural_language_control` | MUTATING | Control the sim via natural language ("move the robot forward 1m") |
| 12 | `analyze_sim_state` | READ_ONLY | State analysis — contact forces, joint limits, odometry drift |
| 13 | `analyze_sim_logs` | READ_ONLY | Parse Gazebo server logs for warnings and errors |
| 14 | `discover_world` | MUTATING | Search and download worlds from the Gazebo Fuel repository |

[Full tool reference →](docs/TOOLS.md)

## Web Dashboard

8-page React + Vite dashboard at `http://localhost:10990`:

| Page | Features |
|------|----------|
| **Dashboard** | KPI cards (Gazebo, worlds, jobs, server status), Quick AI Workflow input, Active Jobs list |
| **Simulations** | Start/stop sims, world selection, headless toggle, AI analyze |
| **Worlds** | Load from URL/path, list with metadata, two tabs: Local Depot + Gazebo Fuel browser with tag/category filtering, search, and one-click download |
| **Skills** | Browse and load the Gazebo expert skill for agent guidance |
| **Logging** | Log viewer with filters, tail mode, export JSON/CSV |
| **LLM** | Chat with provider/model selectors, quick action cards |
| **Settings** | World dir, jobs dir, LLM provider/model config |
| **Help** | 4-tab help: Overview, Tools, Setup, Troubleshooting (dark-themed) |

AI features use the LLM through the `/api/llm/chat` endpoint, with Ollama auto-discovery.

## Architecture

gazebo-mcp communicates with Gazebo through `gz-transport` topics, with an optional ROS 2 bridge for `apply_control`. Each simulation runs as an isolated subprocess managed by a job scheduler. On Windows, Gazebo is launched via WSL2 with automatic path translation.

```
MCP Client  ──►  gazebo-mcp (FastMCP 3.4)
                        │
              ┌─────────┴──────────┐
              │  Job Scheduler      │
              │  (state machine)    │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────────┐
              │  Gazebo Server Process │
              │  (gz sim, WSL2/native) │
              └────────────────────────┘

Desktop:  Tauri Shell ──► FastAPI Backend (10991)
                                  │
                          React Frontend (10990)
```

[Architecture deep-dive →](docs/GAZEBO_VS_OTHERS.md)

## Documentation

| Doc | Contents |
|-----|----------|
| `docs/TOOLS.md` | Full reference for all 14 tools with inputs, outputs, examples |
| `docs/SETUP.md` | Installation, Gazebo version requirements, WSL2 config, troubleshooting |
| `docs/GAZEBO_VS_OTHERS.md` | Comparison with MuJoCo, Isaac Sim, and physics backends |
| `llms.txt` | LLM index for Claude Desktop discovery |
| `llms-full.txt` | Full LLM reference — all tools, env vars, architecture, troubleshooting |
| `PRD.md` | Product requirements document |
| `CHANGELOG.md` | Version history |
| `STATUS.md` | Current compliance and known gaps |
| `TODO.md` | Upcoming work items |

## Ports

| Port | Service |
|------|---------|
| 10991 | FastAPI backend + MCP HTTP + REST API |
| 10990 | Vite React frontend (dev) |

### Additional Files

| File | Purpose |
|------|---------|
| `.cursorrules` / `.windsurfrules` | Session context injection for Cursor/Windsurf |
| `.claude-plugin/plugin.json` | Claude Code session-start hook |
| `.github/copilot-instructions.md` | GitHub Copilot custom instructions |
| `biome.json` | JS/TS linting config |
| `Dockerfile` / `docker-compose.yml` | Containerized deployment |

## Footnotes

[^1]: **Gazebo** — Open-source 3D robotics simulator with physics, sensors, and rendering. [gazebosim.org](https://gazebosim.org)
[^2]: **MCP** — Model Context Protocol. An open standard for AI-agent-to-tool communication.
[^3]: **SDF** — Simulation Description Format. XML-based world and model format used by Gazebo.
