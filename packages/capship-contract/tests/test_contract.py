"""Acceptance: keys=[chat_qa, approval_flow] → schema + manifest + android id."""

from __future__ import annotations

import os

from capship_contract import (
    android_app_id_for_public_id,
    build_manifest,
    build_page_schema,
)


def test_manifest_and_schema_for_two_keys():
    keys = ["chat_qa", "approval_flow"]
    manifest = build_manifest(keys)
    assert manifest["capability_keys"] == keys
    assert len(manifest["routes"]) == 2
    assert len(manifest["widgets"]) == 2
    assert manifest["web_pkgs"], "web_pkgs must be non-empty"
    assert manifest["flutter_pkgs"], "flutter_pkgs must be non-empty"
    assert all("web-capability" in p for p in manifest["web_pkgs"])

    schema = build_page_schema(keys, entry_source="capship_workbench")
    assert schema["meta"]["entry_source"] == "capship_workbench"
    assert len(schema["routes"]) == 2
    assert {r["capability_key"] for r in schema["routes"]} == set(keys)
    assert len(schema["menu"]) == 2


def test_android_id_digit_leading_and_vendor_env(monkeypatch):
    monkeypatch.delenv("CAPSHIP_ANDROID_VENDOR", raising=False)
    assert android_app_id_for_public_id("123demo") == "com.blockhub.app.a123demo"
    monkeypatch.setenv("CAPSHIP_ANDROID_VENDOR", "com.capship")
    # vendor helper reads env at call time
    from capship_contract.vendor import android_vendor_prefix

    assert android_vendor_prefix() == "com.capship"
    assert android_app_id_for_public_id("office-hq") == "com.capship.app.office_hq"


def test_web_pkg_prefix_env(monkeypatch):
    monkeypatch.setenv("CAPSHIP_WEB_PKG_PREFIX", "@capship/web-capability")
    from capship_contract.vendor import web_pkg_prefix

    assert web_pkg_prefix() == "@capship/web-capability"
    manifest = build_manifest(["chat_qa"], pkg_prefix=web_pkg_prefix())
    assert manifest["web_pkgs"][0].startswith("@capship/web-capability-")
