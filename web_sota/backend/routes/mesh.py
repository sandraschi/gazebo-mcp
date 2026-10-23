"""Mesh routes — health + start for robot-sim backends meshed with gazebo-mcp.

Proxy through this backend (CROSSCONNECT_PATTERN rule 1: never call a
sibling MCP server directly from the browser). Dialogic shape
{success, message, data} for JSON; unreachable peer is success=False
with an actionable message naming the peer, its base_url and transport.

Peers are the fleet robot-sim ring that docks with Gazebo as the
high-fidelity physics backend:
  mujoco-mcp / isaac-mcp — alternative physics flagships
  ros-mcp — ROS 2 topic/service bridge used by apply_control
  robotics-mcp / yahboom-mcp — generic + low-cost consumers
  unitree-mcp / limx-robotics-mcp — quadruped/humanoid consumers
    (fleet-start currently Kind=none / port 0 — probe the WEBAPP_PORTS
    slot anyway, start may no-op until their launcher is wired)
"""

import subprocess
import sys
import time
from pathlib import Path

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Mesh"], prefix="/api/mesh")

REPO_ROOT = Path(__file__).resolve().parents[3]
FLEET_ROOT = REPO_ROOT.parent

MESH_PEERS = [
    {
        "id": "mujoco-mcp",
        "label": "MuJoCo",
        "role": "Alternative physics (lightweight, fast)",
        "backend_port": 11046,
        "frontend_port": 11047,
        "health_path": "/health",
        "repo": "mujoco-mcp",
    },
    {
        "id": "isaac-mcp",
        "label": "Isaac Sim",
        "role": "GPU-accelerated (NVIDIA Isaac)",
        "backend_port": 11049,
        "frontend_port": 11048,
        "health_path": "/health",
        "repo": "isaac-mcp",
    },
    {
        "id": "ros-mcp",
        "label": "ROS 2 bridge",
        "role": "Topics/services/bags for apply_control",
        "backend_port": 11050,
        "frontend_port": 11051,
        "health_path": "/health",
        "repo": "ros-mcp",
    },
    {
        "id": "robotics-mcp",
        "label": "Robotics",
        "role": "Generic fleet robotics",
        "backend_port": 11199,
        "frontend_port": 10706,
        "health_path": "/api/v1/health",
        "repo": "robotics-mcp",
    },
    {
        "id": "yahboom-mcp",
        "label": "Yahboom",
        "role": "Low-cost rover (ROSMASTER)",
        "backend_port": 10892,
        "frontend_port": 10893,
        "health_path": "/api/v1/health",
        "repo": "yahboom-mcp",
    },
    {
        "id": "unitree-mcp",
        "label": "Unitree",
        "role": "Go2 / H1 quadruped + humanoid",
        "backend_port": 11052,
        "frontend_port": 11053,
        "health_path": "/health",
        "repo": "unitree-mcp",
    },
    {
        "id": "limx-robotics-mcp",
        "label": "LimX",
        "role": "Biped/humanoid + VLA bridge",
        "backend_port": 11044,
        "frontend_port": 11045,
        "health_path": "/health",
        "repo": "limx-robotics-mcp",
    },
]

_PEER_BY_ID = {p["id"]: p for p in MESH_PEERS}


def _probe_peer(peer: dict) -> dict:
    base = f"http://127.0.0.1:{peer['backend_port']}"
    paths = [peer.get("health_path", "/health"), "/health", "/api/health"]
    seen: list[str] = []
    for path in dict.fromkeys(paths):
        url = base + path
        t0 = time.monotonic()
        try:
            r = httpx.get(url, timeout=2.0)
            latency = int((time.monotonic() - t0) * 1000)
            if r.status_code < 500:
                body: dict = {}
                try:
                    body = (
                        r.json() if "json" in r.headers.get("content-type", "") else {}
                    )
                except Exception:
                    body = {}
                return {
                    **peer,
                    "base_url": base,
                    "up": r.status_code < 400,
                    "status_code": r.status_code,
                    "latency_ms": latency,
                    "version": body.get("version"),
                    "start_command": f"powershell -ExecutionPolicy Bypass -File {FLEET_ROOT / peer['repo'] / 'start.ps1'} -BackendOnly",
                }
            seen.append(f"{path}={r.status_code}")
        except Exception as e:
            seen.append(f"{path}:{type(e).__name__}")
    return {
        **peer,
        "base_url": base,
        "up": False,
        "status_code": None,
        "latency_ms": None,
        "version": None,
        "detail": "; ".join(seen),
        "start_command": f"powershell -ExecutionPolicy Bypass -File {FLEET_ROOT / peer['repo'] / 'start.ps1'} -BackendOnly",
    }


@router.get("/status")
async def mesh_status():
    import asyncio

    results = await asyncio.to_thread(lambda: [_probe_peer(p) for p in MESH_PEERS])
    up = sum(1 for r in results if r.get("up"))
    return {
        "success": True,
        "message": f"{up}/{len(results)} meshed backends up.",
        "data": {"peers": results, "up": up, "total": len(results)},
    }


class StartBody(BaseModel):
    peer: str


def _spawn_peer_start(peer: dict) -> dict:
    peer_dir = FLEET_ROOT / peer["repo"]
    candidates = [peer_dir / "start.ps1", peer_dir / "web_sota" / "start.ps1"]
    script = next((c for c in candidates if c.exists()), None)
    if script is None:
        return {
            "success": False,
            "message": f"No start.ps1 found for {peer['id']} in {peer_dir}.",
        }
    if sys.platform != "win32":
        return {
            "success": False,
            "message": f"Peer start is Windows-only (powershell). Run manually: {script} -BackendOnly",
        }
    cmd = [
        "powershell.exe",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(script),
        "-BackendOnly",
    ]
    try:
        creationflags = getattr(subprocess, "DETACHED_PROCESS", 0) | getattr(
            subprocess, "CREATE_NEW_PROCESS_GROUP", 0
        )
        proc = subprocess.Popen(
            cmd,
            cwd=str(peer_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=creationflags,
            close_fds=False,
        )
        return {
            "success": True,
            "message": f"Start requested for {peer['id']} (pid {proc.pid}). Probe /api/mesh/status in ~10s.",
            "pid": proc.pid,
            "command": " ".join(cmd),
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to spawn {peer['id']}: {type(e).__name__}: {e}",
        }


@router.post("/start")
async def mesh_start(body: StartBody):
    peer = _PEER_BY_ID.get(body.peer)
    if peer is None:
        return {
            "success": False,
            "message": f"Unknown peer '{body.peer}'. Known: {sorted(_PEER_BY_ID)}",
        }
    import asyncio

    already = await asyncio.to_thread(_probe_peer, peer)
    if already.get("up"):
        return {
            "success": True,
            "message": f"{peer['id']} already up on :{peer['backend_port']}.",
            "data": already,
        }
    result = await asyncio.to_thread(_spawn_peer_start, peer)
    result["data"] = {"peer": peer}
    return result


@router.post("/start-all")
async def mesh_start_all():
    import asyncio

    statuses: list[dict] = await asyncio.to_thread(
        lambda: [_probe_peer(p) for p in MESH_PEERS]
    )
    down = [s for s in statuses if not s.get("up")]
    started: list[dict] = []
    for s in down:
        peer = _PEER_BY_ID[s["id"]]
        res = await asyncio.to_thread(_spawn_peer_start, peer)
        started.append({"peer": s["id"], **res})
    skipped = [s["id"] for s in statuses if s.get("up")]
    return {
        "success": True,
        "message": f"Start requested for {len(started)} peer(s); {len(skipped)} already up.",
        "data": {"started": started, "already_up": skipped},
    }
