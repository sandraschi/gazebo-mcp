import json
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path

import httpx
from fastmcp import Context, FastMCP

mcp = FastMCP("gazebo-mcp")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
WORLD_DIR = REPO_ROOT / "worlds"
JOBS_DIR = REPO_ROOT / "jobs"
DEPOT_FILE = WORLD_DIR / ".depot" / "registry.json"

WORLD_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)
DEPOT_FILE.parent.mkdir(parents=True, exist_ok=True)

_jobs: dict = {}


def _load_depot() -> dict:
    if DEPOT_FILE.exists():
        return json.loads(DEPOT_FILE.read_text())
    return {}


def _save_depot(depot: dict):
    DEPOT_FILE.write_text(json.dumps(depot, indent=2))


GZ_MODE: str | None = None  # cached by _find_gz(): "native" | "wsl" | None


def _to_wsl_path(p) -> str:
    """Translate a Windows path to its /mnt/<drive>/ WSL equivalent."""
    pp = Path(p).resolve()
    if not pp.drive:
        return str(pp).replace("\\", "/")
    drive = pp.drive.rstrip(":").lower()
    rest = str(pp)[len(pp.drive):].replace("\\", "/")
    return f"/mnt/{drive}{rest}"


def _find_gz() -> list[str] | None:
    """Return the gz command prefix: ['<gz>'] natively, or ['wsl', '-e', 'gz'] via WSL2.

    Native Windows Gazebo support is effectively nonexistent; on Windows hosts
    the supported path is Gazebo installed inside the default WSL2 distro.
    GUI mode (headless=False) renders through WSLg. Sets module-level GZ_MODE.
    """
    global GZ_MODE
    for candidate in ["gz", "ign"]:
        which = shutil.which(candidate)
        if which:
            GZ_MODE = "native"
            return [which]
    if shutil.which("wsl"):
        try:
            r = subprocess.run(
                ["wsl", "-e", "bash", "-lc", "command -v gz"],
                capture_output=True, text=True, timeout=20,
            )
            if r.returncode == 0 and r.stdout.strip():
                GZ_MODE = "wsl"
                return ["wsl", "-e", "gz"]
        except Exception:
            pass
    GZ_MODE = None
    return None


def _gz_path(p) -> str:
    """A filesystem path as the gz process will see it (WSL-translated when applicable)."""
    return _to_wsl_path(p) if GZ_MODE == "wsl" else str(p)


def _detect_gz_version() -> str | None:
    gz = _find_gz()
    if not gz:
        return None
    try:
        result = subprocess.run([*gz, "sim", "--version"], capture_output=True, text=True, timeout=20)
        return result.stdout.strip() or result.stderr.strip() or "unknown"
    except Exception:
        return "unknown"


# ---------------------------------------------------------------------------
# Sim tools (1-9)
# ---------------------------------------------------------------------------


@mcp.tool()
def sim_status() -> dict:
    """Health check: Gazebo CLI availability, world dirs, active jobs.

    ## Return Format
    {"gz_available": bool, "gz_version": str|None, "world_dir_exists": bool, "worlds_in_depot": int, "active_jobs": int}

    ## Examples
    sim_status()
    """
    gz = _find_gz()
    return {
        "gz_available": gz is not None,
        "gz_mode": GZ_MODE,
        "gz_path": gz,
        "gz_version": _detect_gz_version(),
        "world_dir_exists": WORLD_DIR.exists(),
        "worlds_in_depot": len(_load_depot()),
        "active_jobs": sum(
            1 for j in _jobs.values()
            if j.get("process") and j["process"].poll() is None
        ),
        "jobs_dir_exists": JOBS_DIR.exists(),
    }


@mcp.tool()
def load_world(uri: str, name: str) -> dict:
    """Load an SDF world file into the simulation depot.

    uri: local file path or URL (will download via httpx)
    name: friendly name for the depot

    ## Return Format
    {"success": bool, "name": str, "path": str}

    ## Examples
    load_world(uri="https://raw.githubusercontent.com/gazebosim/gz-sim/main/examples/worlds/empty.sdf", name="empty_world")
    load_world(uri="C:/worlds/my_world.sdf", name="my_world")
    """
    depot = _load_depot()
    dest = WORLD_DIR / f"{name}.sdf"

    if uri.startswith(("http://", "https://", "ftp://")):
        resp = httpx.get(uri, follow_redirects=True, timeout=60)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
    else:
        src = Path(uri)
        if not src.exists():
            return {"success": False, "error": f"File not found: {uri}"}
        shutil.copy2(src, dest)

    depot[name] = {"uri": uri, "path": str(dest.resolve())}
    _save_depot(depot)

    return {"success": True, "name": name, "path": str(dest)}


@mcp.tool()
def spawn_model(uri: str, name: str, world: str = "default") -> dict:
    """Spawn a model into a running simulation via gz service.

    uri: path or URL to SDF/URDF model file
    name: model name in the simulation
    world: target world name (default: "default")

    ## Return Format
    {"success": bool, "name": str, "world": str, "message": str}

    ## Examples
    spawn_model(uri="https://fuel.gazebosim.org/1.0/OpenRobotics/models/Thrall_V2/model.sdf", name="thrall")
    """
    gz = _find_gz()
    if not gz:
        return {"success": False, "error": "Gazebo (gz sim) not found on PATH"}

    model_path = uri
    if uri.startswith(("http://", "https://", "ftp://")):
        dest = WORLD_DIR / f"spawned_{name}.sdf"
        if not dest.exists():
            try:
                resp = httpx.get(uri, follow_redirects=True, timeout=30)
                resp.raise_for_status()
                dest.write_bytes(resp.content)
                model_path = str(dest)
            except Exception as e:
                return {"success": False, "error": f"Failed to download model: {e}"}

    cmd = [*gz, "service", f"/world/{world}/create", "--reqtype", "gz.msgs.EntityFactory", "--reptype", "gz.msgs.Boolean", "--timeout", "10000", "--req", f"{{sdf_filename: '{_gz_path(model_path)}', name: '{name}'}}"]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return {"success": result.returncode == 0, "name": name, "world": world, "stdout": result.stdout, "stderr": result.stderr}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Spawn timed out"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def start_sim(world_name: str, headless: bool = True, extra_args: str = "") -> dict:
    """Start a Gazebo simulation in a background process.

    world_name: name from load_world / list_worlds
    headless: if True, runs without GUI (-s flag)
    extra_args: additional CLI flags for gz sim

    Returns job_id for use with get_state, stop_sim, apply_control.

    ## Return Format
    {"success": bool, "job_id": str, "world_name": str, "headless": bool}

    ## Examples
    start_sim(world_name="empty_world", headless=True)
    start_sim(world_name="my_world", headless=False)
    """
    depot = _load_depot()
    if world_name not in depot:
        return {"success": False, "error": f"World '{world_name}' not found in depot"}

    gz = _find_gz()
    if not gz:
        return {"success": False, "error": "Gazebo (gz sim) not found on PATH"}

    job_id = uuid.uuid4().hex[:8]

    cmd = [*gz, "sim", _gz_path(depot[world_name]["path"])]
    if headless:
        cmd.append("-s")
    if extra_args:
        cmd.extend(extra_args.split())

    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    # Log to file, never PIPE: undrained pipes deadlock chatty sims.
    log_path = job_dir / "runner.log"
    log_fh = open(log_path, "w", encoding="utf-8")  # noqa: SIM115 — owned by child
    try:
        proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT)
    except FileNotFoundError:
        log_fh.close()
        return {"success": False, "error": f"Gazebo binary not found: {gz}"}

    _jobs[job_id] = {
        "process": proc,
        "world_name": world_name,
        "headless": headless,
        "started_at": time.time(),
        "log_path": str(log_path),
    }

    meta = {"world_name": world_name, "headless": headless, "cmd": " ".join(cmd), "gz_mode": GZ_MODE}
    (job_dir / "metadata.json").write_text(json.dumps(meta, indent=2))

    time.sleep(2)

    return {
        "success": True,
        "job_id": job_id,
        "world_name": world_name,
        "headless": headless,
        "pid": proc.pid,
    }


@mcp.tool()
def stop_sim(job_id: str) -> dict:
    """Stop a running Gazebo simulation by job_id.

    ## Return Format
    {"success": bool, "job_id": str, "stopped": bool}

    ## Examples
    stop_sim(job_id="abc12345")
    """
    job_dir = JOBS_DIR / job_id
    if not job_dir.exists():
        return {"success": False, "error": f"Job '{job_id}' not found"}

    (job_dir / "stop.signal").touch()

    if job_id in _jobs:
        proc = _jobs[job_id].get("process")
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
        _jobs[job_id]["process"] = None

    return {"success": True, "job_id": job_id, "stopped": True}


@mcp.tool()
def get_state(job_id: str) -> dict:
    """Get current simulation state from job metadata and process status.

    ## Return Format
    {"success": bool, "job_id": str, "running": bool, "pid": int|None, "started_at": float|None}

    ## Examples
    get_state(job_id="abc12345")
    """
    job_dir = JOBS_DIR / job_id
    if not job_dir.exists():
        return {"success": False, "error": f"No state data for job '{job_id}'"}

    meta_path = job_dir / "metadata.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    job_info = _jobs.get(job_id)
    proc = job_info.get("process") if job_info else None
    running = proc is not None and proc.poll() is None
    return_code = proc.poll() if proc and not running else None

    stderr_snippet = ""
    log_path = job_dir / "runner.log"
    if not running and log_path.exists():
        try:
            stderr_snippet = log_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            pass

    return {
        "success": True,
        "job_id": job_id,
        "running": running,
        "return_code": return_code,
        "pid": proc.pid if proc else None,
        "world_name": meta.get("world_name"),
        "headless": meta.get("headless"),
        "started_at": job_info.get("started_at") if job_info else None,
        "stderr_snippet": stderr_snippet[-500:] if stderr_snippet else "",
    }


@mcp.tool()
def apply_control(job_id: str, topic: str = "", command: str = "") -> dict:
    """Publish a command to a ROS 2 or Gazebo topic.

    job_id: target simulation job
    topic: Gazebo topic name (e.g. /model/vehicle/cmd_vel)
    command: command string or JSON payload

    ## Return Format
    {"success": bool, "job_id": str, "topic": str}

    ## Examples
    apply_control(job_id="abc12345", topic="/model/vehicle/cmd_vel", command="linear: {x: 0.5}")
    """
    gz = _find_gz()
    if not gz:
        return {"success": False, "error": "Gazebo (gz sim) not found on PATH"}

    job_dir = JOBS_DIR / job_id
    if not job_dir.exists():
        return {"success": False, "error": f"Job '{job_id}' not found"}

    if topic:
        cmd = [*gz, "topic", "-t", topic, "-m", "gz.msgs.Twist", "-p", command]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            success = result.returncode == 0
        except Exception as e:
            return {"success": False, "error": str(e)}

        ctrl_entry = {"topic": topic, "command": command, "applied_at": time.time()}
        ctrl_file = job_dir / "control.json"
        existing = json.loads(ctrl_file.read_text()) if ctrl_file.exists() else []
        existing.append(ctrl_entry)
        ctrl_file.write_text(json.dumps(existing, indent=2))

        return {"success": success, "job_id": job_id, "topic": topic, "stdout": result.stdout if success else result.stderr}

    return {"success": False, "error": "No topic specified"}


@mcp.tool()
def list_worlds() -> dict:
    """List all loaded worlds in the depot with metadata.

    ## Return Format
    {"success": bool, "worlds": dict, "count": int}

    ## Examples
    list_worlds()
    """
    depot = _load_depot()
    return {"success": True, "worlds": depot, "count": len(depot)}


@mcp.tool()
def list_jobs() -> dict:
    """List active and completed simulation jobs.

    ## Return Format
    {"success": bool, "active": list, "completed": list, "total": int}

    ## Examples
    list_jobs()
    """
    active = []
    completed = []

    for jid, info in _jobs.items():
        proc = info.get("process")
        if proc and proc.poll() is None:
            active.append({"job_id": jid, "world_name": info["world_name"], "running": True})
        else:
            completed.append({"job_id": jid, "world_name": info["world_name"], "running": False})

    for job_dir in sorted(JOBS_DIR.iterdir()):
        if not job_dir.is_dir() or job_dir.name in _jobs:
            continue
        meta_path = job_dir / "metadata.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            completed.append({
                "job_id": job_dir.name,
                "world_name": meta.get("world_name", "unknown"),
                "stop_requested": (job_dir / "stop.signal").exists(),
            })

    return {
        "success": True,
        "active": active,
        "completed": completed,
        "total": len(active) + len(completed),
    }


# ---------------------------------------------------------------------------
# AI workflow helpers
# ---------------------------------------------------------------------------


def _job_dir_for(job_id: str) -> Path:
    return JOBS_DIR / job_id


def _extract_json(text: str) -> dict | None:
    for m in re.finditer(r'\{[^{}]*\}', text):
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            continue
    return None


def _extract_json_array(text: str) -> list:
    for m in re.finditer(r'\[.*?\]', text, re.DOTALL):
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            continue
    return []


# ---------------------------------------------------------------------------
# AI workflow tools (10-14)
# ---------------------------------------------------------------------------


@mcp.tool()
async def agentic_sim_workflow(goal: str, ctx: Context) -> dict:
    """Execute an autonomous multi-step simulation workflow using the host LLM.

    The LLM plans a sequence of tool calls (start_sim, get_state, apply_control,
    etc.) to achieve the described goal. Falls back to Ollama when ctx.sample
    is unavailable.

    ## Return Format
    {"success": bool, "message": str, "plan_and_result": str, "sampling_used": bool}

    ## Examples
    agentic_sim_workflow(goal="Load the empty world and start a simulation")
    agentic_sim_workflow(goal="Start a sim, apply a control command, then check the state")
    """
    tools_desc = """
Available tools (invoke with JSON):
- sim_status() — health check
- load_world(uri, name) — download SDF world
- spawn_model(uri, name, world) — spawn model into running sim
- start_sim(world_name, headless) — launch gz sim, returns job_id
- stop_sim(job_id) — stop sim
- get_state(job_id) — read process state
- apply_control(job_id, topic, command) — publish to Gazebo topic
- list_worlds() — show depot worlds
- list_jobs() — show active/completed jobs
- natural_language_control(prompt, job_id, ctx) — NL to topic command
- analyze_sim_state(job_id, ctx) — describe sim state
- analyze_sim_logs(job_id, ctx) — diagnose sim issues
- discover_model(description, ctx) — find SDF/URDF models
"""
    prompt = f"""You are a robotics simulation engineer. Your goal: {goal}

{tools_desc}

Plan and execute the steps. Show your reasoning before each tool call.
After completion, summarize what happened and any observations."""

    try:
        result = await ctx.sample(prompt)
        text = getattr(result, "text", None) or str(result)
        return {"success": True, "message": "Workflow completed.", "plan_and_result": text.strip(), "sampling_used": True}
    except Exception as e:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": prompt, "stream": False},
                timeout=120,
            )
            return {"success": True, "message": "Workflow completed (Ollama).", "plan_and_result": resp.json().get("response", ""), "sampling_used": False, "model": "ollama"}
        except Exception as ollama_e:
            return {"success": False, "message": f"Both sampling and Ollama fallback failed: {e}; {ollama_e}"}


@mcp.tool()
async def natural_language_control(prompt: str, job_id: str, ctx: Context) -> dict:
    """Convert a natural language command to a Gazebo topic command for a running sim.

    Reads the job's metadata.json for world info, then asks the LLM to produce
    a topic and command payload that fulfill the user's intent.

    ## Return Format
    {"success": bool, "message": str, "topic": str, "command": str, "source": str}

    ## Examples
    natural_language_control(prompt="move the robot forward", job_id="abc12345")
    natural_language_control(prompt="stop all motion", job_id="abc12345")
    """
    job_dir = _job_dir_for(job_id)
    meta_path = job_dir / "metadata.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    nl_prompt = f"""You are a robot control engineer. The simulation has:
{json.dumps(meta, indent=2)}

The user says: "{prompt}"

Respond with ONLY a JSON object with "topic" (the Gazebo topic name) and
"command" (the payload to publish).
Example: {{"topic": "/model/vehicle/cmd_vel", "command": "linear: {{x: 0.5}}"}}"""

    sampling_used = False
    try:
        result = await ctx.sample(nl_prompt)
        text = getattr(result, "text", None) or str(result)
        sampling_used = True
    except Exception:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": nl_prompt, "stream": False},
                timeout=30,
            )
            text = resp.json().get("response", "")
        except Exception as e:
            return {"success": False, "message": f"LLM unavailable: {e}"}

    ctrl = _extract_json(text)
    if not ctrl or "topic" not in ctrl:
        return {"success": False, "message": "Could not parse LLM output as topic/command.", "raw_llm_output": text}

    gz = _find_gz()
    if gz:
        cmd = [*gz, "topic", "-t", ctrl["topic"], "-m", "gz.msgs.Twist", "-p", ctrl.get("command", "")]
        try:
            subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        except Exception:
            pass

    if job_dir.exists():
        ctrl_file = job_dir / "control.json"
        existing = json.loads(ctrl_file.read_text()) if ctrl_file.exists() else []
        existing.append({"topic": ctrl["topic"], "command": ctrl.get("command", ""), "source": "nl"})
        ctrl_file.write_text(json.dumps(existing, indent=2))

    return {"success": True, "message": f"Generated command for topic {ctrl['topic']}.", "topic": ctrl["topic"], "command": ctrl.get("command", ""), "source": "sampling" if sampling_used else "ollama"}


@mcp.tool()
async def analyze_sim_state(job_id: str, ctx: Context) -> dict:
    """Read the current sim state and produce a natural-language analysis.

    Analyzes process state, stderr, and metadata to describe what the
    simulation is doing.

    ## Return Format
    {"success": bool, "message": str, "analysis": str, "sampling_used": bool}

    ## Examples
    analyze_sim_state(job_id="abc12345")
    """
    job_dir = _job_dir_for(job_id)
    meta_path = job_dir / "metadata.json"
    state_path = job_dir / "control.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    controls = json.loads(state_path.read_text()) if state_path.exists() else []

    job_info = _jobs.get(job_id)
    proc = job_info.get("process") if job_info else None
    running = proc is not None and proc.poll() is None

    stderr_text = ""
    if proc:
        lp = JOBS_DIR / job_id / "runner.log"
        if lp.exists():
            try:
                stderr_text = lp.read_text(encoding="utf-8", errors="replace")
            except Exception:
                pass

    state_summary = {
        "running": running,
        "world_name": meta.get("world_name", "unknown"),
        "headless": meta.get("headless", True),
        "pid": proc.pid if proc else None,
        "recent_controls": controls[-5:] if controls else [],
        "stderr": stderr_text[-500:] if stderr_text else "",
    }

    analyze_prompt = f"""You are a robotics analyst. Given this Gazebo simulation state, describe what is happening.

State:
{json.dumps(state_summary, indent=2)}

Describe in plain English:
1. Is the simulation running stably?
2. Any errors or anomalies in the output?
3. What controls have been applied?
4. Recommendations for next steps."""

    try:
        result = await ctx.sample(analyze_prompt)
        text = getattr(result, "text", None) or str(result)
        return {"success": True, "message": "State analyzed.", "analysis": text.strip(), "sampling_used": True}
    except Exception:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": analyze_prompt, "stream": False},
                timeout=30,
            )
            return {"success": True, "message": "State analyzed (Ollama).", "analysis": resp.json().get("response", ""), "sampling_used": False}
        except Exception as e:
            return {"success": False, "message": f"LLM unavailable: {e}"}


@mcp.tool()
async def analyze_sim_logs(job_id: str, ctx: Context) -> dict:
    """Read the sim stderr log and ask the LLM for root-cause analysis.

    Checks for error output and process status. Useful after a sim crash
    or unexpected behaviour.

    ## Return Format
    {"success": bool, "message": str, "analysis": str, "sampling_used": bool}

    ## Examples
    analyze_sim_logs(job_id="abc12345")
    """
    job_dir = _job_dir_for(job_id)
    job_info = _jobs.get(job_id)

    stderr_text = ""
    log_path = job_dir / "runner.log"
    if log_path.exists():
        try:
            stderr_text = log_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            pass

    if not stderr_text:
        stop_requested = (job_dir / "stop.signal").exists()
        return {"success": True, "message": "No errors in log output.",
                "analysis": f"Job {job_id}: {'stop was requested' if stop_requested else 'still running or unknown'}. No error logs found."}

    log_prompt = f"""You are a robotics debug engineer. Given these Gazebo simulation logs, diagnose any issues.

Job id: {job_id}

{stderr_text[-3000:]}

Provide:
1. What went wrong (or is everything OK)?
2. Root cause hypotheses
3. Specific suggestions to fix or improve"""

    try:
        result = await ctx.sample(log_prompt)
        text = getattr(result, "text", None) or str(result)
        return {"success": True, "message": "Logs analyzed.", "analysis": text.strip(), "sampling_used": True}
    except Exception:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": log_prompt, "stream": False},
                timeout=30,
            )
            return {"success": True, "message": "Logs analyzed (Ollama).", "analysis": resp.json().get("response", ""), "sampling_used": False}
        except Exception as e:
            return {"success": False, "message": f"LLM unavailable: {e}"}


@mcp.tool()
async def discover_model(description: str, ctx: Context) -> dict:
    """Search for and suggest Gazebo SDF/URDF model URLs from a natural-language description.

    The LLM generates candidate GitHub raw URLs or Gazebo Fuel URLs based on
    known open-source robot repos.

    ## Return Format
    {"success": bool, "message": str, "models_suggested": list, "urls_tried": list}

    ## Examples
    discover_model(description="ros2 robot arm URDF for Gazebo")
    discover_model(description="ground vehicle SDF model")
    """
    prompt = f"""Given this description: "{description}"

Suggest up to 4 URLs that might contain a Gazebo SDF or URDF robot model matching this description.
Focus on https://fuel.gazebosim.org and GitHub raw URLs from known open-source robot repos.
Return ONLY a JSON array of URLs, nothing else.
Example: ["https://fuel.gazebosim.org/1.0/OpenRobotics/models/Thrall_V2/model.sdf"]"""

    try:
        result = await ctx.sample(prompt)
        urls = _extract_json_array(getattr(result, "text", None) or str(result))
    except Exception:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": prompt, "stream": False},
                timeout=30,
            )
            urls = _extract_json_array(resp.json().get("response", ""))
        except Exception:
            return {"success": False, "message": "LLM unavailable for model discovery."}

    if not urls:
        return {"success": False, "message": "Could not generate model URLs from description."}

    found = []
    for url in urls[:4]:
        try:
            resp = httpx.head(url, follow_redirects=True, timeout=15)
            found.append({"url": url, "reachable": resp.status_code < 400})
        except Exception:
            found.append({"url": url, "reachable": False})

    return {
        "success": True,
        "message": f"Checked {len(urls)} URLs.",
        "models_suggested": [f for f in found if f["reachable"]],
        "urls_tried": urls,
    }


def main():
    mcp.run()
