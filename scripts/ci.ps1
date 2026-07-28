$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..
Write-Host '== ag-gazebo-bridge CI ==' -ForegroundColor Cyan
uv sync --extra dev
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
uv run ruff check src tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
uv run ruff format --check src tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if (Test-Path tests) { uv run pytest -q --tb=short; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
Write-Host 'CI passed.' -ForegroundColor Green
