"""Demo routes — one-click Gazebo demos + build-a-robot SDF generator.

Two halves:
1. Gazebo-native demos (SDF, runnable here): generate a rover / slalom course
   into the depot, start a headless sim, spawn, and hand back the cmd_vel topic.
2. Fleet model library (read-only index): MJCF/SDF/URDF robot models found in
   sibling repos (mujoco-mcp/models has Go2, H1, ...). Gazebo cannot ingest
   MJCF directly, so these link out to the repo that owns them instead of
   pretending to spawn them.
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "src"))

from fastapi import APIRouter
from pydantic import BaseModel

import gazebo_mcp.server as gz

router = APIRouter(tags=["Demos"], prefix="/api/demos")

FLEET_ROOT = Path(__file__).resolve().parents[4]

MODEL_SCAN = [
    ("mujoco-mcp", "models", "*.xml", "MJCF", "http://127.0.0.1:11047"),
    ("unitree-mcp", "models", "*.xml", "MJCF/SDF", "http://127.0.0.1:11053"),
    ("limx-robotics-mcp", "models", "*.xml", "MJCF/SDF", "http://127.0.0.1:11045"),
    ("yahboom-mcp", "models", "*.xml", "SDF/URDF", "http://127.0.0.1:10893"),
]

GAZEBO_DEMOS = [
    {
        "id": "rover_quickstart",
        "title": "Rover quickstart",
        "desc": "Empty world + generated 4-wheel rover, spawned and ready for cmd_vel.",
    },
    {
        "id": "slalom_course",
        "title": "Slalom course",
        "desc": "Rover plus 5 traffic cones in a row. Drive around them.",
    },
]


def _drive_lib() -> str:
    """Diff-drive plugin lib matching the installed Gazebo generation."""
    ver = gz.sim_status().get("gz_version") or ""
    major = 0
    for tok in ver.replace(",", " ").split():
        if tok and tok[0].isdigit():
            try:
                major = int(tok.split(".")[0])
            except ValueError:
                pass
            break
    if major >= 8:
        return "libgz-sim-diff-drive-system.so"  # Harmonic+
    return "libignition-gazebo-diff-drive-system.so"  # Fortress/Garden


def _rover_sdf(
    name: str, length: float, width: float, height: float, radius: float, color: str
) -> str:
    m = 2.0
    ixx = m / 12 * (width**2 + height**2)
    iyy = m / 12 * (length**2 + height**2)
    izz = m / 12 * (length**2 + width**2)
    wm = 0.4
    wix = wm / 12 * (3 * radius**2 + 0.08**2)
    wiz = wm / 2 * radius**2
    wx, wy, wz = length * 0.35, width / 2 + 0.05, radius
    z_body = 0.15 + height / 2
    wheels = ""
    joints_l, joints_r = [], []
    for i, (sx, sy, side) in enumerate(
        [(1, 1, "l"), (1, -1, "r"), (-1, 1, "l"), (-1, -1, "r")]
    ):
        tag = ["fl", "fr", "rl", "rr"][i]
        wheels += f"""
    <link name="wheel_{tag}">
      <pose>{sx * wx} {sy * wy} {wz - z_body} 1.5708 0 0</pose>
      <inertial><mass>{wm}</mass>
        <inertia><ixx>{wix:.4f}</ixx><ixy>0</ixy><ixz>0</ixz>
        <iyy>{wix:.4f}</iyy><iyz>0</iyz><izz>{wiz:.4f}</izz></inertia></inertial>
      <visual name="tire"><geometry><cylinder><radius>{radius}</radius><length>0.08</length></cylinder></geometry>
        <material><diffuse>0.1 0.1 0.1 1</diffuse></material></visual>
      <collision name="tire_c"><geometry><cylinder><radius>{radius}</radius><length>0.08</length></cylinder></geometry></collision>
    </link>
    <joint name="wheel_{tag}_joint" type="revolute">
      <parent>chassis</parent><child>wheel_{tag}</child>
      <pose>{sx * wx} {sy * wy} {wz - z_body} 0 0 0</pose>
      <axis><xyz>0 1 0</xyz>
        <limit><lower>-10000000000000000</lower><upper>10000000000000000</upper>
        <effort>10</effort><velocity>10</velocity></limit></axis>
    </joint>"""
        (joints_l if side == "l" else joints_r).append(f"wheel_{tag}_joint")
    jl = "\n".join(f"      <left_joint>{j}</left_joint>" for j in joints_l)
    jr = "\n".join(f"      <right_joint>{j}</right_joint>" for j in joints_r)
    return f"""<?xml version="1.0" ?>
<sdf version="1.9">
  <model name="{name}">
    <pose>0 0 {z_body} 0 0 0</pose>
    <link name="chassis">
      <inertial><mass>{m}</mass>
        <inertia><ixx>{ixx:.4f}</ixx><ixy>0</ixy><ixz>0</ixz>
        <iyy>{iyy:.4f}</iyy><iyz>0</iyz><izz>{izz:.4f}</izz></inertia></inertial>
      <visual name="body"><geometry><box><size>{length} {width} {height}</size></box></geometry>
        <material><diffuse>{color}</diffuse></material></visual>
      <collision name="body_c"><geometry><box><size>{length} {width} {height}</size></box></geometry></collision>
    </link>{wheels}
    <plugin filename="{_drive_lib()}" name="gz::sim::systems::DiffDrive">
{jl}
{jr}
      <wheel_separation>{width + 0.1:.3f}</wheel_separation>
      <wheel_radius>{radius}</wheel_radius>
      <topic>cmd_vel</topic>
      <max_linear_velocity>2.0</max_linear_velocity>
      <max_angular_velocity>3.0</max_angular_velocity>
    </plugin>
  </model>
</sdf>
"""


def _cone_sdf(name: str, color: str) -> str:
    return f"""<?xml version="1.0" ?>
<sdf version="1.9">
  <model name="{name}">
    <static>true</static>
    <link name="cone_link">
      <visual name="v"><geometry><cone><radius>0.15</radius><length>0.5</length></cone></geometry>
        <material><diffuse>{color}</diffuse></material></visual>
      <collision name="c"><geometry><cone><radius>0.15</radius><length>0.5</length></cone></geometry></collision>
    </link>
  </model>
</sdf>
"""


def _register_sdf(name: str, sdf: str) -> dict:
    path = gz.WORLD_DIR / f"{name}.sdf"
    path.write_text(sdf, encoding="utf-8")
    depot = gz._load_depot()
    depot[name] = {"uri": str(path), "path": str(path), "loaded_at": time.time()}
    gz._save_depot(depot)
    return {"name": name, "path": str(path)}


@router.get("")
async def demos_index():
    import asyncio

    def _scan():
        found = []
        for repo, sub, pat, fmt, dash in MODEL_SCAN:
            d = FLEET_ROOT / repo / sub
            if not d.is_dir():
                continue
            for f in sorted(d.glob(pat))[:50]:
                if f.is_file() and f.stat().st_size > 0:
                    found.append(
                        {
                            "name": f.stem,
                            "repo": repo,
                            "format": fmt,
                            "size_kb": round(f.stat().st_size / 1024, 1),
                            "dashboard_url": dash,
                        }
                    )
        return found

    fleet_models = await asyncio.to_thread(_scan)
    return {
        "success": True,
        "data": {"gazebo_demos": GAZEBO_DEMOS, "fleet_models": fleet_models},
    }


class BuildRoverBody(BaseModel):
    name: str = "fleet_rover"
    length: float = 0.6
    width: float = 0.4
    height: float = 0.2
    wheel_radius: float = 0.09
    color: str = "0.1 0.6 0.9 1"
    spawn_into_world: str | None = None


@router.post("/build-rover")
async def build_rover(body: BuildRoverBody):
    import asyncio
    import re

    name = re.sub(r"[^A-Za-z0-9_]+", "_", body.name).strip("_") or "fleet_rover"
    sdf = _rover_sdf(
        name, body.length, body.width, body.height, body.wheel_radius, body.color
    )
    info = await asyncio.to_thread(_register_sdf, name, sdf)
    result: dict = {
        "success": True,
        "message": f"Rover '{name}' built into depot.",
        "model": info,
    }
    if body.spawn_into_world:
        spawn = await asyncio.to_thread(
            gz.spawn_model, info["path"], name, body.spawn_into_world
        )
        result["spawn"] = spawn
        result["cmd_vel_topic"] = f"/model/{name}/cmd_vel"
        result["success"] = bool(spawn.get("success"))
    return result


class RunDemoBody(BaseModel):
    demo_id: str
    world_name: str = "empty_world"


@router.post("/run")
async def run_demo(body: RunDemoBody):
    import asyncio

    if body.demo_id not in {d["id"] for d in GAZEBO_DEMOS}:
        return {"success": False, "message": f"Unknown demo '{body.demo_id}'."}
    steps: list[str] = []

    worlds = await asyncio.to_thread(gz.list_worlds)
    if body.world_name not in worlds.get("worlds", {}):
        local = gz.WORLD_DIR / f"{body.world_name}.sdf"
        if not local.exists():
            return {
                "success": False,
                "message": f"World '{body.world_name}' not in depot. Load one on the Worlds page first.",
            }
        loaded = await asyncio.to_thread(gz.load_world, str(local), body.world_name)
        if not loaded.get("success"):
            return {"success": False, "message": f"load_world failed: {loaded}"}
        steps.append(f"world '{body.world_name}' registered in depot")

    started = await asyncio.to_thread(gz.start_sim, body.world_name, True, "")
    if not started.get("success"):
        return {
            "success": False,
            "message": f"start_sim failed: {started}",
            "steps": steps,
        }
    job_id = started["job_id"]
    steps.append(f"sim started (job {job_id}, headless)")

    rover = f"demo_rover_{job_id[:6]}"
    info = await asyncio.to_thread(
        _register_sdf, rover, _rover_sdf(rover, 0.6, 0.4, 0.2, 0.09, "0.1 0.6 0.9 1")
    )
    spawn = await asyncio.to_thread(gz.spawn_model, info["path"], rover, "default")
    if not spawn.get("success"):
        return {"success": False, "message": f"spawn failed: {spawn}", "steps": steps}
    steps.append(f"rover '{rover}' spawned")

    if body.demo_id == "slalom_course":
        colors = ["0.9 0.1 0.1 1", "0.95 0.95 0.95 1"] * 3
        for i in range(5):
            cname = f"cone_{i}"
            cinfo = await asyncio.to_thread(
                _register_sdf, cname, _cone_sdf(cname, colors[i])
            )
            await asyncio.to_thread(gz.spawn_model, cinfo["path"], cname, "default")
        steps.append("5 cones spawned (x=2..6, alternating)")

    return {
        "success": True,
        "message": f"Demo '{body.demo_id}' running.",
        "job_id": job_id,
        "rover": rover,
        "cmd_vel_topic": f"/model/{rover}/cmd_vel",
        "steps": steps,
    }
