"""Gazebo Fuel model browser — list, search, and download worlds."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "src"))

import httpx
from fastapi import APIRouter

from gazebo_mcp.server import WORLD_DIR, _load_depot, _save_depot

router = APIRouter(tags=["Fuel"])

_FUEL_BASE = "https://fuel.gazebosim.org"
_FUEL_API = f"{_FUEL_BASE}/1.0/models"
_FUEL_CACHE: list[dict] | None = None
_FUEL_TAGS: list[str] | None = None


@router.get("/api/fuel")
async def list_fuel(search: str = "", tag: str = ""):
    """List available models from Gazebo Fuel, optionally filtered by search text or tag."""
    global _FUEL_CACHE
    if _FUEL_CACHE is None:
        all_models = []
        page = 1
        while True:
            resp = httpx.get(f"{_FUEL_API}?page={page}&per_page=50", timeout=15)
            resp.raise_for_status()
            data = resp.json()
            if not data:
                break
            for m in data:
                tags = m.get("tags") or []
                all_models.append({
                    "name": f"{m['owner']}/{m['name']}",
                    "owner": m["owner"],
                    "model": m["name"],
                    "tags": tags,
                    "description": (m.get("description") or "")[:120],
                    "downloads": m.get("downloads", 0),
                    "license": m.get("license_name", ""),
                    "download_url": f"{_FUEL_BASE}/{m['owner']}/models/{m['name']}/1/model.sdf",
                })
            page += 1
            if len(data) < 50:
                break
        _FUEL_CACHE = all_models
    results = _FUEL_CACHE
    if search:
        q = search.lower()
        results = [m for m in results if q in m["name"].lower() or q in m.get("description", "").lower()]
    if tag:
        results = [m for m in results if tag in [t.lower() for t in m.get("tags", [])]]
    return {"models": results, "count": len(results), "total": len(_FUEL_CACHE)}


@router.get("/api/fuel/tags")
async def list_fuel_tags():
    """List all unique tags across Fuel models for category filtering."""
    global _FUEL_TAGS
    if _FUEL_TAGS is None:
        if _FUEL_CACHE is None:
            await list_fuel()
        seen = set()
        for m in _FUEL_CACHE or []:
            for t in m.get("tags") or []:
                seen.add(t.lower())
        _FUEL_TAGS = sorted(seen)
    return {"tags": _FUEL_TAGS, "count": len(_FUEL_TAGS)}


@router.post("/api/fuel/load")
async def load_from_fuel(body: dict):
    """Download a world from Gazebo Fuel by name."""
    name = body.get("name", "")
    if not name:
        return {"success": False, "error": "name is required"}
    depot = _load_depot()
    safe_name = name.replace("/", "_")
    dest = WORLD_DIR / f"{safe_name}.sdf"
    if "/" in name:
        parts = name.split("/", 1)
        url = f"{_FUEL_BASE}/{parts[0]}/models/{parts[1]}/1/model.sdf"
    else:
        url = name
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=60)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        depot[safe_name] = {"uri": url, "path": str(dest.resolve())}
        _save_depot(depot)
        return {"success": True, "name": safe_name, "path": str(dest)}
    except Exception as e:
        return {"success": False, "error": str(e)}
