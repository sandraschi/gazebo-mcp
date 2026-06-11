# gazebo-mcp — Agent Instructions

## Overview
gazebo-mcp is an MCP server that wraps Gazebo (Ignition) simulation. It manages
world loading, sim lifecycle, and topic-based control via 14 MCP tools.

## Key Patterns
- **World depot**: SDF files in `worlds/`, tracked via `.depot/registry.json`
- **Job isolation**: Each `gz sim` subprocess has its own job dir in `jobs/<id>/`
- **Topic control**: `apply_control` publishes to Gazebo topics via `gz topic`
- **AI fallback**: All AI tools try `ctx.sample()` first, then Ollama

## File Organization
- `src/gazebo_mcp/server.py` — all 14 tools
- `web_sota/backend/server.py` — FastAPI with REST wrappers + static file serving
- `web_sota/src/pages/` — 7 React page components
- `tests/` — pytest test suite
