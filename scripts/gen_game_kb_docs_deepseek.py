# -*- coding: utf-8 -*-
"""DeepSeek 生成游戏娱乐双知识库示范 Markdown（真文档，走上传/索引链路）。

输出：backend/app/data/game_kb_starter/{game-faq,game-compliance}/*.md
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

OUT = ROOT / "backend" / "app" / "data" / "game_kb_starter"

DISCLAIMER = (
    "> **合规提示**：本文为游戏运营 / 客服与内容合规知识库**示范文档**，"
    "仅供培训与系统检索演示。不替代官方公告、法务签发的版号材料或平台审核政策原文。"
)

DOC_SPECS: dict[str, list[tuple[str, str, str]]] = {
    "game-faq": [
        (
            "01-赛季活动规则FAQ要点.md",
            "赛季活动规则 FAQ 要点（示范）",
            "赛季时间窗、参与条件、奖励发放口径、常见误读；与客服 FAQ 工单字段衔接；勿写特定游戏商标",
        ),
        (
            "02-掉落与概率说明检索口径.md",
            "掉落与概率说明检索口径（示范）",
            "公示原则、稀有度分层、保底说明写法、玩家异议升级路径；知识库检索字段建议",
        ),
        (
            "03-版本更新说明模板.md",
            "版本更新说明（Patch Notes）模板（示范）",
            "功能变更、平衡性调整、已知问题、回档/补偿口径；客服话术要点",
        ),
        (
            "04-充值到账异常排查SOP.md",
            "充值到账异常排查 SOP（示范）",
            "订单号核对、渠道对账、补发条件、工单关闭标准；与游戏后台对接字段",
        ),
    ],
    "game-compliance": [
        (
            "01-版号材料自检清单.md",
            "版号材料自检清单要点（示范）",
            "材料齐套检查、截图口径、年龄提示、防沉迷声明；勿编造具体审批文号全文",
        ),
        (
            "02-敏感词与UGC审核口径.md",
            "敏感词与 UGC 审核口径（示范）",
            "分级处置、人工复核触发、申诉路径、留痕字段；与内容风控系统联动",
        ),
        (
            "03-外包美术音效验收标准.md",
            "外包美术/音效验收标准（示范）",
            "交付清单、分辨率/时长规范、版权归属、验收审批节点；对接审批流字段",
        ),
        (
            "04-活动文案上线前合规检查.md",
            "活动文案上线前合规检查（示范）",
            "诱导消费表述禁忌、概率公示、未成年人保护提醒、会签闭环",
        ),
    ],
}

SYSTEM = f"""你是游戏运营与内容合规知识库撰稿人（偏 MMO/卡牌/竞技通用口径）。
输出严格 JSON：{{"markdown":"完整 Markdown 正文"}}。
要求：
1. 简体中文；专业、可检索；含二级/三级标题与要点列表。
2. 文首必须保留这段免责声明（原样）：
{DISCLAIMER}
3. 正文 800～1600 字；可含「适用场景」「操作要点」「记录字段」「与信息系统联动」「常见误区」。
4. 禁止：编造具体版号批文全文、虚假监管文号、特定游戏商标与真实玩家隐私。
5. 可引用通用公开原则（概率公示、防沉迷、UGC 审核）并标注「示范摘要」。
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
