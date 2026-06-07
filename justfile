set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]

# Open the interactive recipe dashboard in the browser
default:
    @just --list

# ── Quality ───────────────────────────────────────────────────────────────────

lint:
    cd '{{justfile_directory()}}'
    uv run ruff check src/

fix:
    cd '{{justfile_directory()}}'
    uv run ruff check --fix src/
    uv run ruff format src/

# ── Testing ───────────────────────────────────────────────────────────────────

test:
    cd '{{justfile_directory()}}'
    uv run pytest

# ── Serving ───────────────────────────────────────────────────────────────────

stdio:
    cd '{{justfile_directory()}}'
    uv run python -m ag_gazebo_bridge.server

# ── Python ───────────────────────────────────────────────────────────────────

install:
    cd '{{justfile_directory()}}'
    uv sync
    Write-Host "Install complete. Run: just install-mcp claude" -ForegroundColor Green

sync:
    cd '{{justfile_directory()}}'
    uv sync

# ── Gazebo ──────────────────────────────────────────────────────────────────

# List Gazebo simulation models
models:
    gz model --list

# List active Gazebo topics
topics:
    gz topic -l

# Quick health check on all fleet repos
fleet:
    cd '{{justfile_directory()}}'; \
    uv run python -c "import asyncio; from ag_gazebo_bridge.server import fleet_status; print(asyncio.run(fleet_status()))"

# Full fleet sync (Gazebo → all repos)
sync-all:
    cd '{{justfile_directory()}}'; \
    uv run python -c "import asyncio; from ag_gazebo_bridge.server import fleet_sync_all; print(asyncio.run(fleet_sync_all()))"

# Start full stack (backend + Vite dashboard)
dev:
    cd '{{justfile_directory()}}\web_sota'
    .\start.ps1

# ── Utilities ─────────────────────────────────────────────────────────────────

mcpb-pack:
    cd '{{justfile_directory()}}'
    $ver = (Get-Content pyproject.toml | Select-String '^version = "(.*)"' | ForEach-Object { $$_.Matches.Groups[1].Value }); \
    $null = New-Item -ItemType Directory -Path dist -Force; \
    Compress-Archive -Path pyproject.toml, src -DestinationPath "dist/ag-gazebo-bridge-v$ver.mcpb" -CompressionLevel Optimal -Force; \
    Write-Host "Created dist/ag-gazebo-bridge-v$ver.mcpb" -ForegroundColor Green

install-mcp client="print":
    .\install-mcp.ps1 '{{client}}'

