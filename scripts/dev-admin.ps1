# 本地开发 Admin（5174）
# - 有本地 PG：代理到 http://127.0.0.1:8001（需先启动 backend）
# - 无本地 PG：自动代理到演示服务器
param(
    [string]$ApiProxy = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"

function Test-Pg {
    if (-not (Test-Path $Python)) { return $false }
    Push-Location $Backend
    try {
        & $Python -c "from app.db.session import engine; from sqlalchemy import text; engine.connect().execute(text('SELECT 1')); print('ok')" 2>$null
        return $LASTEXITCODE -eq 0
    } catch { return $false }
    finally { Pop-Location }
}

$pgOk = Test-Pg
$envFile = Join-Path $Frontend ".env.local"
if ($ApiProxy) {
    $proxy = $ApiProxy
} elseif (-not $pgOk) {
    $proxy = "http://124.222.177.43"
    Write-Host "WARN: local PostgreSQL unavailable — API proxy -> $proxy"
    Write-Host "      Demo login: admin@trackchat.local / admin123"
} else {
    $proxy = "http://127.0.0.1:8001"
    Write-Host "OK: local PostgreSQL — API proxy -> $proxy"
    Write-Host "     Start backend: cd backend; .\.venv\Scripts\uvicorn app.main:app --reload --port 8001"
}
"VITE_API_PROXY=$proxy" | Set-Content -Path $envFile -Encoding utf8

Push-Location $Frontend
npm run dev -- --port 5174
