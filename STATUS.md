# gazebo-mcp — Status

**Version:** 0.2.0
**Updated:** 2026-07-04

## Build Gates

| Gate | Status |
|------|--------|
| `ruff check src/ web_sota/backend/` | ✅ 0 errors (26 pre-existing E501/ASYNC210) |
| `tsc --noEmit` | ✅ 0 errors |
| `uv run pytest tests/ -q` | ✅ 22/22 pass |
| `npm run build` (Vite) | ✅ built |

## Fleet Standards Compliance

| Standard | Status | Notes |
|----------|--------|-------|
| Port registration (10990/10991) | ✅ | In WEBAPP_PORTS.md |
| Tool annotations (READ_ONLY/MUTATING) | ✅ | All 14 tools |
| `glama.json` | ✅ | Root |
| `llms.txt` + `llms-full.txt` | ✅ | Root |
| `prefab-ui` dependency | ✅ | In pyproject.toml |
| `justfile` with recipes | ✅ | 12 recipes |
| `start.ps1` + `start.bat` | ✅ | Fixed newline bug |
| Health API (`/api/health`) | ✅ | Fleet format |
| Diagnostics API (`/api/v1/diagnostics`) | ✅ | Tools, system info |
| Tauri CORS origins | ✅ | tauri://localhost |
| NSIS build pipeline | ✅ | build.ps1 with all gates |
| NSIS hooks | ✅ | Kill both processes |
| CUA smoke test | ✅ | 10-phase script |
| `backend.rs` free_port() | ✅ | Multi-layer + 240s poll |
| Web zoom (Ctrl+Scroll) | ✅ | use-zoom.ts hook |
| Skills page | ✅ | REST + frontend |
| `data-testid` attributes | ✅ | Sidebar, app shell |
| Dark theme (`color-scheme: dark`) | ✅ | CSS |
| Vite `/mcp` proxy | ✅ | Dev proxy |
| `@tauri-apps/api` | ✅ | In package.json |
| Session context injection | ✅ | 5 files |
| Biome JS/TS linting | ✅ | web_sota/biome.json |
| Pre-commit config | ✅ | .pre-commit-config.yaml |
| Docker support | ✅ | Dockerfile + compose |
| CI on push/PR + nightly | ✅ | tsc + biome + vite build |
| `AGENTS.md` / `CLAUDE.md` | ✅ | Agent context |
| `.env.example` | ✅ | Root |
| `PRD.md` / `CHANGELOG.md` | ✅ | Updated to 0.2.0 |

## Known Gaps

| Issue | Severity | Notes |
|-------|----------|-------|
| Gazebo Fuel browser with tags | ✅ | GET /api/fuel?tag=, GET /api/fuel/tags, POST /api/fuel/load |
| No chat personality selector | Low | LLM page has provider/model selectors but no personas |
| No chat history persistence | Low | Chat not saved across page reloads |
| No MCP resources or prompt templates | Low | `@mcp.resource()` and `@mcp.prompt()` not registered |
| No chat personality selector or history persistence | Low | Chat resets on page reload |
