# 同步 home/public/industry + news → 腾讯云 COS
# 用法（PowerShell）:
#   $env:COS_SECRET_ID='AKIDxxxx'
#   $env:COS_SECRET_KEY='xxxx'
#   $env:COS_REGION='ap-guangzhou'   # 与桶地域一致
#   $env:COS_BUCKET='blockhub-1312575218'
#   powershell -File scripts/sync-static-cos.ps1
param(
  [string]$Bucket = $env:COS_BUCKET,
  [string]$Region = $env:COS_REGION,
  [string]$SecretId = $env:COS_SECRET_ID,
  [string]$SecretKey = $env:COS_SECRET_KEY,
  [string]$PublicRoot = ''
)

$ErrorActionPreference = 'Stop'
if (-not $Bucket) { $Bucket = 'blockhub-1312575218' }
if (-not $Region) { $Region = 'ap-guangzhou' }
if (-not $PublicRoot) {
  $PublicRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'home\public'
}

if (-not $SecretId -or -not $SecretKey) {
  Write-Error '缺少 COS_SECRET_ID / COS_SECRET_KEY。请在腾讯云「访问管理 → API 密钥」创建后设置环境变量。'
  exit 1
}

$py = @'
import os, sys
from pathlib import Path
from qcloud_cos import CosConfig, CosS3Client

bucket = os.environ["COS_BUCKET"]
region = os.environ["COS_REGION"]
root = Path(os.environ["COS_PUBLIC_ROOT"])
secret_id = os.environ["COS_SECRET_ID"]
secret_key = os.environ["COS_SECRET_KEY"]

client = CosS3Client(CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key, Scheme="https"))

# 探测桶是否存在 / 权限是否正确
try:
    client.head_bucket(Bucket=bucket)
except Exception as e:
    print(f"HEAD bucket 失败: {e}", file=sys.stderr)
    print("请确认：桶全名含 AppId、地域正确、密钥有该桶写权限。", file=sys.stderr)
    sys.exit(2)

uploaded = 0
for folder in ("industry", "news"):
    base = root / folder
    if not base.is_dir():
        print(f"跳过缺失目录: {base}")
        continue
    for path in base.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}:
            continue
        key = path.relative_to(root).as_posix()
        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
        }.get(path.suffix.lower(), "application/octet-stream")
        with path.open("rb") as f:
            client.put_object(
                Bucket=bucket,
                Body=f,
                Key=key,
                ContentType=content_type,
                CacheControl="public, max-age=2592000",
            )
        uploaded += 1
        print(f"OK {key} ({path.stat().st_size} bytes)")

print(f"DONE uploaded={uploaded} bucket={bucket} region={region}")
'@

$env:COS_BUCKET = $Bucket
$env:COS_REGION = $Region
$env:COS_SECRET_ID = $SecretId
$env:COS_SECRET_KEY = $SecretKey
$env:COS_PUBLIC_ROOT = $PublicRoot

Write-Host "上传 $PublicRoot → cos://$Bucket/ (region=$Region)"
python -c $py
exit $LASTEXITCODE
