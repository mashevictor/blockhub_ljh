#!/usr/bin/env python3
"""Bootstrap P4 seeds: full capability.en-US + hero s35-40 + hero-copy EN.

Safe to re-run: preserves existing seed values; only fills missing keys.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.data.hero_presets import HERO_PRESETS  # noqa: E402

SEED = ROOT / "shared" / "i18n" / "seed"
GEN_CAP_EN = ROOT / "shared" / "i18n" / "messages" / "en-US" / "capability.gen.json"

# Product-quality overrides (win over humanize / gen dump)
CAP_OVERRIDES: dict[str, str] = {
    "leave_request": "Leave Request",
    "expense_claim": "Expense Claim",
    "device_repair": "Device Repair",
    "member_loyalty": "Membership Growth",
    "shanghai_voice": "Shanghai Voice Agent",
    "shanghai_voice_stream": "Shanghai Voice (Realtime)",
    "chat_qa": "Smart Q&A",
    "notify_im": "IM Notify",
    "approval_flow": "Approval Flow",
    "approval_inbox": "Approval Inbox",
    "policy_qa": "Policy Q&A",
    "hire_onboard": "Hire & Onboard",
    "sales_lead": "Sales Lead",
    "quote_contract": "Quote & Contract",
    "ops_kpi": "Ops KPI Board",
    "quality_inspect": "Quality Inspect",
    "inventory_count": "Inventory Count",
    "omni_pickup": "Omni Pickup",
    "store_transfer": "Store Transfer",
    "med_triage": "Medical Triage",
    "nurse_shift": "Nurse Shift",
    "game_support": "Player Support",
    "school_notice": "School Notify",
    "homework_qa": "Homework Help",
    "class_schedule": "Class Schedule",
    "campaign_ops": "Campaign Ops",
    "property_repair": "Property Repair",
    "house_viewing": "House Viewing",
    "hotel_booking": "Hotel Booking",
    "delivery_order": "Delivery / Ride",
    "fitness_checkin": "Fitness Check-in",
    "travel_plan": "Travel Playbook",
    "wedding_plan": "Wedding Planner",
    "deco_material": "Home Renovation",
    "pet_clinic": "Pet Clinic",
    "site_patrol": "Site Patrol",
    "gov_service": "Gov Services",
    "legal_case": "Legal Contract",
    "study_coach": "Study Coach",
    "finance_kyc": "Bank KYC",
    "finance_aml": "AML Monitoring",
    "credit_approval": "Credit Approval",
    "insurance_case": "Insurance UW & Claims",
    "regulatory_report": "Regulatory Reporting",
    "finance_news": "Industry News Agent",
    "asset_manage": "Asset Management",
    "it_ticket": "IT Ticket",
    "meeting_booking": "Meeting Booking",
    "kb_document": "Knowledge Base",
    "data_nl_query": "Natural Language Query",
}

HERO_LABEL_EXTRA: dict[str, str] = {
    "s35": "Bank KYC",
    "s36": "AML Monitoring",
    "s37": "Credit Approval",
    "s38": "Insurance UW & Claims",
    "s39": "Regulatory Reporting",
    "s40": "Industry News",
}

# Curated EN copy for all hero presets (hint / prompt / role / flow_lines)
HERO_COPY: dict[str, dict] = {
    "s00": {
        "hint": "Dialect · Voice",
        "role": "Shanghai speaker",
        "prompt": "Real-time Shanghai dialect voice chat — ask questions and get things done in dialect.",
        "flow_lines": [
            ">> Shanghai voice · speak naturally",
            ">> Real-time ASR · dialect recognition",
            ">> Smart Q&A · voice playback",
            ">> Web/APK · one-click generate",
        ],
    },
    "s01": {
        "hint": "HR · Workflow",
        "role": "HR",
        "prompt": "Submit leave online, manager approval, and leave balance lookup.",
        "flow_lines": [
            ">> Leave · submit online",
            ">> Manager approve / reject",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s02": {
        "hint": "Finance · Receipts",
        "role": "Finance",
        "prompt": "Expense claims with photo upload, finance review, and ledger lookup.",
        "flow_lines": [
            ">> Expense · register costs",
            ">> Finance review · payment loop",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s03": {
        "hint": "Knowledge · Self-serve",
        "role": "Employee",
        "prompt": "Company policy and benefits Q&A — self-serve anytime.",
        "flow_lines": [
            ">> Policy Q&A · ask & store",
            ">> Answers archived · knowledge loop",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s04": {
        "hint": "HR · Talent",
        "role": "HR",
        "prompt": "Job posting, resume screening, and onboarding in one place.",
        "flow_lines": [
            ">> Hire · candidate intake",
            ">> Interview/Offer · onboard loop",
            ">> WeCom/DingTalk/Feishu · progress",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s05": {
        "hint": "CRM · Follow-up",
        "role": "Sales",
        "prompt": "Lead intake, customer follow-up, and sales funnel management.",
        "flow_lines": [
            ">> Sales lead · customer intake",
            ">> Follow-up · close the deal",
            ">> WeCom/DingTalk/Feishu · reminders",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s06": {
        "hint": "Sales · Closing",
        "role": "Sales",
        "prompt": "Quote approval, contract review, and special-price requests.",
        "flow_lines": [
            ">> Quote/contract · register",
            ">> Review & sign · close loop",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s07": {
        "hint": "Exec · Decisions",
        "role": "Executive",
        "prompt": "Core KPIs on one screen with natural-language data queries.",
        "flow_lines": [
            ">> Ops KPI · register metrics",
            ">> Publish alerts · archive",
            ">> WeCom/DingTalk/Feishu · push",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s08": {
        "hint": "Manufacturing · Ops",
        "role": "Manufacturing",
        "prompt": "On-site device fault tickets, dispatch, and repair tracking.",
        "flow_lines": [
            ">> Device repair · scan & submit",
            ">> Work order · track progress",
            ">> WeCom/DingTalk/Feishu · status",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s09": {
        "hint": "Manufacturing · Process",
        "role": "QA",
        "prompt": "SOP process Q&A, quality records, and exception reporting.",
        "flow_lines": [
            ">> QA SOP · batch & step entry",
            ">> Pass/fail · on-the-spot",
            ">> WeCom/DingTalk/Feishu · exceptions",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s10": {
        "hint": "Retail · Fulfillment",
        "role": "Retail",
        "prompt": "Online order to store pickup, transfers, and coupon redemption.",
        "flow_lines": [
            ">> Omni pickup · redeem code",
            ">> Store transfer · real inventory",
            ">> WeCom/DingTalk/Feishu · arrival",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s11": {
        "hint": "Retail · Growth",
        "role": "Ops",
        "prompt": "Member points, promotions, and outreach messaging.",
        "flow_lines": [
            ">> Membership · campaign intake",
            ">> Coupons/points · ready to send",
            ">> WeCom/DingTalk/Feishu · push",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s12": {
        "hint": "Hospital · Patient",
        "role": "Clinician",
        "prompt": "Care guide, schedule lookup, and triage Q&A.",
        "flow_lines": [
            ">> Medical triage · pre-intake",
            ">> Recommend department · guide",
            ">> WeCom/DingTalk/Feishu · reminders",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s13": {
        "hint": "Hospital · Scheduling",
        "role": "Nursing",
        "prompt": "Nurse schedules, shift swaps, and duty notifications.",
        "flow_lines": [
            ">> Nurse shift · swap online",
            ">> Head nurse · approve/reject",
            ">> WeCom/DingTalk/Feishu · duty notice",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s14": {
        "hint": "Gaming · Support",
        "role": "Support",
        "prompt": "Player FAQ, ticket intake, and escalation workflows.",
        "flow_lines": [
            ">> Player FAQ · ticket intake",
            ">> Escalate · resolve loop",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s15": {
        "hint": "School · Notify",
        "role": "Teacher",
        "prompt": "School notices to parents with read tracking.",
        "flow_lines": [
            ">> School notice · draft & send",
            ">> Read receipts · follow-up",
            ">> WeCom/DingTalk/Feishu · push",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s16": {
        "hint": "Education · Tutoring",
        "role": "Student",
        "prompt": "Homework help with step-by-step explanations.",
        "flow_lines": [
            ">> Homework help · ask a question",
            ">> Step-by-step · understand",
            ">> WeCom/DingTalk/Feishu · share",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s17": {
        "hint": "Education · Schedule",
        "role": "Teacher",
        "prompt": "Class schedules, room changes, and reminders.",
        "flow_lines": [
            ">> Class schedule · publish",
            ">> Room change · notify",
            ">> WeCom/DingTalk/Feishu · remind",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s18": {
        "hint": "Marketing · Campaigns",
        "role": "Marketer",
        "prompt": "Campaign planning, execution tracking, and results.",
        "flow_lines": [
            ">> Campaign · plan & launch",
            ">> Track results · optimize",
            ">> WeCom/DingTalk/Feishu · updates",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s19": {
        "hint": "Property · Maintenance",
        "role": "Property",
        "prompt": "Property repair tickets from report to close.",
        "flow_lines": [
            ">> Property repair · submit",
            ">> Dispatch · track to close",
            ">> WeCom/DingTalk/Feishu · status",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s20": {
        "hint": "Real estate · Viewing",
        "role": "Agent",
        "prompt": "House viewing bookings and feedback capture.",
        "flow_lines": [
            ">> Viewing · book a slot",
            ">> Feedback · follow-up",
            ">> WeCom/DingTalk/Feishu · remind",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s21": {
        "hint": "Hospitality · Booking",
        "role": "Hotel",
        "prompt": "Hotel booking, room status, and guest requests.",
        "flow_lines": [
            ">> Hotel booking · reserve",
            ">> Room status · guest requests",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s22": {
        "hint": "Logistics · Delivery",
        "role": "Ops",
        "prompt": "Delivery / ride orders with status tracking.",
        "flow_lines": [
            ">> Delivery · place order",
            ">> Track status · complete",
            ">> WeCom/DingTalk/Feishu · updates",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s23": {
        "hint": "Fitness · Check-in",
        "role": "Member",
        "prompt": "Gym check-in, class booking, and streak tracking.",
        "flow_lines": [
            ">> Fitness · check in",
            ">> Class booking · streaks",
            ">> WeCom/DingTalk/Feishu · remind",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s24": {
        "hint": "Travel · Playbook",
        "role": "Traveler",
        "prompt": "Travel itineraries, bookings, and day-of playbooks.",
        "flow_lines": [
            ">> Travel plan · build itinerary",
            ">> Bookings · day-of guide",
            ">> WeCom/DingTalk/Feishu · share",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s25": {
        "hint": "Events · Wedding",
        "role": "Planner",
        "prompt": "Wedding planning tasks, vendors, and timelines.",
        "flow_lines": [
            ">> Wedding · task board",
            ">> Vendors · timeline",
            ">> WeCom/DingTalk/Feishu · updates",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s26": {
        "hint": "Home · Renovation",
        "role": "Owner",
        "prompt": "Renovation materials, progress, and acceptance.",
        "flow_lines": [
            ">> Renovation · materials",
            ">> Progress · acceptance",
            ">> WeCom/DingTalk/Feishu · updates",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s27": {
        "hint": "Pets · Clinic",
        "role": "Clinic",
        "prompt": "Pet clinic appointments, records, and reminders.",
        "flow_lines": [
            ">> Pet clinic · book visit",
            ">> Records · follow-up",
            ">> WeCom/DingTalk/Feishu · remind",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s28": {
        "hint": "Security · Patrol",
        "role": "Security",
        "prompt": "Site patrol routes, checkpoints, and incident reports.",
        "flow_lines": [
            ">> Site patrol · start route",
            ">> Checkpoints · incidents",
            ">> WeCom/DingTalk/Feishu · alert",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s29": {
        "hint": "Gov · Services",
        "role": "Citizen",
        "prompt": "Government service intake, tracking, and notifications.",
        "flow_lines": [
            ">> Gov service · submit request",
            ">> Track progress · close",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s30": {
        "hint": "Legal · Contracts",
        "role": "Legal",
        "prompt": "Legal contract drafting, review, and filing.",
        "flow_lines": [
            ">> Legal contract · intake",
            ">> Review · file",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s31": {
        "hint": "Dialect · Realtime",
        "role": "Shanghai speaker",
        "prompt": "Realtime Shanghai dialect voice agent with streaming ASR/TTS.",
        "flow_lines": [
            ">> Shanghai voice · realtime",
            ">> Streaming ASR · dialect",
            ">> Smart reply · voice out",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s32": {
        "hint": "Learning · Coach",
        "role": "Student",
        "prompt": "Study coach with plans, quizzes, and progress.",
        "flow_lines": [
            ">> Study coach · set goals",
            ">> Quizzes · track progress",
            ">> WeCom/DingTalk/Feishu · remind",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s33": {
        "hint": "Parent · Coach",
        "role": "Parent",
        "prompt": "Parent coaching tips aligned with student progress.",
        "flow_lines": [
            ">> Parent coach · guidance",
            ">> Align with study plan",
            ">> WeCom/DingTalk/Feishu · share",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s34": {
        "hint": "Teacher · Planning",
        "role": "Teacher",
        "prompt": "Teacher lesson plans, materials, and class prep.",
        "flow_lines": [
            ">> Teacher plan · prepare class",
            ">> Materials · publish",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s35": {
        "hint": "Banking · Onboarding",
        "role": "Bank",
        "prompt": "Corporate/retail account KYC with real work orders.",
        "flow_lines": [
            ">> Bank KYC · verify customer",
            ">> Soft steps · persist to DB",
            ">> WeCom/DingTalk/Feishu · onboarding",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s36": {
        "hint": "Banking · Compliance",
        "role": "Compliance",
        "prompt": "Suspicious transaction detection with real AML tickets.",
        "flow_lines": [
            ">> AML · register alert",
            ">> Soft steps · case archive",
            ">> WeCom/DingTalk/Feishu · compliance",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s37": {
        "hint": "Banking · Credit",
        "role": "Credit",
        "prompt": "Credit limit / collateral approval and post-loan checks.",
        "flow_lines": [
            ">> Credit · limit & collateral",
            ">> Soft steps · close in DB",
            ">> WeCom/DingTalk/Feishu · notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s38": {
        "hint": "Insurance · Underwriting",
        "role": "Insurance",
        "prompt": "Underwriting assessment and claims intake with real tickets.",
        "flow_lines": [
            ">> UW & claims · policy/customer",
            ">> Soft steps · close in DB",
            ">> WeCom/DingTalk/Feishu · case notify",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s39": {
        "hint": "Asset mgmt · Compliance",
        "role": "Asset mgmt",
        "prompt": "Regulatory report filing tasks from intake to done.",
        "flow_lines": [
            ">> Regulatory · report cycle",
            ">> Soft steps · mark filed",
            ">> WeCom/DingTalk/Feishu · deadline",
            ">> CapShip · real dual-end APIs",
        ],
    },
    "s40": {
        "hint": "Finance · Intelligence",
        "role": "Research",
        "prompt": "Macro/micro must-read digests and discussion streams; demo or live sources.",
        "flow_lines": [
            ">> Industry news · digests",
            ">> Demo samples · source=demo",
            ">> Token · sync live sources",
            ">> CapShip · real dual-end APIs",
        ],
    },
}


def humanize_key(key: str) -> str:
    parts = re.split(r"[_\s]+", key.strip())
    return " ".join(p[:1].upper() + p[1:] for p in parts if p)


def _load(path: Path) -> dict:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def _write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")


def bootstrap_capability() -> None:
    path = SEED / "capability.en-US.json"
    existing = _load(path)
    gen = _load(GEN_CAP_EN)
    out: dict = {
        "_comment": "en-US capability names. CapabilityDef.labels wins; then this seed; then humanize(key).",
    }
    for key in sorted(ALL_CAPABILITIES.keys()):
        if key in CAP_OVERRIDES:
            out[key] = CAP_OVERRIDES[key]
        elif isinstance(existing.get(key), str) and existing[key]:
            out[key] = existing[key]
        else:
            gen_name = gen.get(f"cap.{key}.name")
            out[key] = gen_name if isinstance(gen_name, str) and gen_name else humanize_key(key)
    _write(path, out)


def bootstrap_hero_labels() -> None:
    path = SEED / "hero.en-US.json"
    existing = _load(path)
    out: dict = {
        "_comment": "Hero scene English titles. Codegen merges into hero.gen.json.",
    }
    for preset in HERO_PRESETS:
        pid = preset["id"]
        if pid in HERO_LABEL_EXTRA:
            out[pid] = HERO_LABEL_EXTRA[pid]
        elif isinstance(existing.get(pid), str) and existing[pid]:
            out[pid] = existing[pid]
        else:
            out[pid] = humanize_key(pid)
    _write(path, out)


def bootstrap_hero_copy() -> None:
    path = SEED / "hero-copy.en-US.json"
    existing = _load(path)
    out: dict = {
        "_comment": "Hero hint/prompt/role/flow_lines EN. Merged by codegen into hero.gen.json.",
    }
    for preset in HERO_PRESETS:
        pid = preset["id"]
        curated = HERO_COPY.get(pid) or {}
        prev = existing.get(pid) if isinstance(existing.get(pid), dict) else {}
        out[pid] = {
            "hint": curated.get("hint") or prev.get("hint") or preset.get("hint") or "",
            "prompt": curated.get("prompt") or prev.get("prompt") or preset.get("prompt") or "",
            "role": curated.get("role") or prev.get("role") or preset.get("role") or "",
            "flow_lines": curated.get("flow_lines")
            or prev.get("flow_lines")
            or list(preset.get("flow_lines") or []),
        }
    _write(path, out)


def main() -> None:
    bootstrap_capability()
    bootstrap_hero_labels()
    bootstrap_hero_copy()
    print("OK bootstrap P4 seeds — next: python scripts/codegen-i18n-messages.py")


if __name__ == "__main__":
    main()
