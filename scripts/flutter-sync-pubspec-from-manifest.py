#!/usr/bin/env python3
"""P1/P2 · Sync runtime-app pubspec + melos registry + deferred loader from capability_keys."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "shared" / "flutter-parity-matrix.json"
PUBSPEC = ROOT / "runtime-app" / "pubspec.yaml"
REGISTRY_G = ROOT / "runtime-app" / "lib" / "melos_capability_registry.g.dart"
DEFERRED_G = ROOT / "runtime-app" / "lib" / "capability_deferred_loader.g.dart"

# P2 · 重组件优先 deferred（需在 pubspec 中存在才生成 import）
DEFERRED_PACKAGES = {
    "capability_shanghai_voice": {
        "prefix": "def_voice",
        "import": "package:capability_shanghai_voice/capability_shanghai_voice.dart",
        "keys": ["shanghai_voice", "shanghai_voice_stream", "flutter_speech", "chat_voice"],
        "builder": "ShanghaiVoicePage(branding: branding)",
    },
    "capability_dashboard": {
        "prefix": "def_dashboard",
        "import": "package:capability_dashboard/capability_dashboard.dart",
        "keys": [
            "chart_dashboard",
            "chart_funnel",
            "chart_line",
            "chart_bar",
            "notify_inapp",
            "notify_email",
            "report_scheduled",
            "data_export",
            "announce_board",
        ],
        "builder": "DashboardPage(branding: branding)",
    },
}

EXTRA_KEY_ALIASES: dict[str, str] = {
    "chat": "capability_chat_qa",
    "kb_search": "capability_kb",
    "approval": "capability_approval_flow",
    "audit_log": "capability_audit_log",
    "oa_connector": "capability_integration",
    "auth_sso": "capability_integration",
    "contract_editor": "capability_approval_flow",
    "contract_esign": "capability_approval_flow",
    "approval_countersign": "capability_approval_flow",
    "approval_conditional": "capability_approval_flow",
    "approval_remind": "capability_approval_flow",
    "approval_esign": "capability_approval_flow",
}


def _load_matrix() -> dict:
    return json.loads(MATRIX_PATH.read_text(encoding="utf-8"))


def _key_to_flutter(matrix: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for row in matrix.get("rows", []):
        fp = row.get("flutter_pkg")
        if not fp:
            continue
        for key in row.get("capability_keys") or []:
            out[key] = fp
    out.update(EXTRA_KEY_ALIASES)
    return out


def _package_meta(matrix: dict) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for row in matrix.get("rows", []):
        fp = row.get("flutter_pkg")
        if not fp or fp in out:
            continue
        out[fp] = {
            "module_class": row.get("module_class", ""),
            "dart_import": row.get("dart_import", ""),
            "keys": list(row.get("capability_keys") or []),
        }
    return out


def _keys_from_spec(spec_path: Path) -> list[str]:
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    keys = spec.get("capability_keys") or []
    if keys:
        return [str(k) for k in keys if k]
    manifest = spec.get("build_manifest") or {}
    return [str(k) for k in (manifest.get("capability_keys") or []) if k]


def resolve_flutter_packages(keys: list[str], matrix: dict) -> list[str]:
    key_map = _key_to_flutter(matrix)
    pkgs: list[str] = ["blockhub_flutter_core"]

    def _add(fp: str | None) -> None:
        if not fp or fp in pkgs:
            return
        if (ROOT / "packages" / fp / "pubspec.yaml").is_file():
            pkgs.append(fp)

    for key in keys:
        _add(key_map.get(key))
        if key not in key_map:
            _add(f"capability_{key}")

    if len(pkgs) == 1 and not keys:
        for row in matrix.get("rows", []):
            _add(row.get("flutter_pkg"))
        _add("capability_flutter_tools")
    return pkgs


def _capability_dep_lines(packages: list[str]) -> list[str]:
    lines = ["  blockhub_flutter_core:", "    path: ../packages/blockhub_flutter_core"]
    for pkg in packages:
        if pkg == "blockhub_flutter_core":
            continue
        lines.append(f"  {pkg}:")
        lines.append(f"    path: ../packages/{pkg}")
    return lines


def patch_pubspec(packages: list[str], *, dry_run: bool = False) -> str:
    text = PUBSPEC.read_text(encoding="utf-8")
    cap_names = set()
    matrix = _load_matrix()
    for row in matrix.get("rows", []):
        if row.get("flutter_pkg"):
            cap_names.add(row["flutter_pkg"])
    cap_names.add("blockhub_flutter_core")
    cap_names.add("capability_flutter_tools")

    lines = text.splitlines()
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^  (blockhub_flutter_core|capability_[a-z0-9_]+):\s*$", line)
        if m and m.group(1) in cap_names:
            i += 1
            if i < len(lines) and lines[i].strip().startswith("path:"):
                i += 1
            continue
        out.append(line)
        i += 1

    inserted = False
    final: list[str] = []
    for line in out:
        final.append(line)
        if not inserted and line.strip() == "sdk: flutter":
            final.extend(_capability_dep_lines(packages))
            inserted = True
    if not inserted:
        raise RuntimeError("could not find insertion point in pubspec.yaml")

    new_text = "\n".join(final) + ("\n" if text.endswith("\n") else "")
    if not dry_run:
        PUBSPEC.write_text(new_text, encoding="utf-8")
    return new_text


def _integration_builder(key: str) -> str:
    return f"IntegrationModule(capabilityKey: '{key}').buildPage(branding)"


def write_registry_g(packages: list[str], *, dry_run: bool = False) -> str:
    matrix = _load_matrix()
    meta = _package_meta(matrix)
    key_map = _key_to_flutter(matrix)

    imports: list[str] = ["import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';"]
    seen_import: set[str] = set()
    map_lines: list[str] = []
    module_instances: list[str] = []
    module_vars: dict[str, str] = {}

    for pkg in packages:
        if pkg == "blockhub_flutter_core":
            continue
        if pkg == "capability_integration":
            if "package:capability_integration/capability_integration.dart" not in seen_import:
                imports.append("import 'package:capability_integration/capability_integration.dart';")
                seen_import.add("package:capability_integration/capability_integration.dart")
            for key in meta.get("capability_integration", {}).get("keys", []):
                map_lines.append(f"    '{key}': IntegrationModule(capabilityKey: '{key}'),")
            continue
        if pkg == "capability_flutter_tools":
            if "package:capability_flutter_tools/capability_flutter_tools.dart" not in seen_import:
                imports.append("import 'package:capability_flutter_tools/capability_flutter_tools.dart';")
                seen_import.add("package:capability_flutter_tools/capability_flutter_tools.dart")
            for key in sorted(
                {
                    "schedule_alarm",
                    "flutter_push",
                    "flutter_scan_qr",
                    "flutter_geolocation",
                    "flutter_camera",
                    "flutter_map",
                    "flutter_offline",
                    "flutter_biometric",
                    "flutter_signature",
                    "flutter_file_picker",
                    "flutter_pdf",
                    "flutter_webview",
                    "flutter_chart",
                }
            ):
                map_lines.append(f"    '{key}': const FlutterToolsModule(capabilityKey: '{key}'),")
            continue

        m = meta.get(pkg, {})
        dart_import = m.get("dart_import") or f"package:{pkg}/{pkg}.dart"
        module_class = m.get("module_class")
        if not module_class:
            continue
        if dart_import not in seen_import:
            imports.append(f"import '{dart_import}';")
            seen_import.add(dart_import)
        var = f"_mod_{pkg.replace('capability_', '')}"
        if var not in module_vars:
            module_vars[var] = module_class
            module_instances.append(f"final {var} = const {module_class}();")

    for key, fp in sorted(key_map.items()):
        if fp not in packages or fp in ("capability_integration", "capability_flutter_tools"):
            continue
        var = f"_mod_{fp.replace('capability_', '')}"
        if var in module_vars:
            map_lines.append(f"    '{key}': {var},")

    modules_list = ", ".join(module_vars.keys()) or ""
    body = "\n".join(
        [
            "// Auto-generated by scripts/flutter-sync-pubspec-from-manifest.py — do not edit.",
            *imports,
            "",
            *module_instances,
            "",
            "List<CapabilityModule> get generatedMelosCapabilityModules => [",
            *[f"  {v}," for v in module_vars.keys()],
            "];",
            "",
            "final Map<String, CapabilityModule> generatedMelosModuleByKey = {",
            *map_lines,
            "};",
            "",
        ]
    )
    if not dry_run:
        REGISTRY_G.parent.mkdir(parents=True, exist_ok=True)
        REGISTRY_G.write_text(body, encoding="utf-8")
    return body


def write_deferred_loader_g(packages: list[str], *, dry_run: bool = False) -> str:
    imports: list[str] = [
        "import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';",
        "import 'package:flutter/material.dart';",
    ]
    key_set: list[str] = []
    cases: list[str] = []

    for pkg, spec in DEFERRED_PACKAGES.items():
        if pkg not in packages:
            continue
        prefix = spec["prefix"]
        imports.append(f"import '{spec['import']}' deferred as {prefix};")
        for key in spec["keys"]:
            key_set.append(key)
            cases.append(f"    case '{key}':")
        cases.append(f"      await {prefix}.loadLibrary();")
        cases.append(f"      return {prefix}.{spec['builder']};")

    # 必须写 Set<String>：Dart 里空 {} 或未标注集合会被推断成 Map，导致 .contains 编译失败
    sorted_keys = sorted(set(key_set))
    if sorted_keys:
        keys_block = ["const Set<String> deferredCapabilityKeys = {"]
        keys_block.extend(f"  '{k}'," for k in sorted_keys)
        keys_block.append("};")
    else:
        keys_block = ["const Set<String> deferredCapabilityKeys = <String>{};"]

    body = "\n".join(
        [
            "// Auto-generated by scripts/flutter-sync-pubspec-from-manifest.py — do not edit.",
            *imports,
            "",
            *keys_block,
            "",
            "bool isDeferredCapabilityKey(String key) => deferredCapabilityKeys.contains(key);",
            "",
            "Future<Widget?> buildDeferredCapabilityPage({",
            "  required String key,",
            "  required AppBranding branding,",
            "}) async {",
            "  switch (key) {",
            *cases,
            "    default:",
            "      return null;",
            "  }",
            "}",
            "",
        ]
    )
    if not dry_run:
        DEFERRED_G.parent.mkdir(parents=True, exist_ok=True)
        DEFERRED_G.write_text(body, encoding="utf-8")
    return body


def main() -> int:
    ap = argparse.ArgumentParser(description="Sync Flutter pubspec from capability keys")
    ap.add_argument("--keys", help="Comma-separated capability_keys")
    ap.add_argument("--spec", type=Path, help="Publish build queue JSON")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-registry", action="store_true")
    ap.add_argument("--skip-deferred", action="store_true")
    args = ap.parse_args()

    if not MATRIX_PATH.is_file():
        print(f"ERROR: missing {MATRIX_PATH}", file=sys.stderr)
        return 1

    matrix = _load_matrix()
    if args.spec:
        keys = _keys_from_spec(args.spec)
    elif args.keys:
        keys = [k.strip() for k in args.keys.split(",") if k.strip()]
    else:
        keys = []

    packages = resolve_flutter_packages(keys, matrix)
    print("capability_keys:", keys or "<default present packages>")
    print("flutter_packages:", ", ".join(packages))

    if args.dry_run:
        print("\n--- pubspec capability deps ---")
        print("\n".join(_capability_dep_lines(packages)))
        if not args.skip_registry:
            print("\n--- melos_capability_registry.g.dart ---")
            print(write_registry_g(packages, dry_run=True))
        if not args.skip_deferred:
            print("\n--- capability_deferred_loader.g.dart ---")
            print(write_deferred_loader_g(packages, dry_run=True))
        return 0

    patch_pubspec(packages, dry_run=False)
    print(f"wrote {PUBSPEC}")
    if not args.skip_registry:
        write_registry_g(packages, dry_run=False)
        print(f"wrote {REGISTRY_G}")
    if not args.skip_deferred:
        write_deferred_loader_g(packages, dry_run=False)
        print(f"wrote {DEFERRED_G}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
