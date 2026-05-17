# ag-gazebo-bridge

FastMCP 3.2 bridge from Gazebo simulation to the fleet robotics mesh.

**Gazebo tools:**
- `gz_topic_pub` — publish to topics
- `gz_topic_list` — list active topics
- `gz_sim_state` — list models in simulation
- `gz_service_call` — call Gazebo services

**Fleet bridges:**
- `sync_to_yahboom` — Gazebo robot → physical Yahboom robot
- `sync_to_unity` — Gazebo scene → Unity 3D visualization
- `sync_to_resonite` — Gazebo models → Resonite VR world
- `sync_to_freecad` — Gazebo model → FreeCAD CAD export
- `fleet_sync_all` — one-shot broadcast to all repos
- `fleet_status` — health check all connected repos

## Connected repos

| Repo | Port | Bridge |
|------|------|--------|
| robotics-mcp | 10706 | Orchestration |
| yahboom-mcp | 10893 | Physical robot control |
| unity3d-mcp | 10831 | 3D visualization |
| resonite-mcp | 10979 | VR spatial sync |
| freecad-mcp | 10945 | CAD model export |
