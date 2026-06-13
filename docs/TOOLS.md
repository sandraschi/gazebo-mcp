# gazebo-mcp Tool Reference

14 tools: 9 simulation lifecycle + 5 AI workflow assistants.

**Note:** Gazebo must be installed separately (native Linux/WSL2) or run via Docker. The server auto-detects `gz` CLI on PATH or via WSL2 (`wsl -e gz`).

---

## Sim Tools (1-9)

### sim_status

**Description:** Health check — probes Gazebo CLI availability (`gz sim --version`), depot state, and active job count.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

**Output:**
```json
{
  "gz_available": true,
  "gz_mode": "native",
  "gz_version": "8.0.0",
  "world_dir_exists": true,
  "worlds_in_depot": 3,
  "active_jobs": 1,
  "jobs_dir_exists": true
}
```

**Examples:**
```python
await sim_status()
```

**State machine effect:** None — read-only. No formal state machine; jobs tracked via process poll.

---

### load_world

**Description:** Download an SDF world file from a URL or copy from a local path into the world depot.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uri | str | Yes | Local path or http(s) URL to an SDF world file |
| name | str | Yes | Friendly name for the depot |

**Output:**
```json
{"success": true, "name": "empty_world", "path": "D:/.../worlds/empty_world.sdf"}
```

**Examples:**
```python
await load_world(uri="https://raw.githubusercontent.com/gazebosim/gz-sim/main/examples/worlds/empty.sdf", name="empty_world")
await load_world(uri="C:/worlds/my_world.sdf", name="my_world")
```

---

### spawn_model

**Description:** Spawn a model (SDF/URDF) into a running simulation via the `gz service` API.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uri | str | Yes | Path or URL to SDF/URDF model file |
| name | str | Yes | Model name in the simulation |
| world | str | No | Target world name (default: "default") |

**Output:**
```json
{"success": true, "name": "thrall", "world": "default", "stdout": "", "stderr": ""}
```

**Examples:**
```python
await spawn_model(uri="https://fuel.gazebosim.org/1.0/OpenRobotics/models/Thrall_V2/model.sdf", name="thrall")
```

---

### start_sim

**Description:** Launch a Gazebo simulation as a background subprocess using `gz sim`. Runs headless with `-s` by default.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| world_name | str | Yes | Name from load_world / list_worlds |
| headless | bool | No | Run without GUI (default: True) |
| extra_args | str | No | Additional CLI flags for `gz sim` |

**Output:**
```json
{"success": true, "job_id": "a1b2c3d4", "world_name": "empty_world", "headless": true, "pid": 12345}
```

**Examples:**
```python
await start_sim(world_name="empty_world", headless=True)
await start_sim(world_name="my_world", headless=False)
```

---

### stop_sim

**Description:** Stop a running Gazebo simulation by job ID. Writes stop.signal then terminates the process.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Job ID from start_sim |

**Output:**
```json
{"success": true, "job_id": "a1b2c3d4", "stopped": true}
```

**Examples:**
```python
await stop_sim(job_id="a1b2c3d4")
```

---

### get_state

**Description:** Read current simulation state — process status, metadata, and log tail.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Job ID from start_sim |

**Output:**
```json
{"success": true, "job_id": "a1b2c3d4", "running": true, "return_code": null, "pid": 12345, "world_name": "empty_world", "headless": true, "started_at": 1234567890.0, "stderr_snippet": ""}
```

**Examples:**
```python
await get_state(job_id="a1b2c3d4")
```

---

### apply_control

**Description:** Publish a command to a Gazebo or ROS 2 topic via `gz topic`.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Target simulation job ID |
| topic | str | Yes | Gazebo topic name (e.g. `/model/vehicle/cmd_vel`) |
| command | str | Yes | Command payload string |

**Output:**
```json
{"success": true, "job_id": "a1b2c3d4", "topic": "/model/vehicle/cmd_vel", "stdout": ""}
```

**Examples:**
```python
await apply_control(job_id="a1b2c3d4", topic="/model/vehicle/cmd_vel", command="linear: {x: 0.5}")
```

---

### list_worlds

**Description:** List all worlds in the depot with metadata.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

**Output:**
```json
{"success": true, "worlds": {"empty_world": {"uri": "https://...", "path": "D:/..."}}, "count": 3}
```

**Examples:**
```python
await list_worlds()
```

---

### list_jobs

**Description:** List active and completed simulation jobs.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

**Output:**
```json
{"success": true, "active": [{"job_id": "a1b2c3d4", "world_name": "empty_world", "running": true}], "completed": [...], "total": 4}
```

**Examples:**
```python
await list_jobs()
```

---

## AI Workflow Tools (10-14)

### agentic_sim_workflow

**Description:** Uses the host LLM to plan and execute a multi-step Gazebo simulation workflow. Falls back to Ollama.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| goal | str | Yes | Natural language goal |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "Workflow completed.", "plan_and_result": "...", "sampling_used": true}
```

**Examples:**
```python
await agentic_sim_workflow(goal="Load the empty world and start a simulation")
await agentic_sim_workflow(goal="Start a sim, apply a control command, then check the state")
```

---

### natural_language_control

**Description:** Convert a natural language command to a Gazebo topic/command pair. Writes to the job's control.json.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | str | Yes | Natural language command |
| job_id | str | Yes | Active sim job ID |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "Generated command for topic /model/vehicle/cmd_vel.", "topic": "...", "command": "...", "source": "sampling"}
```

**Examples:**
```python
await natural_language_control(prompt="move the robot forward", job_id="a1b2c3d4")
await natural_language_control(prompt="stop all motion", job_id="a1b2c3d4")
```

---

### analyze_sim_state

**Description:** Read sim process state, recent controls, and log tail; produce a natural-language analysis.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Sim job ID |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "State analyzed.", "analysis": "...", "sampling_used": true}
```

**Examples:**
```python
await analyze_sim_state(job_id="a1b2c3d4")
```

---

### analyze_sim_logs

**Description:** Read the sim log file and ask the LLM for root-cause analysis.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Sim job ID |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "Logs analyzed.", "analysis": "...", "sampling_used": true}
```

**Examples:**
```python
await analyze_sim_logs(job_id="a1b2c3d4")
```

---

### discover_model

**Description:** Generate candidate Gazebo Fuel / GitHub URLs for an SDF/URDF model from a description, then check each URL for reachability.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| description | str | Yes | Model description |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "Checked 3 URLs.", "models_suggested": [{"url": "...", "reachable": true}], "urls_tried": [...]}
```

**Examples:**
```python
await discover_model(description="ros2 robot arm URDF for Gazebo")
await discover_model(description="ground vehicle SDF model")
```
