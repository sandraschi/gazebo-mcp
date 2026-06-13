# gazebo-mcp

**Gazebo[^1] simulation via MCP[^2]. Load SDF[^3] worlds, spawn models, control via ROS 2 topics.**

[![CI](https://github.com/sandraschi/gazebo-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sandraschi/gazebo-mcp/actions/workflows/ci.yml)
[![Ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![FastMCP](https://img.shields.io/badge/FastMCP-3.2+-blue)](https://github.com/jlowin/fastmcp)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

gazebo-mcp bridges Gazebo Garden/Harmonic with the MCP ecosystem. Load any SDF/URDF world, spawn models at runtime, start and stop physics, read simulation state, and publish control commands via ROS 2 topics — all through MCP tools. The server manages a world depot, a job queue, and integrates with `ros-mcp` for topic-based control.

Built for the fleet simulation pipeline: gazebo-mcp provides the high-fidelity physics backend that other fleet MCPs (unitree-mcp, limx-robotics-mcp) can consume for multi-robot scenarios, sensor simulation, and environment interaction.

## Table of Contents

- [Quick Start](#quick-start)
- [Tools](#tools)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Ports](#ports)
- [Footnotes](#footnotes)

## Quick Start

```powershell
# 1. Clone and enter
git clone https://github.com/sandraschi/gazebo-mcp
cd gazebo-mcp

# 2. Run the MCP server
uv run python -m gazebo_mcp

# 3. Or launch the full web dashboard
.\start.ps1
```

## Tools

| # | Tool | Description |
|---|------|-------------|
| 1 | `sim_status` | Health check — Gazebo availability, active worlds, job queue depth |
| 2 | `load_world` | Load an SDF world file into the world depot |
| 3 | `spawn_model` | Spawn a model into a running Gazebo simulation |
| 4 | `start_sim` | Start physics stepping in a loaded world |
| 5 | `stop_sim` | Stop physics stepping |
| 6 | `get_state` | Read model poses, joint states, sensor data via Gazebo topics |
| 7 | `apply_control` | Publish control commands (velocity, torque, position) via ROS 2 |
| 8 | `list_worlds` | List all worlds in the depot |
| 9 | `list_jobs` | List active and completed simulation jobs |
| 10 | `agentic_sim_workflow` | Multi-step Gazebo workflow via LLM sampling |
| 11 | `natural_language_control` | Control the sim via natural language ("move the robot forward 1m") |
| 12 | `analyze_sim_state` | State analysis — contact forces, joint limits, odometry drift |
| 13 | `analyze_sim_logs` | Parse Gazebo server logs for warnings and errors |
| 14 | `discover_world` | Search and download worlds from the Gazebo Fuel repository |

[Full tool reference →](docs/TOOLS.md)

## Architecture

gazebo-mcp communicates with Gazebo through `ignition.transport` / `gz-transport` topics, with an optional ROS 2 bridge for `apply_control`. Each world gets an isolated Gazebo server process managed by a job scheduler. The state machine tracks world lifecycle (loaded → running → paused → unloaded).

```
MCP Client  ──►  gazebo-mcp (FastMCP 3.2)
                        │
              ┌─────────┴──────────┐
              │  Job Scheduler      │
              │  (state machine)    │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────────┐
              │  Gazebo Server Process │
              │  (gz sim, ROS 2)       │
              └────────────────────────┘
```

[Architecture deep-dive →](docs/GAZEBO_VS_OTHERS.md)

## Documentation

| Doc | Contents |
|-----|----------|
| `docs/TOOLS.md` | Full reference for all 14 tools with inputs, outputs, examples |
| `docs/SETUP.md` | Installation, Gazebo version requirements, ROS 2 integration, troubleshooting |
| `docs/GAZEBO_VS_OTHERS.md` | Comparison with MuJoCo, Isaac Sim, and physics backends |

## Ports

| Port | Service |
|------|---------|
| 10990 | FastAPI backend + MCP HTTP |
| 10991 | Vite React frontend |

## Footnotes

[^1]: **Gazebo** — Open-source 3D robotics simulator with physics, sensors, and rendering. [gazebosim.org](https://gazebosim.org)
[^2]: **MCP** — Model Context Protocol. An open standard for AI-agent-to-tool communication.
[^3]: **SDF** — Simulation Description Format. XML-based world and model format used by Gazebo.
