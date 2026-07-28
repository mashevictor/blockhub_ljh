# BlockHub 本地冒烟测试 (Windows PowerShell)
# 用法: powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
#       powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1 -BaseUrl http://124.222.177.43

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
    if ($summary.industry_count -ge 49) { Ok "industry_count>=49 ($($summary.industry_count))" } else { Bad "industry_count=$($summary.industry_count)" }
    if ($summary.office_count -ge 65) { Ok "office_count>=65 ($($summary.office_count))" } else { Bad "office_count=$($summary.office_count)" }
    if ($summary.total -ge 114) { Ok "total>=114 ($($summary.total))" } else { Bad "total=$($summary.total)" }
    if ($summary.hero_preset_count -ge 30) { Ok "hero_preset_count>=30 ($($summary.hero_preset_count))" } else { Bad "hero_preset_count=$($summary.hero_preset_count)" }
    if ($summary.chip_template_count -ge 5) { Ok "chip_template_count>=5 ($($summary.chip_template_count))" } else { Bad "chip_template_count=$($summary.chip_template_count)" }
    if ($summary.agent_count -ge 11) { Ok "agent_count>=11 ($($summary.agent_count))" } else { Bad "agent_count=$($summary.agent_count)" }
    $hero = Invoke-RestMethod -Uri "$Api/catalog/hero-presets"
    if ($hero.total -ge 30) { Ok "GET /catalog/hero-presets total>=30 ($($hero.total))" } else { Bad "hero-presets total=$($hero.total)" }
} catch { Bad "GET /catalog/summary or hero-presets" }

Write-Host "`n=== Agents ==="
if ($token) {
    try {
        $agents = Invoke-RestMethod -Uri "$Api/agents" -Headers @{ Authorization = "Bearer $token" }
        if ($agents.total -eq 11) { Ok "GET /agents total=11" } else { Bad "GET /agents total=$($agents.total)" }
    } catch { Bad "GET /agents" }
}

Write-Host "`n=== Protected routes (D3) ==="
try {
    $code = (Invoke-WebRequest -Uri "$Api/stats/dashboard" -UseBasicParsing).StatusCode
    if ($code -eq 403) { Ok "stats/dashboard 403 without token" } else { Bad "stats/dashboard expected 403 got $code" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) { Ok "stats/dashboard 403 without token" }
    else { Bad "stats/dashboard - $($_.Exception.Message)" }
}

if ($token) {
    try {
        $code = (Invoke-WebRequest -Uri "$Api/stats/dashboard" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing).StatusCode
        if ($code -eq 200) { Ok "stats/dashboard 200 with token" } else { Bad "stats/dashboard expected 200 got $code" }
    } catch { Bad "stats/dashboard with token" }
    try {
        $empLogin = Invoke-RestMethod -Uri "$Api/auth/login" -Method Post -Body (@{ email = "employee@trackchat.local"; password = "emp123" } | ConvertTo-Json) -ContentType "application/json"
        Invoke-WebRequest -Uri "$Api/seed" -Method Post -Headers @{ Authorization = "Bearer $($empLogin.access_token)" } -Body '{"force":false}' -ContentType "application/json" -UseBasicParsing | Out-Null
        Bad "POST /seed should 403 for employee"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 403) { Ok "POST /seed 403 for employee" }
        else { Bad "POST /seed employee RBAC - $($_.Exception.Message)" }
    }
}

Write-Host "`n=== Chat SSE (D4) ==="
if ($token) {
    try {
        $cfg = Invoke-RestMethod -Uri "$Api/chat/config" -Headers @{ Authorization = "Bearer $token" }
        if ($cfg.stream_supported) { Ok "GET /chat/config stream_supported" } else { Bad "chat stream_supported=false" }
        $stream = Invoke-WebRequest -Uri "$Api/chat/completions/stream" -Method Post -Headers @{ Authorization = "Bearer $token" } -Body '{"message":"你好","session_id":"smoke"}' -ContentType "application/json" -UseBasicParsing
        if ($stream.Content -match 'data:') { Ok "POST /chat/completions/stream SSE" } else { Bad "chat stream empty" }
    } catch { Bad "chat SSE - $($_.Exception.Message)" }
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
