#!/usr/bin/env python3
"""Smoke vertical_ops kinds against live API."""
from __future__ import annotations
import json, sys, urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001").rstrip("/")
API = f"{BASE}/api/v1"
KINDS = ['edu_grade_alert', 'edu_tuition', 'edu_attendance', 'edu_quiz', 'edu_textbook', 'edu_makeup', 'edu_transfer', 'energy_defect', 'energy_ticket', 'energy_spare', 'energy_emissions', 'energy_outage', 'energy_hotwork', 'energy_restore', 'gov_appeal', 'gov_grid', 'gov_license', 'gov_hotline', 'gov_supervise', 'gov_public', 'legal_filing', 'legal_evidence', 'legal_hearing', 'legal_contract_ops', 'legal_enforce', 'legal_preserve', 'hr_perf', 'hr_training', 'hr_headcount', 'hr_payroll', 'hr_offer', 'hr_idp', 'const_safety', 'const_accept', 'const_progress', 'const_visa', 'const_labor', 'agro_patrol', 'agro_subsidy', 'agro_inventory', 'agro_pest', 'agro_trace', 'media_review', 'media_calendar', 'media_topic', 'media_asset', 'media_live', 'auto_service', 'auto_fleet', 'auto_parts', 'auto_claim', 'auto_charge', 'mkt_lead', 'mkt_content', 'mkt_ab_test', 'mkt_roi', 'mkt_sign', 'mkt_coupon']

def req(method, path, token=None, body=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.load(resp)

tok = req("POST", "/auth/login", body={"email": "admin@trackchat.local", "password": "admin123"})["access_token"]
for kind in KINDS:
    items = req("GET", f"/vertical-ops/{kind}/records", token=tok)
    assert "items" in items
    created = req("POST", f"/vertical-ops/{kind}/records", token=tok, body={
        "title": f"smoke-{kind}", "field_a": "a", "note": "smoke"
    })
    rid = created["record"]["id"]
    req("POST", f"/vertical-ops/{kind}/records/{rid}/done", token=tok)
    print("OK", kind)
print("PASS", len(KINDS), "kinds")
