"""ag-gazebo-bridge — Gazebo simulation → fleet robotics mesh.

Bridges Gazebo's gz-transport to the robotics fleet:
    robotics-mcp, yahboom-mcp, unity3d-mcp, resonite-mcp, freecad-mcp.

Gazebo tools (gz CLI wrapper):
    gz_topic_pub, gz_topic_list, gz_sim_state, gz_service_call

Fleet bridges (REST API calls to connected repos):
    sync_to_yahboom, sync_to_unity, sync_to_resonite, sync_to_freecad
    fleet_sync_all, fleet_status
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import platform
import sys
from collections.abc import AsyncIterator
from typing import Annotated, Any

import httpx
from fastmcp import FastMCP
from fastmcp.server.lifespan import lifespan
from prefab_ui.app import PrefabApp
from prefab_ui.components import (
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Markdown,
)
from pydantic import Field

log = logging.getLogger(__name__)

_READ_ONLY = {"readonly": True}
_MUTATING = {}
_HTTP_OK = 200
_HTTP_2XX_MAX = 300


@lifespan
async def gazebo_lifespan(server: FastMCP) -> AsyncIterator[dict]:
    """Shallow connectivity probe: verify Gazebo CLI is reachable."""
    ok, _ = await _gz_run("version")
    log.info("Startup probe: Gazebo CLI %s", "reachable" if ok else "NOT FOUND")
    try:
        yield {"gz_available": ok}
    finally:
        await _client.aclose()


mcp = FastMCP("gazebo-mcp", lifespan=gazebo_lifespan)

# ── Fleet port config (from WEBAPP_PORTS.md) ──────────────────────────────

FLEET_PORTS = {
    "robotics": os.getenv("FLEET_ROBOTICS_URL", "http://127.0.0.1:10706"),
    "yahboom": os.getenv("FLEET_YAHBOOM_URL", "http://127.0.0.1:10893"),
    "unity3d": os.getenv("FLEET_UNITY3D_URL", "http://127.0.0.1:10831"),
    "resonite": os.getenv("FLEET_RESONITE_URL", "http://127.0.0.1:10979"),
    "freecad": os.getenv("FLEET_FREECAD_URL", "http://127.0.0.1:10945"),
}

_client = httpx.AsyncClient(timeout=10.0)


async def _fleet_health(name: str, url: str) -> bool:
    """Check if a fleet repo is reachable via its /health endpoint."""
    try:
        r = await _client.get(f"{url.rstrip('/')}/health")
        return r.status_code == _HTTP_OK
    except Exception:
        return False


async def _fleet_post(name: str, url: str, path: str, data: dict) -> dict:
    """POST data to a fleet repo endpoint."""
    try:
        r = await _client.post(f"{url.rstrip('/')}{path}", json=data)
        return {
            "success": r.status_code < _HTTP_2XX_MAX,
            "status": r.status_code,
            "response": r.text[:500],
        }
    except httpx.TimeoutException:
        return {"success": False, "error": f"{name} timeout"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Gazebo CLI tools ─────────────────────────────────────────────────────


async def _gz_run(*args: str) -> tuple[bool, str]:
    """Run a Gazebo CLI command. On Windows, invokes via WSL."""
    gz_cmd = ["wsl", "gz"] if platform.system() == "Windows" else ["gz"]
    try:
        proc = await asyncio.create_subprocess_exec(
            *gz_cmd,
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15.0)
        if proc.returncode == 0:
            return True, stdout.decode("utf-8", errors="replace").strip()
        return False, stderr.decode("utf-8", errors="replace").strip()
    except TimeoutError:
        return False, "Gazebo command timed out"
    except FileNotFoundError:
        return False, "Gazebo not found — is gz (Gazebo Garden/Harmonic) installed and on PATH?"
    except Exception as e:
        return False, str(e)


@mcp.tool(annotations=_MUTATING)
async def gz_topic_pub(
    topic: Annotated[str, Field(description="Gazebo topic name (e.g. /model/rover/cmd_vel).")],
    msg_type: Annotated[str, Field(description="Message type (e.g. gz.msgs.Twist).")],
    message: Annotated[str, Field(description="Message payload as JSON or key-value string.")],
) -> dict[str, Any]:
    """Publish a message to a Gazebo topic."""
    ok, output = await _gz_run("topic", "-t", topic, "-m", msg_type, "-p", message)
    return {"success": ok, "topic": topic, "output": output}


@mcp.tool(annotations=_READ_ONLY)
async def gz_sim_state() -> dict[str, Any]:
    """List all models currently in the Gazebo simulation."""
    ok, output = await _gz_run("model", "--list")
    if not ok:
        return {"success": False, "error": output}
    models = [m.strip() for m in output.splitlines() if m.strip()]
    return {"success": True, "models": models, "count": len(models)}


@mcp.tool(annotations=_READ_ONLY)
async def gz_topic_list() -> dict[str, Any]:
    """List all active Gazebo topics."""
    ok, output = await _gz_run("topic", "-l")
    if not ok:
        return {"success": False, "error": output}
    topics = [t.strip() for t in output.splitlines() if t.strip()]
    return {"success": True, "topics": topics, "count": len(topics)}


@mcp.tool(annotations=_MUTATING)
async def gz_service_call(
    service: Annotated[str, Field(description="Service name.")],
    req_type: Annotated[str, Field(description="Request message type.")],
    rep_type: Annotated[str, Field(description="Response message type.")],
    request: Annotated[str, Field(description="Request payload.")],
    timeout: Annotated[int, Field(description="Timeout in ms.", ge=100)] = 1000,
) -> dict[str, Any]:
    """Call a Gazebo service."""
    ok, output = await _gz_run(
        "service",
        "-s",
        service,
        "--reqtype",
        req_type,
        "--reptype",
        rep_type,
        "--req",
        request,
        "--timeout",
        str(timeout),
    )
    return {"success": ok, "service": service, "output": output}


# ── Fleet bridges ─────────────────────────────────────────────────────────


@mcp.tool(annotations=_MUTATING)
async def sync_to_yahboom(
    robot_model: Annotated[str, Field(description="Model name in Gazebo (e.g. 'scout').")],
    command: Annotated[str, Field(description="Command to send: move, stop, patrol, scan.")],
    params: Annotated[str | None, Field(description="Optional params JSON.")] = None,
) -> dict[str, Any]:
    """Push a Gazebo robot command to the physical Yahboom robot via yahboom-mcp."""
    url = FLEET_PORTS["yahboom"]
    payload = {"model": robot_model, "command": command}
    if params:
        payload["params"] = json.loads(params)
    result = await _fleet_post("yahboom", url, "/api/v1/gazebo/sync", payload)
    return {"success": result.get("success"), "robot": robot_model, "command": command, **result}


@mcp.tool(annotations=_MUTATING)
async def sync_to_unity(
    models: Annotated[
        list[str] | None, Field(description="List of Gazebo models to sync. Defaults to all.")
    ] = None,
) -> dict[str, Any]:
    """Sync Gazebo simulation models to Unity 3D visualization via unity3d-mcp."""
    url = FLEET_PORTS["unity3d"]
    if models is None:
        _, output = await _gz_run("model", "--list")
        models = [m.strip() for m in output.splitlines() if m.strip()] if output else []
    result = await _fleet_post("unity3d", url, "/api/v1/gazebo/import", {"models": models})
    return {"success": result.get("success"), "models": models, **result}


@mcp.tool(annotations=_MUTATING)
async def sync_to_resonite(
    models: Annotated[
        list[str] | None, Field(description="List of Gazebo model names. Defaults to all.")
    ] = None,
    position: Annotated[
        str | None, Field(description="Spawn position in Resonite world (JSON: {x,y,z}).")
    ] = None,
) -> dict[str, Any]:
    """Sync Gazebo simulation models to Resonite VR world via resonite-mcp."""
    url = FLEET_PORTS["resonite"]
    if models is None:
        _, output = await _gz_run("model", "--list")
        models = [m.strip() for m in output.splitlines() if m.strip()] if output else []
    payload: dict[str, Any] = {"models": models}
    if position:
        payload["position"] = json.loads(position)
    result = await _fleet_post("resonite", url, "/api/v1/gazebo/import", payload)
    return {"success": result.get("success"), "models": models, **result}


@mcp.tool(annotations=_MUTATING)
async def sync_to_freecad(
    model: Annotated[str, Field(description="Gazebo model name to export.")],
    export_format: Annotated[
        str, Field(description="Export format: step, stl, iges, fcstd.")
    ] = "step",
) -> dict[str, Any]:
    """Export a Gazebo model to FreeCAD via freecad-mcp."""
    url = FLEET_PORTS["freecad"]
    result = await _fleet_post(
        "freecad", url, "/api/v1/gazebo/export", {"model": model, "format": export_format}
    )
    return {"success": result.get("success"), "model": model, "format": export_format, **result}


@mcp.tool(annotations=_MUTATING)
async def fleet_sync_all(
    models: Annotated[
        list[str] | None, Field(description="Models to sync. Defaults to all in simulation.")
    ] = None,
) -> dict[str, Any]:
    """One-shot sync: broadcast Gazebo sim state to all connected fleet repos."""
    results: dict[str, Any] = {}
    if models is None:
        _, output = await _gz_run("model", "--list")
        models = [m.strip() for m in output.splitlines() if m.strip()] if output else []

    results["gazebo_models"] = models
    results["repos"] = {}

    for name, url in FLEET_PORTS.items():
        alive = await _fleet_health(name, url)
        results["repos"][name] = {"alive": alive, "url": url}
        if alive and models:
            r = await _fleet_post(name, url, "/api/v1/gazebo/import", {"models": models})
            results["repos"][name]["synced"] = r.get("success", False)

    return {"success": True, **results}


@mcp.tool(annotations=_READ_ONLY)
async def fleet_status() -> dict[str, Any]:
    """Health check all connected fleet repos."""
    status = {}
    alive = 0
    for name, url in FLEET_PORTS.items():
        up = await _fleet_health(name, url)
        status[name] = {"url": url, "up": up}
        if up:
            alive += 1
    return {
        "success": True,
        "repos": status,
        "alive": alive,
        "total": len(FLEET_PORTS),
    }


@mcp.tool(app=True, annotations=_READ_ONLY)
async def fleet_status_app() -> PrefabApp:
    """Health check all connected fleet repos — rich card view."""
    status = {}
    alive = 0
    for name, url in FLEET_PORTS.items():
        up = await _fleet_health(name, url)
        status[name] = {"url": url, "up": up}
        if up:
            alive += 1

    rows = ""
    for name, info in status.items():
        badge = "🟢 up" if info["up"] else "🔴 down"
        rows += f"| {name} | `{info['url']}` | {badge} |\n"

    header = f"**Fleet Status:** {alive}/{len(FLEET_PORTS)} repos alive"
    markdown = f"{header}\n\n| Repo | URL | Status |\n|------|-----|--------|\n{rows}"

    with Card() as card:
        with CardHeader():
            CardTitle(f"Fleet Status — {alive}/{len(FLEET_PORTS)}")
        with CardContent():
            Markdown(markdown)

    return PrefabApp(view=card, title="Fleet Status")


@mcp.tool(app=True, annotations=_READ_ONLY)
async def gz_sim_state_app() -> PrefabApp:
    """List all models currently in the Gazebo simulation — rich card view."""
    ok, output = await _gz_run("model", "--list")
    if not ok:
        with Card() as card, CardContent():
            Markdown(f"**Error:** {output}")
        return PrefabApp(view=card, title="Gazebo Sim Error")

    models = [m.strip() for m in output.splitlines() if m.strip()]
    rows = (
        "\n".join(f"| {i + 1} | {m} |" for i, m in enumerate(models)) if models else "_(no models)_"
    )

    table = f"\n\n| # | Model |\n|---|-------|\n{rows}" if models else ""
    markdown = (
        f"**Models in simulation:** {len(models)}" + table
        if models
        else "No models found in simulation."
    )

    with Card() as card:
        with CardHeader():
            CardTitle(f"Gazebo Models — {len(models)} total")
        with CardContent():
            Markdown(markdown)

    return PrefabApp(view=card, title="Gazebo Sim State")


@mcp.prompt()
async def gazebo_help(topic: str = "overview") -> str:
    """Gazebo simulation and fleet bridge guidance. Tags: gazebo, simulation, fleet"""
    guides = {
        "overview": (
            "You are a Gazebo simulation bridge. You can control robots in a virtual "
            "physics world using `gz_topic_pub`, inspect state with `gz_sim_state` / "
            "`gz_topic_list`, and sync to physical hardware or visualization tools via "
            "the fleet bridges (`sync_to_yahboom`, `sync_to_unity`, etc.)."
        ),
        "fleet": (
            "Use `fleet_status` to check which fleet repos are alive, then "
            "`fleet_sync_all` to broadcast Gazebo state to all connected services."
        ),
    }
    return guides.get(topic, guides["overview"])


@mcp.resource(uri="fleet://status", name="Fleet Status", description="Live fleet health status")
async def fleet_status_resource() -> str:
    """Live fleet connectivity status as a formatted report."""
    status = {}
    alive = 0
    for name, url in FLEET_PORTS.items():
        up = await _fleet_health(name, url)
        status[name] = {"url": url, "up": up}
        if up:
            alive += 1
    lines = [f"Fleet Status: {alive}/{len(FLEET_PORTS)} alive"]
    for name, info in status.items():
        lines.append(f"  {name}: {'UP' if info['up'] else 'DOWN'} ({info['url']})")
    return "\n".join(lines)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    if "--stdio" in sys.argv:
        mcp.run(transport="stdio")
    else:
        mcp.run()


if __name__ == "__main__":
    main()
