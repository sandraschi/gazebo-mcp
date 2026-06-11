# Changelog

## 0.2.0-alpha (2026-06-11)

- Initial release: 14 MCP tools (9 sim + 5 AI)
- Sim tools: sim_status, load_world, start_sim, stop_sim, get_state, spawn_model, apply_control, list_worlds, list_jobs
- AI tools: agentic_sim_workflow, natural_language_control, analyze_sim_state, analyze_sim_logs, discover_model
- World depot: SDF management with .depot/registry.json
- Job isolation: per-simulation subprocess lifecycle
- Web dashboard: Vite + React at 10990
- docs/GAZEBO_VS_OTHERS.md — comparison with MuJoCo, Isaac Sim, PyBullet
- PRD.md, CHANGELOG.md, AGENTS.md, CLAUDE.md
- Fleet-standard port registration (10990/10991)
- llms.txt for Claude Desktop discovery
- start.ps1, start.bat, justfile, pyproject.toml
- GitHub CI with ruff lint + pytest on push/PR
