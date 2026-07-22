# -*- coding: utf-8 -*-
"""DeepSeek 生成医疗行业双知识库示范 Markdown（真文档，走上传/索引链路）。

输出：backend/app/data/med_kb_starter/{med-guidelines,med-pharma-sop}/*.md
每篇含合规免责声明；禁止诊疗结论/处方建议，仅作院内制度与检索示范。
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

os.environ.setdefault("DEEPSEEK_TIMEOUT", "180")

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

_env = ROOT / "backend" / ".env"
if _env.is_file():
    for line in _env.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k:
            os.environ.setdefault(k, v)

from importlib import reload  # noqa: E402

import app.core.config as _cfg  # noqa: E402

reload(_cfg)
from app.services.deepseek_client import deepseek_json_chat  # noqa: E402

OUT = ROOT / "backend" / "app" / "data" / "med_kb_starter"

DISCLAIMER = (
    "> **合规提示**：本文为医院信息管理 / 护理与药学知识库**示范文档**，"
    "仅供培训与系统检索演示。不构成诊疗建议，不替代执业医师、药师或护士的专业判断与书面制度。"
)

# slug → [(filename, title, focus)]
DOC_SPECS: dict[str, list[tuple[str, str, str]]] = {
    "med-guidelines": [
        (
            "01-急诊分诊ESI要点.md",
            "急诊分诊 ESI 分级要点（示范）",
            "ESI 1-5 级判定要点、红旗症状、分诊记录字段、与预问诊系统衔接注意点",
        ),
        (
            "02-抗菌药物合理使用摘要.md",
            "抗菌药物合理使用要点摘要（示范）",
            "经验性用药原则、围术期预防、特殊人群注意、会诊指征、禁忌与监测（勿写具体处方剂量表）",
        ),
        (
            "03-检验危急值处置路径.md",
            "检验危急值报告与处置路径（示范）",
            "危急值定义示例、报告时限、通知闭环、复核与记录、信息系统待办联动",
        ),
        (
            "04-临床路径与MDT协作要点.md",
            "临床路径与 MDT 多学科协作要点（示范）",
            "路径纳入/退出、变异记录、MDT 会诊申请要素、结论归档与随访",
        ),
    ],
    "med-pharma-sop": [
        (
            "01-高警示药品核对SOP.md",
            "高警示药品核对与给药 SOP（示范）",
            "高警示药品清单原则、双人核对、给药前五对、异常上报、信息系统提示",
        ),
        (
            "02-静脉输液与PICC护理要点.md",
            "静脉输液与 PICC 护理操作要点（示范）",
            "输液评估、冲管封管原则、感染防控、并发症观察与上报（勿写厂家特定器械参数）",
        ),
        (
            "03-院感手卫生与隔离要点.md",
            "医院感染：手卫生与隔离要点（示范）",
            "WHO 手卫生五时刻、接触隔离/飞沫隔离要点、环境物表、职业暴露报告",
        ),
        (
            "04-常用药品说明书检索口径.md",
            "常用药品说明书检索口径与禁忌提示（示范）",
            "如何阅读说明书章节、相互作用关注点、孕妇/肝肾功能不全提示、药师审核要点（勿编造具体商品名剂量）",
        ),
    ],
}

SYSTEM = f"""你是三甲医院医务处与护理部联合的知识库撰稿人。
输出严格 JSON：{{"markdown":"完整 Markdown 正文"}}。
要求：
1. 简体中文；专业、可检索；含二级/三级标题、要点列表、表格（如适用）。
2. 文首必须保留这段免责声明（原样）：
{DISCLAIMER}
3. 正文 800～1600 字；可含「适用场景」「操作要点」「记录字段」「与信息系统联动」「常见误区」。
4. 禁止：具体处方剂量表、包治百病、未证实疗法、编造指南文号/文献 DOI。
5. 可引用通用公开原则（如 ESI、抗菌药物管理理念、手卫生五时刻），标注「示范摘要」。
6. markdown 字段内用 \\n 换行，不要包在代码围栏里。
"""


def _slugify_ok(name: str) -> bool:
    return bool(re.match(r"^[\w\-\u4e00-\u9fff]+\.md$", name))


def gen_one(title: str, focus: str) -> str | None:
    user = f"文档标题：{title}\n撰写重点：{focus}\n请生成 markdown 正文。"
    data = deepseek_json_chat(SYSTEM, user, temperature=0.35)
    if not data or not isinstance(data.get("markdown"), str):
        return None
    md = data["markdown"].strip()
    if DISCLAIMER.split("**")[1] not in md and "合规提示" not in md:
        md = DISCLAIMER + "\n\n" + md
    if not md.startswith("#"):
        md = f"# {title}\n\n{md}"
    return md


def main() -> int:
    if not os.environ.get("DEEPSEEK_API_KEY") and not _cfg.settings.deepseek_api_key:
        print("ERROR: 无 DEEPSEEK_API_KEY", file=sys.stderr)
        return 1

    written: list[str] = []
    failed: list[str] = []
    for slug, specs in DOC_SPECS.items():
        dest = OUT / slug
        dest.mkdir(parents=True, exist_ok=True)
        meta = {"slug": slug, "docs": []}
        for filename, title, focus in specs:
            if not _slugify_ok(filename):
                failed.append(filename)
                continue
            print(f"… DeepSeek 生成 {slug}/{filename}")
            md = gen_one(title, focus)
            if not md:
                failed.append(f"{slug}/{filename}")
                print(f"  FAIL {filename}")
                continue
            path = dest / filename
            path.write_text(md + ("\n" if not md.endswith("\n") else ""), encoding="utf-8")
            written.append(str(path.relative_to(ROOT)))
            meta["docs"].append({"file": filename, "title": title, "chars": len(md)})
            print(f"  OK {len(md)} chars → {path}")
        (dest / "_manifest.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print(json.dumps({"written": len(written), "failed": failed, "files": written}, ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
