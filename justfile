import 'scripts/just/fleet.just'

# === Fleet-standard ===
    pwsh -NoProfile -c "if (Get-Command gz -ErrorAction SilentlyContinue) { gz topic -l } else { Write-Host 'Gazebo not running' }"
bootstrap:
    uv sync

serve:
    uv run python -m gazebo_mcp

lint:
    ruff check src/ web_sota/backend/

fix:
    ruff check --fix src/ web_sota/backend/

test:
    uv run pytest tests/ -q

e2e:
    cd web_sota && npx playwright test

web:
    pwsh -NoProfile -File ./web_sota/start.ps1

mcpb-pack:
    pwsh -NoProfile -File ./mcpb/pack.ps1

clean:
    pwsh -NoProfile -c "Remove-Item -Recurse -Force -Path dist,.venv,__pycache__ -ErrorAction SilentlyContinue"

# === Repo-specific ===
check-gazebo:
    pwsh -NoProfile -c "if (Get-Command gz -ErrorAction SilentlyContinue) { gz sim --version } else { Write-Host 'Gazebo not installed' }"

worlds:
    uv run python -c "from pathlib import Path; p = Path('worlds'); print('Worlds:', [f.name for f in p.glob('*.sdf')]) if p.exists() else print('no worlds dir')"

topics:
    pwsh -NoProfile -c "if (Get-Command gz -ErrorAction SilentlyContinue) { gz topic -l } else { Write-Host 'Gazebo not running' }"
