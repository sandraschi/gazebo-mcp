Param([switch]$Headless)

if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }

$WebPort = 10990
$BackendPort = 10991
$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Clear-Port {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 4 } | Select-Object -First 1
    if (-not $conn) { return $false }
    $targetPid = $conn.OwningProcess
    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { "PID $targetPid" }
    Write-Host "Port $Port held by $name (PID: $targetPid). Freeing..." -ForegroundColor Yellow
    try { Stop-Process -Id $targetPid -Force -ErrorAction Stop; Start-Sleep 1; return $true } catch {}
    try { taskkill /F /PID $targetPid 2>&1 | Out-Null; Start-Sleep 1; return $true } catch {}
    try { Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid" -ErrorAction Stop | Invoke-CimMethod -MethodName Terminate -ErrorAction Stop | Out-Null; Start-Sleep 1; return $true } catch {}
    Write-Host "  Could not free port $Port. Run as Admin: taskkill /F /PID $targetPid" -ForegroundColor Red
    return $false
}

Write-Host "`n=== Gazebo MCP ===" -ForegroundColor Cyan
Clear-Port $WebPort | Out-Null
Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules")) { npm install }

Write-Host "Frontend: starting Vite on :$WebPort ..." -ForegroundColor Green
$poll = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri 'http://127.0.0.1:$WebPort/' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process 'http://127.0.0.1:$WebPort/'; exit } catch { Start-Sleep 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $poll
npm run dev -- --port $WebPort --host
