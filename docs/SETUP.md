# gazebo-mcp Setup

## Prerequisites

- Python 3.11+
- `uv` package manager
- Gazebo (Garden / Harmonic / Ionic) installed and `gz` CLI on PATH

## Installation

```powershell
git clone https://github.com/sandraschi/gazebo-mcp.git
cd gazebo-mcp
uv sync
```

## Simulator Setup

Gazebo is **not** a pip package — it must be installed separately.

### Option 1: Native Install (Linux / WSL2)

See [gazebosim.org/download](https://gazebosim.org/download) for platform-specific instructions.

```bash
# Ubuntu / Debian
sudo apt-get install gz-garden

# Verify
gz sim --version
```

The server auto-detects `gz` on PATH (native mode) or via WSL2 (`wsl -e gz`). On Windows hosts, Gazebo must run inside WSL2 — the server handles path translation automatically.

### Option 2: Docker

```powershell
docker run -it --rm -p 11345:11345 osrf/gazebo:gz11
```

Then configure the MCP to connect to the Docker container's Gazebo instance.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GAZEBO_MCP_WORLDS_DIR` | `./worlds/` | World SDF depot directory |
| `GAZEBO_MCP_JOBS_DIR` | `./jobs/` | Job state directories |
| `GAZEBO_MCP_GZ_MODE` | auto | Force "native" or "wsl" Gazebo mode |

### Ports

| Service | Port |
|---------|------|
| Backend (REST + MCP HTTP) | 10991 |
| Frontend (Vite dev) | 10990 |

## Running

### MCP stdio

```powershell
uv run python -m gazebo_mcp
```

### Web Dashboard

```powershell
.\web_sota\start.ps1
```

## Testing

```powershell
uv run pytest tests/ -q
ruff check src/ web_sota/backend/
```

## Troubleshooting

### "gz not found on PATH"

**Cause:** Gazebo is not installed or not in PATH.  
**Fix:** Install Gazebo (see Simulator Setup above) or use Docker. Verify with `gz sim --version`.

### "Gazebo exited immediately" on start_sim

**Cause:** Missing world file, invalid SDF, or GPU driver issue.  
**Fix:** Check `jobs/<job_id>/runner.log`. Validate the SDF: `gz sim -s <path/to/world.sdf>`

### WSL2 mode fails with path errors

**Cause:** WSL2 auto-detection failed or path translation is incorrect.  
**Fix:** Force native mode via `GAZEBO_MCP_GZ_MODE=native` if running natively on Linux. On Windows, ensure WSL2 is set as default: `wsl --set-default-version 2`

### "Spawn timed out" on spawn_model

**Cause:** The target simulation isn't running or the create service isn't responding.  
**Fix:** Verify the sim is alive with `get_state`. Check the world name matches the running simulation.

### Port 10990/10991 already in use

**Cause:** Another process is bound.  
**Fix:**
```powershell
Get-NetTCPConnection -LocalPort 10990 | ForEach { Stop-Process $_.OwningProcess -Force }
```

### Topic publish silently fails

**Cause:** Wrong topic name, message type, or payload format.  
**Fix:** Verify the topic exists with `gz topic -l` (run manually). Match the message type exactly.

### Docker connection refused

**Cause:** The Docker container isn't publishing its Gazebo port or the container isn't running.  
**Fix:** `docker ps` to check. Add `--network host` or publish the correct Gazebo ports.

### No models visible in the simulation

**Cause:** The world SDF is empty or models haven't been spawned.  
**Fix:** Use `spawn_model` to add models, or load a populated world. Check `gz topic -l` for model topics.
