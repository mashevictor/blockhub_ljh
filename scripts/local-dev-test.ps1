# 本地冒烟测试 (Windows) — 需 PostgreSQL 已运行且 backend/.env 配置 DATABASE_URL
# 用法:
#   powershell -ExecutionPolicy Bypass -File scripts/local-dev-test.ps1
param(
    [int]$Port = 8001
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$Uvicorn = Join-Path $Backend ".venv\Scripts\uvicorn.exe"

if (-not (Test-Path $Python)) {
    Write-Host "Creating venv..."
    python -m venv (Join-Path $Backend ".venv")
}

Write-Host "==> pip install"
& (Join-Path $Backend ".venv\Scripts\pip.exe") install -r (Join-Path $Backend "requirements.txt") -q

Write-Host "==> alembic upgrade"
Push-Location $Backend
& (Join-Path $Backend ".venv\Scripts\alembic.exe") upgrade head
Pop-Location

Write-Host "==> start API"
Get-Process | Where-Object { $_.Path -like "*uvicorn*" } | Stop-Process -Force -ErrorAction SilentlyContinue
$job = Start-Job -ScriptBlock {
    param($Uvicorn, $Backend, $Port)
    Set-Location $Backend
    & $Uvicorn app.main:app --host 127.0.0.1 --port $Port
} -ArgumentList $Uvicorn, $Backend, $Port

Start-Sleep -Seconds 4

Write-Host "==> smoke test"
powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\smoke-test.ps1") -BaseUrl "http://127.0.0.1:$Port"
$code = $LASTEXITCODE

Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.Path -like "*uvicorn*" } | Stop-Process -Force -ErrorAction SilentlyContinue

exit $code
