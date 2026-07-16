"""制造包 12 场景装配验收 + schema 菜单覆盖。"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.services.scene_capability_map import assemble_industry_pack, resolve_scene_capability_keys
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


class TestMfgSceneAssembly(unittest.TestCase):
    def test_mfg_full_pack_has_12_scenes(self) -> None:
        assembly = assemble_industry_pack("mfg")
        self.assertEqual(assembly["scene_count"], 12)
        self.assertEqual(set(assembly["scenario_names"]), set(MFG_SCENE_NAMES))
        self.assertGreaterEqual(len(assembly["capability_keys"]), 6)
        self.assertEqual(len(assembly["menu_plan"]), 12)

    def test_each_scene_resolves_registry_key(self) -> None:
        assembly = assemble_industry_pack("mfg")
        for item in assembly["modules"]:
            keys = resolve_scene_capability_keys(
                {
                    "name": item["scene_name"],
                    "pages": item.get("pages") or "",
                    "agent": item.get("key"),
                }
            )
            self.assertTrue(keys, msg=f"scene {item['scene_name']} has no keys")

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
        # 12 场景应落到专用能力（非泛化 chart/kb 顶替）
        primary = {m["capability_key"] for m in assembly["menu_plan"]}
        for required in (
            "device_repair",
            "mfg_oee",
            "quality_inspect",
            "material_issue",
            "shift_attendance",
            "maintenance_plan",
            "erp_connector",
            "energy_carbon",
            "training_record",
        ):
            self.assertIn(required, primary, msg=f"menu missing capability {required}")


if __name__ == "__main__":
    unittest.main()
