# 积木仓 BlockHub — 一键启动（Home 5173 + Admin 5174 + API 8001）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=== 积木仓 BlockHub 完整项目启动 ===" -ForegroundColor Cyan
Write-Host "  Home 创建入口   http://127.0.0.1:5173" -ForegroundColor White
Write-Host "  Admin 管理后台  http://127.0.0.1:5174" -ForegroundColor White
Write-Host "  后端 API        http://127.0.0.1:8001" -ForegroundColor White
Write-Host ""

# Backend
$backendDir = Join-Path $root "backend"
if (-not (Test-Path "$backendDir\.venv")) {
    Set-Location $backendDir
    python -m venv .venv
    .\.venv\Scripts\pip install -r requirements.txt -q
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; .\.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"
Start-Sleep -Seconds 2

# Home (5173)
$homeDir = Join-Path $root "home"
if (-not (Test-Path "$homeDir\node_modules")) {
    Set-Location $homeDir
    npm install
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$homeDir'; npm run dev -- --host 0.0.0.0 --port 5173"

# Admin (5174)
$frontendDir = Join-Path $root "frontend"
if (-not (Test-Path "$frontendDir\node_modules")) {
    Set-Location $frontendDir
    npm install
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; npm run dev -- --host 127.0.0.1 --port 5174"

Start-Sleep -Seconds 4
Start-Process "http://127.0.0.1:5173/"

Write-Host "已打开 Home 创建入口。管理后台: http://127.0.0.1:5174/" -ForegroundColor Green
Write-Host ""
