#!/usr/bin/env python3
"""Extract industry visual/enrich copy → shared/i18n/messages/*/industry.ui.gen.json."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "shared" / "i18n" / "messages"


def extract_visual() -> dict[str, dict]:
    text = (ROOT / "home/src/data/industryVisualThemes.ts").read_text(encoding="utf-8")
    packs: dict[str, dict] = {}
    # Top-level pack entries: key: { ... },
    for m in re.finditer(
        r"^  (\w+): \{\n((?:.*\n)*?)  \},?\n(?=  \w+: \{|})",
        text,
        re.M,
    ):
        key, block = m.group(1), m.group(2)
        if key in ("stats",):
            continue
        pitch_m = re.search(r"heroPitch:\s*'([^']*)'", block)
        highs_m = re.search(r"highlights:\s*\[(.*?)\]", block, re.S)
        stats_m = re.search(r"stats:\s*\[(.*?)\]", block, re.S)
        if not (pitch_m and highs_m and stats_m):
            continue
        highlights = re.findall(r"'([^']*)'", highs_m.group(1))
        stats = re.findall(
            r"\{\s*value:\s*'([^']*)'\s*,\s*label:\s*'([^']*)'\s*\}",
            stats_m.group(1),
        )
        packs[key] = {
            "pitch": pitch_m.group(1),
            "highlights": highlights,
            "stats": [{"value": v, "label": lab} for v, lab in stats],
        }
    return packs


def extract_enrich() -> dict[str, dict]:
    text = (ROOT / "home/src/data/industryEnrichStatic.ts").read_text(encoding="utf-8")
    start = text.index("const PACK_COPY")
    sub = text[start:]
    # Skip type annotation braces; object starts at `= {`
    eq = sub.index("=")
    brace = sub.index("{", eq)
    depth = 0
    end = brace
    for j, ch in enumerate(sub[brace:], brace):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    obj_src = sub[brace:end]
    enrich: dict[str, dict] = {}
    for m in re.finditer(
        r"(\w+):\s*\{\s*overview:\s*'((?:\\'|[^'])*)'\s*,\s*highlights:\s*\[(.*?)\]\s*,\s*tipScenes:\s*\[(.*?)\]\s*,?\s*\}",
        obj_src,
        re.S,
    ):
        key = m.group(1)
        overview = m.group(2).replace("\\'", "'")
        highs = [h.replace("\\'", "'") for h in re.findall(r"'((?:\\'|[^'])*)'", m.group(3))]
        tips = []
        for tm in re.finditer(
            r"\{\s*name:\s*'((?:\\'|[^'])*)'\s*,\s*tip:\s*'((?:\\'|[^'])*)'\s*\}",
            m.group(4),
        ):
            tips.append(
                {
                    "name": tm.group(1).replace("\\'", "'"),
                    "tip": tm.group(2).replace("\\'", "'"),
                }
            )
        enrich[key] = {"overview": overview, "highlights": highs, "tips": tips}
    return enrich


# Hand-maintained EN for visual themes (key → pitch / highlights / stat labels)
VISUAL_EN: dict[str, dict] = {
    "office": {
        "pitch": "Enterprise digital workplace · from policy Q&A to end-to-end approvals",
        "highlights": [
            "HR, finance, approvals, and knowledge in one place",
            "Policy Q&A + leave/expense live in minutes",
            "Built for HQ and multi-department collaboration",
        ],
        "stats": ["Office scenarios", "Business groups", "Platforms in sync"],
    },
    "mfg": {
        "pitch": "Smart shop floor · repair, SOP, QC, and MES together",
        "highlights": [
            "Equipment repair · SOP Q&A · QC approval loop",
            "Line exceptions through maintenance reminders",
            "Drawing/BOM search + energy & carbon stats",
        ],
        "stats": ["Manufacturing scenarios", "OEE board", "Integrable"],
    },
    "sales": {
        "pitch": "Sales growth hub · 64 sales-only scenarios, selection is delivery",
        "highlights": [
            "Pure sales/CRM scenarios · no office HR approvals",
            "Quotes, contracts, and funnel boards on real APIs",
            "Salesforce / Fenxiang and other CRM ready",
        ],
        "stats": ["Sales scenarios", "Business groups", "Real data"],
    },
    "med": {
        "pitch": "Smart hospital collaboration · guidelines, shifts, triage, HIS",
        "highlights": [
            "Clinical guidelines · shift swaps · adverse event reporting",
            "Patient education and intelligent triage (external)",
            "Department ops board + consults/referrals",
        ],
        "stats": ["Healthcare scenarios", "Privacy controls", "Integrable"],
    },
    "game": {
        "pitch": "Game ops mid-office · player FAQ, support, campaign alerts",
        "highlights": [
            "Player FAQ/guides · support tickets · campaign go-live alerts",
            "License compliance review · dual knowledge-base RAG",
            "Retention board (real ticket aggregates) + playable 2048",
        ],
        "stats": ["Game scenarios", "Player service", "Content risk"],
    },
    "retail": {
        "pitch": "Omnichannel retail · inventory, membership, promos, orders",
        "highlights": [
            "Stock alerts · promo approvals · omnichannel order tracking",
            "Returns tickets · supplier reconciliation",
            "Display checks and price-change approvals",
        ],
        "stats": ["Retail scenarios", "Loyalty", "Stores"],
    },
    "edu": {
        "pitch": "Smart campus · courses, question banks, scheduling, home-school",
        "highlights": [
            "Course scheduling · quizzes · home-school notices",
            "Grade analysis alerts · online tutoring",
            "Tuition collection and attendance",
        ],
        "stats": ["Education scenarios", "Academics", "Home-school"],
    },
    "finance": {
        "pitch": "Fintech compliance · risk, wealth Q&A, diligence loops",
        "highlights": [
            "Compliance review · risk alerts · wealth Q&A",
            "Diligence collaboration · credit approvals",
            "Regulatory filing and post-investment ops",
        ],
        "stats": ["Finance scenarios", "Customer KYC", "AML"],
    },
    "bank": {
        "pitch": "Commercial banking · KYC, credit, AML closed loop",
        "highlights": [
            "Corporate/retail KYC · credit approvals",
            "AML monitoring · compliance sign-off",
            "Dual dedicated knowledge bases",
        ],
        "stats": ["Banking scenarios", "Account KYC", "AML"],
    },
    "securities": {
        "pitch": "Brokerage · suitability, diligence, compliance",
        "highlights": [
            "Account suitability · research diligence",
            "Compliance sign-off · product sales",
            "Post-investment tracking",
        ],
        "stats": ["Broker scenarios", "Onboarding", "Research"],
    },
    "insurance": {
        "pitch": "Insurance · underwriting, claims, product explainers",
        "highlights": [
            "Underwriting & claims on real tickets",
            "Agent compliance",
            "Policy terms RAG",
        ],
        "stats": ["Insurance scenarios", "Underwriting", "Claims"],
    },
    "fund": {
        "pitch": "Asset management · disclosure, post-investment, filings",
        "highlights": [
            "Product disclosure · post-investment ops",
            "Regulatory filing tasks",
            "Compliance review",
        ],
        "stats": ["AM scenarios", "Products", "Filings"],
    },
    "fintech": {
        "pitch": "Consumer finance · risk alerts, collections, filings",
        "highlights": [
            "Risk early-warning",
            "Post-loan checks",
            "Regulatory filings · KYC defense-in-depth",
        ],
        "stats": ["Fintech scenarios", "Risk", "Filings"],
    },
    "logistics": {
        "pitch": "Logistics fulfillment · waybills, warehouse, fleet, POD",
        "highlights": [
            "Waybill tracking · inbound/outbound · inventory",
            "Fleet dispatch · exception handling · POD",
            "Cold-chain alerts and dock queues",
        ],
        "stats": ["Logistics scenarios", "Warehouse", "Fleet"],
    },
    "realestate": {
        "pitch": "Property & brokerage · listings, leases, repairs, contracts",
        "highlights": [
            "Listing publish · rent collection · viewing booking",
            "Owner complaints · fit-out acceptance",
            "Contracts and site patrol",
        ],
        "stats": ["Property scenarios", "Listings", "Service"],
    },
    "hotel": {
        "pitch": "Hospitality · rooms, F&B, housekeeping, night audit",
        "highlights": [
            "Booking · room status · housekeeping tasks",
            "Banquets · complaints · lost & found",
            "Revenue board and membership",
        ],
        "stats": ["Hospitality scenarios", "Rooms", "F&B"],
    },
    "energy": {
        "pitch": "Energy ops · patrol, defects, tickets, emissions",
        "highlights": [
            "Site patrol · equipment repair · defect tickets",
            "Spare parts · outage plans",
            "Emissions tracking",
        ],
        "stats": ["Energy scenarios", "Assets", "Safety"],
    },
    "gov": {
        "pitch": "Public service · one-stop counters, appeals, grids",
        "highlights": [
            "Service items · appeal handling · grid governance",
            "License processing · hotline tickets",
            "Policy Q&A knowledge base",
        ],
        "stats": ["Gov scenarios", "Services", "Grids"],
    },
    "legal": {
        "pitch": "Legal ops · cases, filings, evidence, hearings",
        "highlights": [
            "Case management · filing · evidence",
            "Hearing schedules · contract ops",
            "Knowledge + approval trails",
        ],
        "stats": ["Legal scenarios", "Cases", "Compliance"],
    },
    "hr": {
        "pitch": "People ops · hiring, leave, performance, payroll",
        "highlights": [
            "Onboarding · leave · policy Q&A",
            "Performance · training · headcount",
            "Payroll collaboration",
        ],
        "stats": ["HR scenarios", "Talent", "Payroll"],
    },
    "marketing": {
        "pitch": "Marketing ops · campaigns, leads, content, funnel",
        "highlights": [
            "Campaign ops · lead intake",
            "Content calendar · approval trails",
            "Funnel boards",
        ],
        "stats": ["Marketing scenarios", "Campaigns", "Leads"],
    },
    "construction": {
        "pitch": "Construction sites · safety, progress, materials, acceptance",
        "highlights": [
            "Site patrol · safety tickets",
            "Materials · progress tracking",
            "Acceptance and approvals",
        ],
        "stats": ["Construction scenarios", "Safety", "Progress"],
    },
    "agriculture": {
        "pitch": "Agri ops · patrols, inputs, subsidies, inventory",
        "highlights": [
            "Field patrol records · input plans",
            "Subsidy workflows · inventory",
            "Traceable harvest data",
        ],
        "stats": ["Agri scenarios", "Fields", "Inputs"],
    },
    "media": {
        "pitch": "Media ops · review, calendars, campaigns, rights",
        "highlights": [
            "Content review · publish calendar",
            "Campaign ops · rights checks",
            "Knowledge + notifications",
        ],
        "stats": ["Media scenarios", "Content", "Calendar"],
    },
    "auto": {
        "pitch": "Auto service digitalization · aftersales, test drives, work orders",
        "highlights": [
            "Test-drive booking · aftersales work orders",
            "Service due reminders · accident claim guidance",
            "Store traffic and extended warranty offers",
        ],
        "stats": ["Auto scenarios", "Aftersales", "Bookings"],
    },
}


# EN for enrich overview + highlights (tips localized by index below)
ENRICH_EN: dict[str, dict] = {
    "office": {
        "overview": "The general office deep pack covers HR/admin, finance/legal, knowledge collaboration, and approvals — leave, expense, policy Q&A, and onboarding are ready out of the box.",
        "highlights": [
            "Leave & expense capabilities",
            "Policy Q&A + inbox",
            "Hiring & onboarding path",
            "Message reach",
        ],
        "tips": [
            ("Leave approval", "Employees apply online; managers approve — leave_request; add notify via >>."),
            ("Expense booking", "Expense claims with invoice archiving — expense_claim with attachments and multi-level approval."),
            ("Policy Q&A", "Policy/benefits Q&A — policy_qa + knowledge base."),
            ("Hiring & onboarding", "Hiring and onboarding guides — hire_onboard with approvals/inbox."),
        ],
    },
    "mfg": {
        "overview": "Manufacturing deep pack centers on equipment repair, QC SOP, and inventory counts so shop-floor repair and process Q&A close on mobile.",
        "highlights": ["Equipment repair dispatch", "QC SOP", "Inventory counts", "EHS photo reports"],
        "tips": [
            ("Equipment repair", "Line fault repair dispatch — device_repair with photos + notify."),
            ("SOP / process Q&A", "Work instruction search — chat_qa + kb_document."),
            ("QC approval", "Incoming/finished QC — quality_inspect / approvals."),
            ("Material requisition", "Production issue/return — inventory_count + approvals."),
        ],
    },
    "sales": {
        "overview": "Sales deep pack lists sales/CRM-only scenarios — no office HR/admin mix. Formal capabilities use real APIs; empty DB means empty lists.",
        "highlights": [
            "Sales-only · no office HR mix",
            "Lead-to-cash on real stores",
            "Funnel & commission boards on real data",
            "Salesforce / Fenxiang CRM ready",
        ],
        "tips": [
            ("Lead capture", "New leads land fast — sales_lead."),
            ("Special discount", "Out-of-policy discounts — quote_contract."),
            ("Sales funnel analysis", "Stage conversion — chart_funnel."),
            ("Visit notes", "Customer follow-up trail — sales_lead."),
            ("Sales contract approval", "Contract sign-off — quote_contract."),
            ("Field check-in", "Visit geolocation — site_patrol."),
            ("Salesforce lead sync", "CRM sync — erp_connector."),
            ("Product talk tracks", "Talk tracks & competitors — chat_qa."),
        ],
    },
    "med": {
        "overview": "Healthcare deep pack covers intelligent triage, nurse shifts, and clinical knowledge search for pre-visit and shift-swap approvals.",
        "highlights": ["Intelligent triage", "Nurse shifts", "Clinical guidelines", "Adverse-event loop"],
        "tips": [
            ("Intelligent triage (external)", "Patient pre-visit — med_triage."),
            ("Shift / swap request", "Clinical shifts — nurse_shift."),
            ("Guidelines / drug library", "Clinical reference — kb_document."),
            ("Adverse event report", "Patient-safety events — form + approval loop."),
        ],
    },
    "game": {
        "overview": "Gaming deep pack: player FAQ/support tickets on real stores, campaign rules + license dual-KB RAG, campaign IM notify, playable 2048 — no fake seeds.",
        "highlights": [
            "Player FAQ · support tickets (real API)",
            "Campaign rules / license dual KB",
            "Campaign notify · IM webhook",
            "Playable 2048",
        ],
        "tips": [
            ("Player FAQ", "Campaign-rule Q&A — game_support (faq)."),
            ("Support ticket", "Player issue routing — game_support (ticket)."),
            ("Player FAQ & campaign rules KB", "Industry KB RAG — empty DB means empty list."),
            ("Campaign go-live notify", "Launch pushes — notify_im."),
        ],
    },
    "retail": {
        "overview": "Retail deep pack covers omnichannel fulfillment, store transfers, coupon/gift-card, competitive pricing, and aftersales audit — real APIs, empty lists when empty.",
        "highlights": [
            "Store transfer & shrink",
            "Omni pickup / refund-only",
            "Coupons & gift cards",
            "Retail ops aggregates",
        ],
        "tips": [
            ("Store transfer", "Inter-store transfer — store_transfer."),
            ("Omnichannel pickup", "Pickup code redeem — omni_pickup."),
            ("Coupon redeem", "In-store codes — promo_coupon."),
            ("Online refund-only", "Marketplace refunds — online_refund."),
        ],
    },
    "edu": {
        "overview": "Education deep pack covers home-school notices, homework Q&A, and class schedules to speed family communication.",
        "highlights": ["Home-school notices", "Homework Q&A", "Schedules", "Grade boards"],
        "tips": [
            ("Home-school notice", "Targeted announcements — school_notice."),
            ("Online tutoring", "After-class Q&A — homework_qa / chat_qa."),
            ("Course scheduling", "Class schedules — class_schedule."),
            ("Grade analysis", "Trend alerts — chart_dashboard."),
        ],
    },
    "bank": {
        "overview": "Commercial bank vertical pack covers corporate/retail KYC, credit, and AML — real APIs, empty lists when empty.",
        "highlights": ["KYC tickets", "Credit approval", "AML monitoring", "Dual knowledge bases"],
        "tips": [
            ("Corporate KYC", "Corporate account verification — finance_kyc."),
            ("Credit approval", "Limit/guarantee approval — credit_approval."),
            ("AML monitoring", "Suspicious-transaction tickets — finance_aml."),
            ("Compliance review", "Sign-off + bank compliance KB — approval_flow."),
        ],
    },
    "securities": {
        "overview": "Brokerage vertical pack covers suitability, research diligence, compliance, and product sales.",
        "highlights": ["Suitability", "Research diligence", "Compliance sign-off", "Product RAG"],
        "tips": [
            ("Account suitability", "Investor matching — finance_kyc."),
            ("Research diligence", "Diligence reports — due_diligence."),
            ("Product sales", "Prospectus Q&A — kb + chat_qa."),
            ("Compliance review", "Sign-off trail — approval_flow."),
        ],
    },
    "insurance": {
        "overview": "Insurance vertical pack covers underwriting, claims, agents, and product explainers.",
        "highlights": ["UW & claims", "Agent compliance", "Policy terms", "Approval trails"],
        "tips": [
            ("Underwriting", "Risk assessment — insurance_case."),
            ("Claims", "FNOL & payout — insurance_case."),
            ("Product explainer", "Terms RAG — kb_document."),
            ("Agent compliance", "Conduct review — approval_flow."),
        ],
    },
    "fund": {
        "overview": "Fund/AM vertical pack covers product disclosure, post-investment, and regulatory filings.",
        "highlights": ["Regulatory filings", "Post-investment", "Product disclosure", "Compliance review"],
        "tips": [
            ("Regulatory filing", "Filing tasks — regulatory_report."),
            ("Post-investment", "Post-investment notes — due_diligence."),
            ("Product disclosure", "Prospectus RAG — kb_document."),
            ("Compliance review", "Sign-off — approval_flow."),
        ],
    },
    "fintech": {
        "overview": "Consumer-finance vertical pack covers risk alerts, post-loan checks, and regulatory filings.",
        "highlights": ["Risk alerts", "Post-loan checks", "Regulatory filings", "KYC defense"],
        "tips": [
            ("Risk alert", "Fraud/overdue — finance_aml."),
            ("Post-loan management", "Post-loan checks — credit_approval."),
            ("Regulatory filing", "Filing tasks — regulatory_report."),
            ("Account KYC", "Identity verification — finance_kyc."),
        ],
    },
    "logistics": {
        "overview": "Logistics deep pack covers waybills, inbound/outbound, dispatch/POD, and cold chain — real APIs, empty lists when empty.",
        "highlights": [
            "Waybill / warehouse tickets",
            "Dispatch, POD & exception loops",
            "Cold-chain alerts",
            "In-transit visibility aggregates",
        ],
        "tips": [
            ("Waybill tracking", "Linehaul/city nodes — waybill_track."),
            ("Warehouse count", "Cycle counts — inventory_count."),
            ("POD confirmation", "Proof of delivery — pod_signoff."),
            ("Cold-chain alert", "Temp/humidity breach — cold_chain_alert."),
        ],
    },
    "realestate": {
        "overview": "Property deep pack covers viewing/signing, rent collection, owner complaints, and fit-out acceptance — real APIs, empty lists when empty.",
        "highlights": [
            "Viewing / signing tickets",
            "Rent & property-fee collection",
            "Owner complaint loops",
            "Project ops aggregates",
        ],
        "tips": [
            ("Viewing booking", "Slot booking — house_viewing."),
            ("Property repair", "Owner repair — property_repair."),
            ("Rent collection", "Billing & dunning — rent_collection."),
            ("Listing publish", "Listing review — listing_publish."),
        ],
    },
    "hotel": {
        "overview": "Hospitality deep pack covers room status/HK, concierge/night audit, dining reservations/86, and allergen tickets — real APIs, empty lists when empty.",
        "highlights": [
            "Room status / HK tables",
            "Reservations & 86",
            "Concierge / night audit",
            "Rooms + F&B dual track",
        ],
        "tips": [
            ("Room status change", "Clean/dirty — room_status."),
            ("Housekeeping", "Rush cleans — hk_task."),
            ("Dining reservation", "Party size & slot — table_reserve."),
            ("Menu 86", "Station 86 — menu_86."),
        ],
    },
    "energy": {
        "overview": "Energy & utilities deep pack covers equipment patrol, defect tickets, and energy monitoring.",
        "highlights": ["Equipment patrol", "Defect tickets", "Energy alerts", "Two-ticket control"],
        "tips": [
            ("Equipment patrol", "Line patrol — site_patrol."),
            ("Ticket dispatch", "Defect dispatch — device_repair / approvals."),
            ("Energy monitoring", "Anomaly alerts — board + notify."),
            ("Two-ticket control", "Work/operation ticket approvals."),
        ],
    },
    "gov": {
        "overview": "Public-service deep pack provides service guides, appeal intake, and online approvals.",
        "highlights": ["Service guides", "Appeal routing", "Online approvals", "Gov dashboards"],
        "tips": [
            ("Service guide", "Materials Q&A — gov_service."),
            ("Appeal intake", "Register & route — approval loop."),
            ("Online approval", "Item intake — approval_flow."),
            ("Policy Q&A", "Policy explainers — chat_qa + kb."),
        ],
    },
    "legal": {
        "overview": "Legal-services deep pack covers case tracking, contract review, and regulation search.",
        "highlights": ["Case tracking", "Contract review", "Regulation search", "Hearing reminders"],
        "tips": [
            ("Case management", "Progress & materials — legal_case."),
            ("Contract review", "Clause risk review — kb + approvals."),
            ("Regulation search", "Case-law search — chat_qa + kb."),
            ("Hearing reminder", "Hearing milestone notify."),
        ],
    },
    "hr": {
        "overview": "HR deep pack focuses on hiring/onboarding, leave, and policy Q&A.",
        "highlights": ["Interviewing", "Join/leave processing", "Leave & expense", "Policy Q&A"],
        "tips": [
            ("Interviewing", "Resume screening — hire_onboard."),
            ("Onboarding", "One-stop materials — approvals + kb."),
            ("Employee self-service", "Policy/benefits Q&A — policy_qa."),
            ("Attendance stats", "Exception stats board."),
        ],
    },
    "marketing": {
        "overview": "Marketing deep pack covers campaign ops, lead nurturing, and media ROI.",
        "highlights": ["Campaign go-live", "Lead assignment", "Media ROI", "Content review"],
        "tips": [
            ("Campaign planning", "Campaign approval go-live — campaign_ops."),
            ("Lead assignment", "Smart assign to sales — sales_lead."),
            ("Media analysis", "ROI board — chart_funnel."),
            ("Content review", "Multi-level compliance review."),
        ],
    },
    "construction": {
        "overview": "Construction deep pack covers site safety, material requisition, and progress reporting.",
        "highlights": ["Hazard reports", "Quality acceptance", "Material requisition", "Daily progress"],
        "tips": [
            ("Safety check", "Hazard remediation — site_patrol."),
            ("Material requisition", "Materials approval — deco_material."),
            ("Acceptance sign-off", "Partial acceptance e-sign."),
            ("Progress report", "Daily construction log — board."),
        ],
    },
    "agriculture": {
        "overview": "Agriculture deep pack focuses on traceability, field records, and subsidy filings.",
        "highlights": ["Traceability", "Field patrol", "Subsidy filing", "Weather alerts"],
        "tips": [
            ("Traceability", "End-to-end trace — kb + board."),
            ("Field patrol", "Work record forms."),
            ("Subsidy filing", "Online filing approvals."),
            ("Weather alert", "Disaster push notify."),
        ],
    },
    "media": {
        "overview": "Media deep pack covers topic planning, content review, and distribution calendars.",
        "highlights": ["Topic intake", "Multi-level review", "Rights management", "Distribution calendar"],
        "tips": [
            ("Topic planning", "Intake approval — campaign_ops."),
            ("Content review", "Multi-level compliance review."),
            ("Rights management", "Register & license — kb."),
            ("Distribution calendar", "Multi-platform schedule + notify."),
        ],
    },
    "auto": {
        "overview": "Auto & mobility deep pack covers aftersales work orders, test-drive booking, and customer follow-up.",
        "highlights": ["Aftersales WOs", "Test-drive booking", "Parts requisition", "Customer follow-up"],
        "tips": [
            ("Aftersales WO", "Repair/maintenance — device_repair / approvals."),
            ("Test-drive booking", "Slot booking — sales_lead."),
            ("Parts requisition", "Purchase approval."),
            ("Customer callback", "Delivery callback — chat_qa."),
        ],
    },
}


def emit_locale(visual: dict, enrich: dict, lang: str) -> dict[str, str]:
    out: dict[str, str] = {
        "_generated_by": "scripts/codegen-industry-ui-i18n.py",
        "_do_not_edit": "Regenerate instead of hand-editing.",
    }
    for key, v in visual.items():
        if lang == "zh-CN":
            out[f"industry.ui.{key}.pitch"] = v["pitch"]
            for i, h in enumerate(v["highlights"]):
                out[f"industry.ui.{key}.highlight.{i}"] = h
            for i, st in enumerate(v["stats"]):
                out[f"industry.ui.{key}.stat.{i}.label"] = st["label"]
        else:
            en = VISUAL_EN.get(key)
            if not en:
                continue
            out[f"industry.ui.{key}.pitch"] = en["pitch"]
            for i, h in enumerate(en["highlights"]):
                out[f"industry.ui.{key}.highlight.{i}"] = h
            for i, lab in enumerate(en["stats"]):
                out[f"industry.ui.{key}.stat.{i}.label"] = lab

    for key, e in enrich.items():
        if lang == "zh-CN":
            out[f"industry.ui.{key}.overview"] = e["overview"]
            for i, h in enumerate(e["highlights"]):
                out[f"industry.ui.{key}.eh.{i}"] = h
            for i, tip in enumerate(e["tips"]):
                out[f"industry.ui.{key}.tip.{i}.name"] = tip["name"]
                out[f"industry.ui.{key}.tip.{i}.tip"] = tip["tip"]
        else:
            en = ENRICH_EN.get(key)
            if not en:
                continue
            out[f"industry.ui.{key}.overview"] = en["overview"]
            for i, h in enumerate(en["highlights"]):
                out[f"industry.ui.{key}.eh.{i}"] = h
            tips = en.get("tips") or []
            # Fall back to zh tip count with EN tip pair if provided; else skip tip keys
            for i, pair in enumerate(tips):
                name, tip = pair
                out[f"industry.ui.{key}.tip.{i}.name"] = name
                out[f"industry.ui.{key}.tip.{i}.tip"] = tip
            # If EN tips shorter than ZH, leave missing → client keeps fallback / drops CJK
    return out


def main() -> None:
    visual = extract_visual()
    enrich = extract_enrich()
    if len(visual) < 20:
        raise SystemExit(f"visual extract too small: {len(visual)} keys={list(visual)}")
    if len(enrich) < 20:
        raise SystemExit(f"enrich extract too small: {len(enrich)} keys={list(enrich)}")

    for lang in ("zh-CN", "en-US"):
        path = OUT / lang / "industry.ui.gen.json"
        data = emit_locale(visual, enrich, lang)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {path} ({len(data)} keys)")


if __name__ == "__main__":
    main()
