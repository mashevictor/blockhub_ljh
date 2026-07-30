#!/usr/bin/env python3
"""Merge med EN scene translations into shared/i18n/seed/scene.en-US.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "shared" / "i18n" / "seed" / "scene.en-US.json"

# index (1-based) → (name, short problem, category)
MED: dict[int, tuple[str, str, str]] = {
    1: ("Symptom pre-consult", "Patients misdescribe symptoms before registration. AI NLP pre-consult captures chief complaint, history, allergies and suggests a department — doctor confirms.", "AI triage & routing"),
    2: ("ED triage assist", "ED acuity relies on nurse experience. AI suggests ESI-level triage from vitals, complaint, and red flags — nurse confirms.", "AI triage & routing"),
    3: ("Triage todo closed loop", "After triage desk intake, follow-up exams and referrals get lost. AI creates and tracks nurse-station todos.", "AI triage & routing"),
    4: ("Follow-up booking guide", "Post-discharge revisit rates are low. AI recommends department and time from discharge orders — patient or nurse confirms.", "AI triage & routing"),
    5: ("Chief-complaint structuring", "Free-text complaints hurt DRG coding. AI NLP structures symptom, site, time, and nature for the chart.", "AI triage & routing"),
    6: ("Allergy history capture", "Incomplete allergies cause med errors. Conversational NLP captures allergens and reactions for HIS — doctor confirms.", "AI triage & routing"),
    7: ("Red-flag symptom alert", "Hidden red flags (chest pain, stroke) are missed. AI NLP alerts the nurse station and suggests urgent triage.", "AI triage & routing"),
    8: ("Pediatric triage routing", "Peds acuity changes fast. Rules engine suggests level and department from age, symptoms, and fever — nurse confirms.", "AI triage & routing"),
    9: ("Shift-swap conflict check", "Manual swap checks miss consecutive night limits. Constraint solver detects conflicts and proposes compliant swaps.", "Smart nurse roster"),
    10: ("Charge-nurse approval", "Swap/leave/OT approvals stuck on paper/PC. AI summarizes conflicts and suggests approve/deny — charge nurse decides.", "Smart nurse roster"),
    11: ("Roster overview", "Ward roster tables are hard to read. Auto Gantt/heatmap highlights coverage gaps without editing the roster.", "Smart nurse roster"),
    12: ("Flexible overtime roster", "Nurses want preferred OT slots. Forecast demand and preferences, then publish after charge-nurse OK.", "Smart nurse roster"),
    13: ("Night-shift handover list", "Night handovers miss critical patients/meds. RAG builds a structured checklist from history and SOP.", "Smart nurse roster"),
    14: ("Staffing load board", "No live nurse-to-patient load view. Dashboard computes load from roster + HIS and warns overload windows.", "Smart nurse roster"),
    15: ("Leave-linked backfill", "Leave leaves holes. Recommend qualified backfill nurses and raise an approval for the charge nurse.", "Smart nurse roster"),
    16: ("Guideline retrieval", "Bedside guideline lookup is slow. RAG returns cited guideline snippets for clinician reference only.", "Clinical knowledge RAG"),
    17: ("Drug insert Q&A", "Paper inserts get lost. RAG answers from the drug-label KB — pharmacist still reviews.", "Clinical knowledge RAG"),
    18: ("Clinical pathway reference", "Pathways live in many systems. Vector search returns pathway steps for standardization support.", "Clinical knowledge RAG"),
    19: ("Nursing SOP lookup", "New nurses need quick SOP steps. RAG retrieves nursing SOP text for procedure guidance.", "Clinical knowledge RAG"),
    20: ("Case-conference notes", "Hard-case notes are scattered. RAG retrieves and summarizes discussion minutes.", "Clinical knowledge RAG"),
    21: ("CME question bank", "Exam prep banks are fragmented. Vector search returns practice items by topic.", "Clinical knowledge RAG"),
    22: ("Antimicrobial Q&A", "Stewardship rules are long. RAG answers from antimicrobial guidance — culture and clinician decide.", "Clinical knowledge RAG"),
    23: ("Critical-value explainer", "Nurses need fast meaning of lab criticals. RAG explains significance — clinician still acts.", "Clinical knowledge RAG"),
    24: ("Adverse-event report", "AE reporting is heavy and under-reported. Rules pre-fill forms from HIS/LIS anomalies into QC workflow.", "Safety & quality"),
    25: ("IPC round & corrective action", "Infection-control rounds stay on paper. NLP extracts issues and assigns corrective tasks.", "Safety & quality"),
    26: ("QC SOP checklist", "SOP audits are manual. Mobile forms compare results to SOP and write defect reports.", "Safety & quality"),
    27: ("Clinical todo hub", "Todos scatter across HIS/LIS/PACS. Aggregate and IM-remind — clinicians still act.", "Safety & quality"),
    28: ("IPC early warning push", "MDR/infection signals lag. Rules on LIS micro results push IM alerts to IPC and wards.", "Safety & quality"),
    29: ("Hand-hygiene spot check", "Compliance audits are paper-based. Mobile capture auto-computes compliance trends.", "Safety & quality"),
    30: ("High-alert med double-check", "Insulin/chemo checks are error-prone. Scan/NLP match to orders and log the check.", "Safety & quality"),
    31: ("Consult request", "Paper consults are slow. Rules match department/doctor and LLM drafts a summary for HIS.", "Clinical collab approvals"),
    32: ("MDT request", "MDT scheduling is hard. RAG templates plus conflict checks organize slots — not treatment decisions.", "Clinical collab approvals"),
    33: ("Surgery approval", "Multi-level surgery sign-off is paper-slow. Rules route by surgery class and extract key fields.", "Clinical collab approvals"),
    34: ("Bed coordination", "Bed crunch is manual. Recommend beds from occupancy forecasts — clinician assigns.", "Clinical collab approvals"),
    35: ("Critical-value notify", "Critical labs arrive late. Rules + webhook push to clinician IM and log receipt.", "Clinical collab approvals"),
    36: ("Transfusion approval", "Blood-type matching checks are manual. Rules validate match and summarize rationale.", "Clinical collab approvals"),
    37: ("High-value supply trace", "Stents/implants need full chain. Barcode/RFID + rules link supply to patient in HIS/LIS.", "Smart materials & devices"),
    38: ("Device purchase approval", "Multi-level device purchase is slow. Rank priority from utilization history into OA — humans approve.", "Smart materials & devices"),
    39: ("Maintenance-due reminder", "Missed PM causes downtime. Rules scan asset ledger and notify 30 days ahead.", "Smart materials & devices"),
    40: ("Metrology-due reminder", "Calibration overdue risks compliance. Rules notify biomed and clinical owners before due.", "Smart materials & devices"),
    41: ("Sterile-pack trace", "CSSD packs need wash-to-issue trail. Barcode + rules log each step — quality judgment stays human.", "Smart materials & devices"),
    42: ("Dept ops dashboard", "Ops KPIs lag on spreadsheets. NL2SQL aggregates visit/bed/ALOS boards with drill-down.", "Clinical analytics"),
    43: ("Natural-language query", "Clinicians cannot write SQL. NL2SQL answers questions like top clinics by volume — data only.", "Clinical analytics"),
    44: ("Bed occupancy analysis", "Bed stats are manual. Live occupancy, turnover, and ETA-free boards from HIS.", "Clinical analytics"),
    45: ("Outpatient volume trend", "Volume swings lack forecasts. Time-series trends and YoY/MoM for staffing support.", "Clinical analytics"),
    46: ("ALOS analysis", "Long ALOS hurts DRG. Association mining finds delay factors — not clinical pathway edits.", "Clinical analytics"),
    47: ("DRG group overview", "DRG mix is hard to see. Cluster case-mix, cost, and ALOS for ops — not outcomes scoring.", "Clinical analytics"),
    48: ("Data masking & authorization", "Sensitive fields leak by role. RBAC rules dynamically mask ID/name in HIS reads.", "Interop & compliance"),
    49: ("LIS critical push", "Nurses refresh HIS for criticals. Webhook from LIS pushes WeCom/DingTalk to owners.", "Interop & compliance"),
    50: ("Privacy compliance Q&A", "Staff unsure about privacy rules. RAG answers from hospital policies — not legal advice.", "Interop & compliance"),
    51: ("HIS–LIS sync check", "Order/result mismatches. NL2SQL diff detects conflicts and suggests fixes — no auto-write.", "Interop & compliance"),
    52: ("Role permission admin", "Onboarding needs many system roles. Rules generate RBAC packs from job templates — admin approves.", "Interop & compliance"),
}

CATEGORIES = {
    "AI导诊与分诊": "AI triage & routing",
    "智能护理排班": "Smart nurse roster",
    "临床知识RAG": "Clinical knowledge RAG",
    "医疗安全质控": "Safety & quality",
    "临床协同审批": "Clinical collab approvals",
    "智慧物资设备": "Smart materials & devices",
    "医疗智能分析": "Clinical analytics",
    "互联互通与合规": "Interop & compliance",
}


def main() -> None:
    data = json.loads(SEED.read_text(encoding="utf-8-sig")) if SEED.is_file() else {"_comment": ""}
    for i, (name, problem, cat) in MED.items():
        idx = f"{i:03d}"
        data[f"scene.med.{idx}.name"] = name
        data[f"scene.med.{idx}.problem"] = problem
        data[f"scene.med.{idx}.category"] = cat
    SEED.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK  {SEED.relative_to(ROOT)} med keys={len(MED)*3}")

    cat_path = ROOT / "shared" / "i18n" / "seed" / "category.en-US.json"
    cats = json.loads(cat_path.read_text(encoding="utf-8-sig"))
    cats.update(CATEGORIES)
    cat_path.write_text(json.dumps(cats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK  categories +{len(CATEGORIES)}")


if __name__ == "__main__":
    main()
