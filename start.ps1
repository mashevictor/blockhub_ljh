# TrackChat PaaS — 一键启动（前后端）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=== TrackChat PaaS 启动 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 后端
$backendDir = Join-Path $root "backend"
Set-Location $backendDir
if (-not (Test-Path ".venv")) {
    Write-Host "[1/2] 创建 Python 虚拟环境..." -ForegroundColor Yellow
    python -m venv .venv
    .\.venv\Scripts\pip install -r requirements.txt -q
}
Write-Host "[1/2] 启动后端 API  http://127.0.0.1:8001" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; .\.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"

Start-Sleep -Seconds 2

# 2. 前端
$frontendDir = Join-Path $root "frontend"
Set-Location $frontendDir
if (-not (Test-Path "node_modules")) {
    Write-Host "[2/2] 安装前端依赖（首次较慢）..." -ForegroundColor Yellow
    npm install
}
Write-Host "[2/2] 启动前端页面  http://127.0.0.1:5174" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; npm run dev -- --host 127.0.0.1 --port 5174"

Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:5174/"

Write-Host ""
Write-Host "已打开浏览器。若页面空白请等 3 秒后刷新。" -ForegroundColor Cyan
Write-Host "关闭对应 PowerShell 窗口即可停止服务。" -ForegroundColor Gray
Write-Host ""
