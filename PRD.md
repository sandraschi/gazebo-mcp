# gazebo-mcp — Product Requirements Document

**Version**: 0.2.0  
**Status**: Active  
**Last Updated**: 2026-07-04  

## 1. Purpose

General-purpose Gazebo simulator wrapper via MCP. Load worlds, control simulations, and monitor state from any MCP client (Claude Desktop, Cursor) — designed for ROS-integrated robotics simulation and sensor-rich environments.

## 2. Scope

### In scope (v0.2-alpha)

| Feature | Priority | Description |
|---------|----------|-------------|
| Sim lifecycle | P0 | start/stop/state for `gz sim` background subprocesses |
| World depot | P0 | load/list SDF world files with metadata |
| Topic control | P0 | publish to Gazebo topics via `gz topic` |
| Model spawning | P1 | spawn models into running simulation |
| AI agentic workflows | P1 | multi-step sim orchestration via host LLM |
| Natural language control | P1 | NL → topic payloads |
| Conversational analysis | P1 | LLM reads sim state + logs, describes behaviour |
| Smart model discovery | P2 | LLM generates SDF/URDF URLs, downloads + validates |
| Web dashboard | P2 | React + Vite at 10990 |
| CI | P1 | ruff lint + pytest on push/PR |

### Out of scope (future)

- Physics parameter tuning at runtime (Gazebo limitation)
- Multi-robot orchestration (defer to fleet-agent)
- Headless rendering capture

## 3. Architecture

```
MCP client -> FastMCP (10991) -> subprocess (gz sim)
                                   -> SDF world loaded
                                   -> physics + sensor loop
                                   -> state via process info
                                   -> topic control via gz topic
```

## 4. Tools (14 total)

### Sim Tools (9)
- `sim_status` — health check (Gazebo CLI, version, depot)
- `load_world` — load SDF world into depot
- `start_sim` — launch gz sim as background subprocess
- `stop_sim` — terminate a running simulation
- `get_state` — query simulation state and metadata
- `spawn_model` — spawn a model into running sim via gz service
- `apply_control` — publish to a Gazebo topic
- `list_worlds` — list all worlds in the depot
- `list_jobs` — list active/completed simulation jobs

### AI Tools (5)
- `agentic_sim_workflow` — multi-step orchestration via host LLM
- `natural_language_control` — NL → topic payloads
- `analyze_sim_state` — describe sim environment state
- `analyze_sim_logs` — root-cause analysis from sim stderr
- `discover_model` — suggest + download SDF/URDF from description

## 5. Ports

| Service | Port |
|---------|------|
| FastMCP backend + HTTP | 10991 |
| Vite React frontend | 10990 |

## 6. External Dependencies

| Dependency | Purpose |
|-----------|---------|
| Gazebo (Ignition) | Simulator (Apache 2.0) |
| FastMCP | MCP server framework |
| httpx | HTTP downloads for model discovery |
| Ollama (optional) | AI fallback when ctx.sample unavailable |

## 7. Risks

| Risk | Mitigation |
|------|------------|
| gz sim not on PATH | clear error message with install link |
| Large SDF files | streaming load, timeout handling |
| Topic format mismatch | validate before publish |
