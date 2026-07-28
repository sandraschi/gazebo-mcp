Param([switch]$Headless)

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

$env:FASTMCP_LOG_LEVEL = 'WARNING'

# ag-gazebo-bridge Start - MCP server (stdio mode)
Write-Host 'Starting ag-gazebo-bridge...' -ForegroundColor Cyan

Set-Location $PSScriptRoot
uv run python -m ag_gazebo_bridge.server
