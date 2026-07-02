# BlockHub 本地冒烟测试 (Windows PowerShell)
# 用法: powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
#       powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1 -BaseUrl http://101.32.209.251

param(
    [string]$BaseUrl = "http://127.0.0.1:8001",
    [switch]$SeedOnly
)

$ErrorActionPreference = "Stop"
$Api = "$BaseUrl/api/v1"
$AdminEmail = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@trackchat.local" }
$AdminPassword = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "admin123" }

$pass = 0
$fail = 0

function Ok($msg) { Write-Host "  OK $msg" -ForegroundColor Green; $script:pass++ }
function Bad($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red; $script:fail++ }

Write-Host "=========================================="
Write-Host " BlockHub Smoke Test (PowerShell)"
Write-Host " API: $Api"
Write-Host "=========================================="

Write-Host "`n=== Auth + Seed ==="
$loginBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
try {
    $login = Invoke-RestMethod -Uri "$Api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $login.access_token
    Ok "POST /auth/login"
} catch {
    Bad "POST /auth/login - $($_.Exception.Message)"
    $token = $null
}

if ($token) {
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $seed = Invoke-RestMethod -Uri "$Api/seed" -Method Post -Body '{"force":false}' -ContentType "application/json" -Headers $headers
        Ok "POST /seed (agents=$($seed.counts.agents) scenarios=$($seed.counts.total_scenarios))"
    } catch {
        Bad "POST /seed - $($_.Exception.Message)"
    }
}

if ($SeedOnly) {
    Write-Host "`nSeed-only done. pass=$pass fail=$fail"
    if ($fail -gt 0) { exit 1 }
    exit 0
}

Write-Host "`n=== Health ==="
try {
    $health = Invoke-RestMethod -Uri "$Api/health"
    Ok "GET /health ($($health.status))"
} catch { Bad "GET /health" }

Write-Host "`n=== Catalog (PostgreSQL) ==="
try {
    $summary = Invoke-RestMethod -Uri "$Api/catalog/summary"
    if ($summary.source -eq "database") { Ok "catalog source=database" } else { Bad "catalog source=$($summary.source)" }
    if ($summary.total -eq 114) { Ok "catalog total=114" } else { Bad "catalog total=$($summary.total)" }
    if ($summary.office_count -eq 65) { Ok "office_count=65" } else { Bad "office_count=$($summary.office_count)" }
} catch { Bad "GET /catalog/summary" }

Write-Host "`n=== Agents ==="
if ($token) {
    try {
        $agents = Invoke-RestMethod -Uri "$Api/agents" -Headers @{ Authorization = "Bearer $token" }
        if ($agents.total -eq 10) { Ok "GET /agents total=10" } else { Bad "GET /agents total=$($agents.total)" }
    } catch { Bad "GET /agents" }
}

Write-Host "`n=== Creation ==="
if ($token) {
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $pub = Invoke-RestMethod -Uri "$Api/creation/publish" -Method Post -Headers $headers -ContentType "application/json" -Body '{"name":"冒烟测试应用","industry_key":"office","scenario_names":["制度政策问答"]}'
        Ok "POST /creation/publish"
        $apps = Invoke-RestMethod -Uri "$Api/creation/apps" -Headers $headers
        if ($apps.items.name -contains "冒烟测试应用") { Ok "GET /creation/apps" } else { Bad "GET /creation/apps" }
    } catch { Bad "creation flow - $($_.Exception.Message)" }
}

Write-Host "`n=========================================="
Write-Host " Result: $pass passed, $fail failed"
Write-Host "=========================================="
if ($fail -gt 0) { exit 1 }
