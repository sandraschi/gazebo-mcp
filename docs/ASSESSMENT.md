# gazebo-mcp — Assessment

**Date:** 2026-06-11 | **Version:** 0.2.0 | **Status:** Functional via WSL2, e2e-verified

## Verdict

Was plausible code around an absent binary (no native Windows Gazebo); now runs
through WSL2 and is verified end-to-end: `_find_gz` → `['wsl','-e','gz']`,
empty SDF world loaded via translated `/mnt/d/...` path, `gz sim -s` ran stable
6 s under Gazebo 10.1.0 in Ubuntu/WSL2, clean stop.

## Added/fixed this session

| Item | Detail |
|---|---|
| WSL2 invocation mode | `_find_gz()` returns a command prefix list; probes WSL when native gz absent; `GZ_MODE` cached and reported by `sim_status` |
| Path translation | `_to_wsl_path` / `_gz_path` applied at start_sim (world) and spawn_model (sdf_filename) |
| Popen→logfile | `jobs/{id}/runner.log`; get_state / analyze_sim_state / analyze_sim_logs read the file instead of undrained `proc.stderr` |
| `completed` semantics | Was `stop.signal exists` (marks crashes wrong); renamed to `stop_requested` |
| Console-script ImportError | Empty `__init__.py` vs `gazebo_mcp:main`; re-export added |
| Version | 0.2.0; README documents WSL2 mode |

22 tests pass; ruff clean.

## Known limitations

- `stop_sim` terminates the `wsl.exe` wrapper — gz inside the distro usually
  dies with it, but orphans are possible after hard kills (`wsl --terminate
  Ubuntu` cleans up).
- `apply_control` / `spawn_model` (gz topic / gz service) not yet e2e-tested
  against a live sim — code path is identical prefix mechanics, but Gazebo
  transport inside WSL deserves one real session of testing.
- Worlds depot contains only the seeded `empty_world.sdf`; no model library yet
  (Fuel download exists in spawn_model but untested).
- `get_state` reports process state, not physics state — unlike mujoco-mcp
  there is no joint-level state sync. A gz-transport bridge is the gap to parity.

## Next

One live session testing spawn_model + apply_control; decide whether
joint-state parity (gz topic echo bridge) is worth it; commit; mcpb pack.
