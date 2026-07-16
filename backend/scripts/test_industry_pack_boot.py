"""制造 / 通用办公行业包装配与 Runtime boot 验收。"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.services.industry_pack_boot import boot_industry_pack
from app.services.scene_capability_map import assemble_industry_pack
from app.services.schema_generator import generate_page_schema, validate_page_schema

MFG_SCENE_NAMES = [
    "设备报修",
    "SOP/工艺问答",
    "生产日报/OEE",
    "质检审批",
    "物料领用",
    "安环隐患上报",
    "排班/考勤",
    "保养计划提醒",
    "图纸/BOM检索",
    "对接MES/ERP",
    "能耗/碳排统计",
    "技能培训记录",
]

OFFICE_SCENE_NAMES = [
    "请假审批",
    "报销记账",
    "制度问答",
    "招聘入职",
    "待办中心",
    "知识库",
]


class TestMfgSceneAssembly(unittest.TestCase):
    def test_mfg_full_pack_has_12_scenes(self) -> None:
        assembly = assemble_industry_pack("mfg")
        self.assertEqual(assembly["scene_count"], 12)
        self.assertEqual(set(assembly["scenario_names"]), set(MFG_SCENE_NAMES))
        self.assertGreaterEqual(len(assembly["capability_keys"]), 6)
        self.assertEqual(len(assembly["menu_plan"]), 12)

    def test_schema_menu_covers_all_scenes(self) -> None:
        assembly = assemble_industry_pack("mfg")
        schema = generate_page_schema(
            app_id="mfgtest01",
            app_name="制造全量验收",
            capability_keys=assembly["capability_keys"],
            web_template_id="tabs_portal",
            menu_plan=assembly["menu_plan"],
            scene_groups=assembly["groups"],
        )
        validate_page_schema(schema)
        labels = {m["label"] for m in schema["menu"]}
        for name in MFG_SCENE_NAMES:
            self.assertIn(name, labels, msg=f"menu missing scene {name}")

    def test_mfg_pack_boot(self) -> None:
        boot = boot_industry_pack("mfg")
        self.assertEqual(boot["pack_key"], "mfg")
        self.assertEqual(boot["public_id"], "preview-mfg")
        self.assertGreaterEqual(len(boot["build_manifest"]["web_pkgs"]), 6)
        self.assertEqual(boot["assembly"]["scene_count"], 12)


class TestOfficeSceneAssembly(unittest.TestCase):
    def test_office_full_pack_has_6_scenes(self) -> None:
        assembly = assemble_industry_pack("office")
        self.assertEqual(assembly["scene_count"], 6)
        self.assertEqual(set(assembly["scenario_names"]), set(OFFICE_SCENE_NAMES))
        self.assertEqual(len(assembly["menu_plan"]), 6)

    def test_office_primary_capabilities(self) -> None:
        assembly = assemble_industry_pack("office")
        primary = {m["capability_key"] for m in assembly["menu_plan"]}
        for required in (
            "leave_request",
            "expense_claim",
            "policy_qa",
            "hire_onboard",
            "approval_inbox",
            "kb_document",
        ):
            self.assertIn(required, primary, msg=f"office menu missing {required}")

    def test_office_pack_boot(self) -> None:
        boot = boot_industry_pack("office")
        self.assertEqual(boot["pack_key"], "office")
        self.assertEqual(boot["public_id"], "preview-office")
        pkgs = boot["build_manifest"]["web_pkgs"]
        self.assertTrue(any("leave-request" in p for p in pkgs))
        self.assertTrue(any("expense-claim" in p for p in pkgs))
        labels = {m["label"] for m in boot["page_schema"]["menu"]}
        for name in OFFICE_SCENE_NAMES:
            self.assertIn(name, labels)


if __name__ == "__main__":
    unittest.main()
