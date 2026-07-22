# -*- coding: utf-8 -*-
"""DeepSeek 生成传统制造双知识库示范 Markdown（真文档，走上传/索引链路）。

输出：backend/app/data/mfg_kb_starter/{mfg-sop,mfg-quality}/*.md
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

OUT = ROOT / "backend" / "app" / "data" / "mfg_kb_starter"

DISCLAIMER = (
    "> **合规提示**：本文为制造现场 / 工艺与质检知识库**示范文档**，"
    "仅供培训与系统检索演示。不替代工艺员签发的作业指导书、质检规范或安环制度原文。"
)

DOC_SPECS: dict[str, list[tuple[str, str, str]]] = {
    "mfg-sop": [
        (
            "01-换型SMED检查表要点.md",
            "换型（SMED）检查表要点（示范）",
            "内外换型拆分、关键路径准备、首件确认字段、与 MES 报工衔接；勿写特定机台品牌参数",
        ),
        (
            "02-作业指导书编制规范.md",
            "作业指导书（WI）编制与受控规范（示范）",
            "受控编号、版本、关键工序步骤、安全注意、变更审批与现场张贴；信息系统检索字段建议",
        ),
        (
            "03-设备点检与开机清单.md",
            "班前点检与开机清单要点（示范）",
            "点检项分类、异常升级路径、与报修工单联动、记录留存要求",
        ),
        (
            "04-工艺卡与BOM对照说明.md",
            "工艺卡与 BOM 对照检索口径（示范）",
            "工艺路线、物料替代、图纸版本对齐、常见误用；如何用知识库检索工艺/BOM",
        ),
    ],
    "mfg-quality": [
        (
            "01-来料检验AQL要点.md",
            "来料检验 AQL 与抽样要点（示范）",
            "抽样原则、合格判定、不合格隔离、让步接收流程；勿编造具体国标文号条款全文",
        ),
        (
            "02-不合格品处理流程.md",
            "不合格品（NCR）处理流程（示范）",
            "发现→隔离→评审→返工/报废→闭环；与质检审批、追溯批次字段",
        ),
        (
            "03-安环隐患分级与上报.md",
            "安环隐患分级与上报要点（示范）",
            "隐患分级、拍照取证、整改时限、复验闭环；与巡检/上报系统联动",
        ),
        (
            "04-制程巡检与SPC关注点.md",
            "制程巡检与 SPC 关注点（示范）",
            "关键工序巡检频率、控制图异常信号、停线升级；信息系统看板指标建议",
        ),
    ],
}

SYSTEM = f"""你是 Discrete Manufacturing 工厂工艺与质量体系撰稿人。
输出严格 JSON：{{"markdown":"完整 Markdown 正文"}}。
要求：
1. 简体中文；专业、可检索；含二级/三级标题与要点列表。
2. 文首必须保留这段免责声明（原样）：
{DISCLAIMER}
3. 正文 800～1600 字；可含「适用场景」「操作要点」「记录字段」「与信息系统联动」「常见误区」。
4. 禁止：编造具体国标全文条款号、虚假认证、特定设备品牌参数表。
5. 可引用通用公开原则（SMED、AQL、NCR、SPC 概念）并标注「示范摘要」。
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
    if "合规提示" not in md:
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
