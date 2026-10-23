"""Settings routes — live environment + session-only path overrides.

GET /api/settings returns the real values the sim tools use
(world_dir, jobs_dir, gz availability/mode/version, depot counts),
so the Settings page stops guessing. POST updates the session-only
override by mutating gazebo_mcp.server globals + mkdir.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "src"))

from fastapi import APIRouter
from pydantic import BaseModel

import gazebo_mcp.server as gz

router = APIRouter(tags=["Settings"])


def _snapshot() -> dict:
    status = gz.sim_status()
    return {
        "world_dir": str(gz.WORLD_DIR),
        "jobs_dir": str(gz.JOBS_DIR),
        "world_dir_exists": Path(gz.WORLD_DIR).exists(),
        "jobs_dir_exists": Path(gz.JOBS_DIR).exists(),
        "gz_available": status.get("gz_available"),
        "gz_mode": status.get("gz_mode"),
        "gz_version": status.get("gz_version"),
        "worlds_in_depot": status.get("worlds_in_depot"),
        "active_jobs": status.get("active_jobs"),
        "platform_windows": sys.platform == "win32",
        "backend_port": 10991,
        "frontend_port": 10990,
    }


@router.get("/api/settings")
async def get_settings():
    return {"success": True, "settings": _snapshot()}


class SettingsBody(BaseModel):
    world_dir: str | None = None
    jobs_dir: str | None = None


@router.post("/api/settings")
async def post_settings(body: SettingsBody):
    changed: list[str] = []
    if body.world_dir:
        p = Path(body.world_dir).expanduser()
        try:
            p.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            return {"success": False, "message": f"Cannot create world_dir {p}: {e}"}
        gz.WORLD_DIR = p
        changed.append(f"world_dir -> {p}")
    if body.jobs_dir:
        p = Path(body.jobs_dir).expanduser()
        try:
            p.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            return {"success": False, "message": f"Cannot create jobs_dir {p}: {e}"}
        gz.JOBS_DIR = p
        changed.append(f"jobs_dir -> {p}")
    if not changed:
        return {
            "success": False,
            "message": "Nothing to update (send world_dir and/or jobs_dir).",
        }
    return {
        "success": True,
        "message": "Settings saved for this backend session (lost on restart). "
        + "; ".join(changed),
        "settings": _snapshot(),
    }
