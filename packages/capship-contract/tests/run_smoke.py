# CapShip L2 contract smoke (no pytest required)

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from capship_contract import (  # noqa: E402
    android_app_id_for_public_id,
    build_manifest,
    build_page_schema,
)
from capship_contract.vendor import web_pkg_prefix  # noqa: E402


def main() -> None:
    keys = ["chat_qa", "approval_flow"]
    manifest = build_manifest(keys)
    schema = build_page_schema(keys)
    assert len(manifest["routes"]) == 2
    assert manifest["web_pkgs"] and manifest["flutter_pkgs"]
    assert len(schema["routes"]) == 2
    assert android_app_id_for_public_id("123demo") == "com.blockhub.app.a123demo"

    os.environ["CAPSHIP_WEB_PKG_PREFIX"] = "@capship/web-capability"
    # vendor reads env at call time
    from importlib import reload
    import capship_contract.vendor as vendor

    reload(vendor)
    m2 = build_manifest(["chat_qa"], pkg_prefix=vendor.web_pkg_prefix())
    assert m2["web_pkgs"][0].startswith("@capship/web-capability-")
    print("OK", manifest["web_pkgs"], schema["meta"]["entry_source"], web_pkg_prefix())


if __name__ == "__main__":
    main()
