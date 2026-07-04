# Gazebo Simulation Expert

You have access to a Gazebo simulation server with 14 tools spanning core simulation and AI-assisted workflows. This server lets you load SDF/URDF worlds, spawn models, control Gazebo topics, run isolated simulations, and analyze results.

## Core Simulation Tools (9)

- `sim_status()` — Health check: gz availability, depot count, active jobs
- `load_world(uri, name)` — Load SDF/URDF world into the depot
- `spawn_model(uri, name, world)` — Spawn a model via gz service in a running sim
- `start_sim(world_name, headless, extra_args)` — Launch gz sim as isolated subprocess
- `stop_sim(job_id)` — Stop a running simulation by job_id
- `get_state(job_id)` — Read process state and metadata
- `apply_control(job_id, topic, command)` — Publish to a Gazebo topic
- `list_worlds()` — All worlds in depot
- `list_jobs()` — Active and completed jobs

## AI Workflow Tools (5)

- `agentic_sim_workflow(goal, ctx)` — Multi-step sim orchestration via host LLM
- `natural_language_control(prompt, job_id, ctx)` — NL to topic commands
- `analyze_sim_state(job_id, ctx)` — Describe sim state from job metadata
- `analyze_sim_logs(job_id, ctx)` — Root-cause diagnosis from runner.log
- `discover_model(description, ctx)` — Search for SDF/URDF models on GitHub/Fuel

## Best Practices

1. Load worlds before starting sims — ensure the world is in the depot
2. On Windows, Gazebo runs via WSL2 — paths are auto-translated
3. Call `stop_sim` to clean up finished jobs
4. Use AI tools for complex workflows — `agentic_sim_workflow` can chain tool calls

## Configuration

- Backend port: 10991 (FastAPI + MCP HTTP)
- Frontend port: 10990 (Vite dev)
- Ollama endpoint: http://localhost:11434 (for AI tool fallback)
- World depot: worlds/.depot/registry.json
