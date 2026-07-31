set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]

import 'scripts/just/fleet.just'

# === Fleet-standard ===
serve:
    uv run python -m gazebo_mcp

lint:
    uv run ruff check src/ web_sota/backend/

fix:
    uv run ruff check --fix src/ web_sota/backend/

test:
    uv run pytest tests/ -q

e2e:
    cd web_sota && npx playwright test

web:
    powershell.exe -NoProfile -File ./web_sota/start.ps1

clean:
    powershell.exe -NoProfile -c "Remove-Item -Recurse -Force -Path dist,.venv,__pycache__ -ErrorAction SilentlyContinue"

# === Repo-specific ===
check-gazebo:
    powershell.exe -NoProfile -c "if (Get-Command gz -ErrorAction SilentlyContinue) { gz sim --version } else { Write-Host 'Gazebo not installed' }"

worlds:
    uv run python -c "from pathlib import Path; p = Path('worlds'); print('Worlds:', [f.name for f in p.glob('*.sdf')]) if p.exists() else print('no worlds dir')"

topics:
    powershell.exe -NoProfile -c "if (Get-Command gz -ErrorAction SilentlyContinue) { gz topic -l } else { Write-Host 'Gazebo not running' }"

# Bootstrap: install dev deps + pre-commit hook
bootstrap:
    uv sync --group dev
    uv run pre-commit install
    Write-Host "Pre-commit hooks installed." -ForegroundColor Green