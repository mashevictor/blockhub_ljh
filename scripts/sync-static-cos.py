#!/usr/bin/env python3
"""Sync home/public/industry + news to Tencent COS.

Env:
  COS_SECRET_ID / COS_SECRET_KEY  (or TENCENT_SECRET_ID / TENCENT_SECRET_KEY)
  COS_BUCKET (default blockhub-1312575218)
  COS_REGION (default ap-guangzhou)
  COS_PUBLIC_ROOT (optional)
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client


def main() -> int:
    secret_id = (os.environ.get("COS_SECRET_ID") or os.environ.get("TENCENT_SECRET_ID") or "").strip()
    secret_key = (os.environ.get("COS_SECRET_KEY") or os.environ.get("TENCENT_SECRET_KEY") or "").strip()
    bucket = (os.environ.get("COS_BUCKET") or "blockhub-1312575218").strip()
    region = (os.environ.get("COS_REGION") or "ap-guangzhou").strip()
    root = Path(
        os.environ.get("COS_PUBLIC_ROOT")
        or Path(__file__).resolve().parents[1] / "home" / "public"
    )

    if not secret_id or not secret_key:
        print("缺少 SECRET_ID / SECRET_KEY", file=sys.stderr)
        return 1

    client = CosS3Client(
        CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key, Scheme="https")
    )

    try:
        client.head_bucket(Bucket=bucket)
    except Exception as e:
        print(f"HEAD bucket 失败: {e}", file=sys.stderr)
        print("请确认桶名(含AppId)、地域、密钥权限。", file=sys.stderr)
        # 再试一次常见地域
        if region == "ap-guangzhou":
            print("若桶不在广州，请设置 COS_REGION=ap-shanghai / ap-beijing 等后重试。", file=sys.stderr)
        return 2

    ctype_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
    }

    uploaded = 0
    for folder in ("industry", "news"):
        base = root / folder
        if not base.is_dir():
            print(f"跳过缺失目录: {base}")
            continue
        for path in sorted(base.rglob("*")):
            if not path.is_file():
                continue
            suf = path.suffix.lower()
            if suf not in ctype_map:
                continue
            key = path.relative_to(root).as_posix()
            with path.open("rb") as f:
                client.put_object(
                    Bucket=bucket,
                    Body=f,
                    Key=key,
                    ContentType=ctype_map[suf],
                    CacheControl="public, max-age=2592000",
                )
            uploaded += 1
            print(f"OK {key} ({path.stat().st_size} bytes)")

    print(f"DONE uploaded={uploaded} bucket={bucket} region={region}")
    print(f"示例: https://{bucket}.cos.{region}.myqcloud.com/industry/mfg/thumb.jpg")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
