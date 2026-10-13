# ag-gazebo-bridge

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
</p>


> 📖 **[Installation Guide](INSTALL.md)** — quick start, manual setup, and troubleshooting

<div align="center">

**Robot simulation → AI agents. Bridge Gazebo to your fleet.**

</div>

FastMCP 3.2 AutoGrounding bridge from [Gazebo](https://gazebosim.org) robotics simulation to the fleet robotics mesh. Distinct from [gazebo-mcp](https://github.com/sandraschi/gazebo-mcp), which owns and runs the Gazebo simulator itself (worlds, jobs, physics stepping) — this repo assumes a simulation is already running and relays its state outward to the rest of the fleet.

> Gazebo is a **3D robotics simulator** — it's like a video game engine for robots. You spawn a virtual robot in a virtual world, give it physics, sensors, and cameras, then run AI agents against it. When your code works in simulation, you push it to the physical robot.

## Why Gazebo?

Before you send commands to a $50,000 robot arm or a Yahboom rover, you test them in simulation. Gazebo provides:

- **Physics**: gravity, collisions, friction — real physics, not game physics
- **Sensors**: LIDAR, cameras, IMUs, depth sensors — virtual versions of real hardware
- **Worlds**: factory floors, warehouses, Mars rovers — any environment
- **gz-transport middleware**: topic-based pub/sub (a separate `ros_gz_bridge` is needed for actual ROS 2 interop — not built into this repo)

This MCP server wraps Gazebo's command-line tools (`gz`) and bridges simulation state to the rest of the fleet — Unity for visualization, Resonite for VR, Yahboom for physical hardware, FreeCAD for CAD export.

## The Fleet Mesh

```
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  Gazebo Sim  │    │   Unity 3D   │    │  Resonite VR │
  │  (physics)   │    │ (rendering)  │    │  (spatial)   │
  └──────┬───────┘    └──────▲───────┘    └──────▲───────┘
         │                   │                   │
         │    ┌──────────────┴───────────────────┘
         │    │
    ┌────▼────▼──────────┐  ┌──────────────┐    ┌──────────────┐
    │ ag-gazebo-bridge    │─▶│ yahboom-mcp  │    │ freecad-mcp  │
    │ (this repo)         │  │ (hardware)   │    │  (CAD)       │
    └─────────────────────┘  └──────────────┘    └──────────────┘
```

> **Status:** only `unity3d-mcp` currently implements a receiving `/api/v1/gazebo/import` endpoint. `resonite-mcp`, `yahboom-mcp`, and `freecad-mcp` do not yet have receiving endpoints, so `sync_to_resonite`/`sync_to_yahboom`/`sync_to_freecad` will fail against those repos as they stand today. See `mcp-central-docs/standards/GAZEBO_FLEET_BRIDGE_CONTRACT.md` for the shared contract these need to implement.

| Repo | Port | Role |
|------|------|------|
| **ag-gazebo-bridge** | 11179 (backend) / 11176 (dashboard) | Fleet sync bridge (this repo) |
| gazebo-mcp | 10991 (backend) / 10990 (dashboard) | Simulation owner (worlds, jobs, physics) |
| robotics-mcp | 10706 | Fleet orchestration |
| yahboom-mcp | 10893 | Physical Yahboom robot control |
| unity3d-mcp | 10831 | 3D visualization / render |
| resonite-mcp | 10979 | VR spatial sync |
| freecad-mcp | 10945 | CAD model import/export |

## Install

### 1. Install Gazebo

**Windows (recommended: Gazebo Garden via WSL2):**
```powershell
wsl --install -d Ubuntu-22.04
wsl sudo apt update && sudo apt install lsb-release wget gnupg
wsl sudo curl https://packages.osrfoundation.org/gazebo.gpg --output /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg
wsl echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/gazebo-stable.list > /dev/null
wsl sudo apt update && sudo apt install gz-garden
```

**Verify:**
```powershell
wsl gz sim --version
```

### 2. Install ag-gazebo-bridge

```powershell
git clone https://github.com/sandraschi/ag-gazebo-bridge.git
cd ag-gazebo-bridge
just install
just install-mcp claude
```

### 3. Start

```powershell
just stdio           # MCP server only
```

There's also a read-only status dashboard at `web_sota/` (Vite dev server on `:11176`) that polls each fleet repo's own health endpoint from the browser — it's not a control surface, just a fleet-health view. Run it with `just dev` or `web_sota/start.ps1`. Use `just fleet` to check connected repos from the CLI, `just sync-all` to broadcast sim state.

## Tools

### Gazebo (simulation control)

| Tool | Purpose |
|------|---------|
| `gz_topic_pub` | Publish to a Gazebo topic (move robot, spawn object, etc.) |
| `gz_topic_list` | List all active topics in the running simulation |
| `gz_sim_state` | List all models currently in the simulation |
| `gz_service_call` | Call a Gazebo service (spawn, delete, pause, etc.) |

### Fleet bridges

| Tool | Purpose |
|------|---------|
| `sync_to_yahboom` | Push Gazebo robot command → physical Yahboom hardware |
| `sync_to_unity` | Export Gazebo scene → Unity 3D visualization |
| `sync_to_resonite` | Spawn Gazebo models → Resonite VR world |
| `sync_to_freecad` | Export Gazebo model → FreeCAD (STEP/STL/IGES) |
| `fleet_sync_all` | One-shot broadcast to all connected repos |
| `fleet_status` | Health check all fleet repos |

### Just recipes

```powershell
just models         # list Gazebo models
just topics         # list Gazebo topics
just fleet          # fleet health check
just sync-all       # broadcast to all repos
```

## Quick start example

```python
# In your MCP client (Claude Desktop, OpenCode, Cursor):

# 1. Check what's in the simulation
> gz_sim_state()
# → {"models": ["scout", "warehouse", "camera_sensor"], "count": 3}

# 2. Move the Scout robot
> gz_topic_pub(topic="/model/scout/cmd_vel", msg_type="gz.msgs.Twist", message="linear: {x: 1.0}")

# 3. Sync to physical Yahboom
> sync_to_yahboom(robot_model="scout", command="move", params='{"speed": 0.5}')

# 4. Visualize in Unity
> sync_to_unity(models=["scout", "warehouse"])

# 5. Export Scout model to FreeCAD
> sync_to_freecad(model="scout", format="step")
```

## Env config

| Variable | Default | Purpose |
|----------|---------|---------|
| `FLEET_YAHBOOM_URL` | `http://127.0.0.1:10893` | yahboom-mcp backend |
| `FLEET_UNITY3D_URL` | `http://127.0.0.1:10831` | unity3d-mcp backend |
| `FLEET_RESONITE_URL` | `http://127.0.0.1:10979` | resonite-mcp backend |
| `FLEET_FREECAD_URL` | `http://127.0.0.1:10945` | freecad-mcp backend |
| `FLEET_ROBOTICS_URL` | `http://127.0.0.1:10706` | robotics-mcp web dashboard |
