# TrackChat PaaS — 本地启动脚本
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"

if (-not (Test-Path ".venv")) {
    python -m venv .venv
    .\.venv\Scripts\pip install -r requirements.txt
}

Write-Host "Starting TrackChat API on http://127.0.0.1:8001" -ForegroundColor Green
.\.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
