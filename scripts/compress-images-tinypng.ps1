# 批量压缩 home/public/industry 与 news 配图（TinyPNG / Tinify API）
# 用法：
#   $env:TINIFY_API_KEY='你的key'
#   pwsh scripts/compress-images-tinypng.ps1
param(
  [string]$Root = (Join-Path (Split-Path $PSScriptRoot -Parent) 'home/public'),
  [int]$DelayMs = 250
)

$key = $env:TINIFY_API_KEY
if (-not $key) {
  Write-Error '请设置环境变量 TINIFY_API_KEY'
  exit 1
}

$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${key}:"))
$headers = @{ Authorization = "Basic $b64" }
$files = @(Get-ChildItem -Path (Join-Path $Root 'industry'), (Join-Path $Root 'news') -Recurse -Include *.jpg, *.jpeg, *.png -File -ErrorAction SilentlyContinue)
if (-not $files.Count) {
  Write-Error "未找到图片: $Root/industry, $Root/news"
  exit 1
}

$ok = 0
$skip = 0
$fail = 0
$saved = 0
$i = 0
$logPath = Join-Path $PSScriptRoot 'tinypng-compress.log'
$log = @("TinyPNG batch $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') files=$($files.Count)")

foreach ($f in $files) {
  $i++
  $before = $f.Length
  $ctype = if ($f.Extension -match '\.png$') { 'image/png' } else { 'image/jpeg' }
  try {
    $resp = Invoke-WebRequest -Uri 'https://api.tinify.com/shrink' -Method Post -Headers $headers -InFile $f.FullName -ContentType $ctype -UseBasicParsing
    $loc = $resp.Headers['Location']
    if (-not $loc) { throw 'no Location header' }
    $out = Invoke-WebRequest -Uri $loc -Headers $headers -UseBasicParsing
    $bytes = [byte[]]$out.Content
    $after = $bytes.Length
    if ($after -le 0) { throw 'empty output' }
    if ($after -lt $before) {
      [IO.File]::WriteAllBytes($f.FullName, $bytes)
      $delta = $before - $after
      $saved += $delta
      $line = "[$i/$($files.Count)] OK $($f.FullName.Replace($Root, '')) $before -> $after (-$([math]::Round(100 * $delta / $before, 1))%)"
      $ok++
    } else {
      $line = "[$i/$($files.Count)] SKIP $($f.FullName.Replace($Root, '')) no gain ($before)"
      $skip++
    }
    Write-Host $line
    $log += $line
  } catch {
    $line = "[$i/$($files.Count)] FAIL $($f.FullName.Replace($Root, '')): $($_.Exception.Message)"
    Write-Host $line
    $log += $line
    $fail++
  }
  Start-Sleep -Milliseconds $DelayMs
}

$summary = "DONE ok=$ok skip=$skip fail=$fail saved_kb=$([math]::Round($saved / 1KB, 1))"
Write-Host $summary
$log += $summary
$log | Set-Content -Encoding utf8 $logPath

if ($fail -gt 0) { exit 2 }
exit 0
