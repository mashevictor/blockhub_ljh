"""金融行业新闻源适配器：Demo / Tushare / 公开中文列表。"""

from __future__ import annotations

import hashlib
import json
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol

VERTICALS = frozenset({"bank", "securities", "insurance", "fund", "fintech"})
SCOPES = frozenset({"macro_cn", "macro_global", "micro"})
PROVIDERS = frozenset({"tushare", "public_cn"})


@dataclass
class NewsDraft:
    vertical: str
    scope: str
    title: str
    summary: str
    body: str = ""
    symbols: list[dict[str, Any]] = field(default_factory=list)
    source: str = "demo"
    external_id: str = ""
    heat: int = 0
    published_at: datetime | None = None


class NewsSourceAdapter(Protocol):
    name: str

    def fetch(self, *, vertical: str, limit: int = 30) -> list[NewsDraft]:
        ...


# ── Demo 样本（显式 seed；按垂直差异化）──────────────────────────────

_DEMO_BASE: dict[str, list[dict[str, Any]]] = {
    "bank": [
        {
            "scope": "macro_cn",
            "title": "央行强调结构性货币政策工具精准滴灌",
            "summary": "监管会议强调对先进制造与小微企业的定向支持，银行信贷结构持续优化。",
            "symbols": [{"code": "601398.SH", "name": "工行", "chg": "+0.6%"}],
            "heat": 92,
        },
        {
            "scope": "macro_global",
            "title": "美联储议息预期扰动跨境资金流",
            "summary": "境外利率路径不明朗，银行外汇与跨境人民币业务波动加大。",
            "symbols": [],
            "heat": 78,
        },
        {
            "scope": "micro",
            "title": "某股份制银行上调普惠贷款风险拨备",
            "summary": "机构关注零售信贷资产质量与核销节奏，短期利润增速或放缓。",
            "symbols": [{"code": "600036.SH", "name": "招行", "chg": "-0.8%"}],
            "heat": 85,
        },
        {
            "scope": "macro_cn",
            "title": "银保监会：强化对公账户开户尽职调查",
            "summary": "开户 KYC 与受益所有人识别要求再收紧，银行合规投入将上升。",
            "symbols": [],
            "heat": 88,
        },
    ],
    "securities": [
        {
            "scope": "macro_cn",
            "title": "交易所完善适当性管理与投资者保护细则",
            "summary": "开户适当性评估、风险揭示与产品匹配要求进一步细化。",
            "symbols": [{"code": "600030.SH", "name": "中信证券", "chg": "+1.2%"}],
            "heat": 90,
        },
        {
            "scope": "macro_global",
            "title": "全球风险偏好回升带动港股通成交活跃",
            "summary": "券商经纪与两融余额边际改善，投行承销节奏仍偏谨慎。",
            "symbols": [],
            "heat": 76,
        },
        {
            "scope": "micro",
            "title": "某券商发布新能源产业链周报",
            "summary": "机构热议上游供给与中游排产；报告强调估值分化。",
            "symbols": [{"code": "300750.SZ", "name": "宁德时代", "chg": "+2.1%"}],
            "heat": 94,
        },
        {
            "scope": "micro",
            "title": "投行项目：某拟上市公司反馈意见更新",
            "summary": "反馈聚焦关联交易与收入确认，尽调补件窗口拉长。",
            "symbols": [],
            "heat": 70,
        },
    ],
    "insurance": [
        {
            "scope": "macro_cn",
            "title": "偿二代二期规则落地观察：资本充足率分化",
            "summary": "寿险与财险公司资本策略差异扩大，再保安排受关注。",
            "symbols": [{"code": "601318.SH", "name": "中国平安", "chg": "+0.4%"}],
            "heat": 89,
        },
        {
            "scope": "macro_global",
            "title": "全球巨灾再保费率继续高位",
            "summary": "自然灾害损失推高再保成本，境内财险定价承压。",
            "symbols": [],
            "heat": 72,
        },
        {
            "scope": "micro",
            "title": "某寿险公司优化重疾核保规则",
            "summary": "智能核保覆盖面扩大，理赔时效指标纳入考核。",
            "symbols": [{"code": "601628.SH", "name": "中国人寿", "chg": "-0.3%"}],
            "heat": 81,
        },
    ],
    "fund": [
        {
            "scope": "macro_cn",
            "title": "公募基金信息披露与持仓披露节奏调整",
            "summary": "监管强调净值波动说明与投资者教育同步加强。",
            "symbols": [],
            "heat": 86,
        },
        {
            "scope": "macro_global",
            "title": "全球被动资金持续流入新兴市场 ETF",
            "summary": "境内 QDII 额度与海外配置需求升温，汇率对冲成本抬升。",
            "symbols": [],
            "heat": 74,
        },
        {
            "scope": "micro",
            "title": "某头部权益基金经理季度观点：聚焦红利与科技",
            "summary": "机构热议估值性价比；投后跟踪强调基本面验证。",
            "symbols": [{"code": "510300.SH", "name": "沪深300ETF", "chg": "+0.9%"}],
            "heat": 93,
        },
    ],
    "fintech": [
        {
            "scope": "macro_cn",
            "title": "消金与互联网贷款监管：联合贷出资比例再强调",
            "summary": "助贷模式合规边界清晰化，风控模型可解释性要求提高。",
            "symbols": [],
            "heat": 91,
        },
        {
            "scope": "macro_global",
            "title": "海外支付巨头加码亚太开放银行接口",
            "summary": "跨境收单与数字钱包互通试点增多，合规与数据本地化并行。",
            "symbols": [],
            "heat": 69,
        },
        {
            "scope": "micro",
            "title": "某消金公司升级反欺诈规则引擎",
            "summary": "多头借贷与设备指纹特征加权，贷后催收策略分层。",
            "symbols": [],
            "heat": 84,
        },
        {
            "scope": "micro",
            "title": "监管通报：规范营销话术与征信授权",
            "summary": "消金展业需强化知情同意与投诉闭环。",
            "symbols": [],
            "heat": 80,
        },
    ],
}


class DemoAdapter:
    name = "demo"

    def fetch(self, *, vertical: str, limit: int = 30) -> list[NewsDraft]:
        v = vertical if vertical in VERTICALS else "bank"
        rows = _DEMO_BASE.get(v, _DEMO_BASE["bank"])[:limit]
        now = datetime.now(timezone.utc)
        out: list[NewsDraft] = []
        for i, r in enumerate(rows):
            ext = f"demo-{v}-{r['scope']}-{i}"
            out.append(
                NewsDraft(
                    vertical=v,
                    scope=str(r["scope"]),
                    title=str(r["title"]),
                    summary=str(r["summary"]),
                    body=str(r.get("body") or r["summary"]),
                    symbols=list(r.get("symbols") or []),
                    source="demo",
                    external_id=ext,
                    heat=int(r.get("heat") or 0),
                    published_at=now,
                )
            )
        return out


class TushareAdapter:
    """Tushare Pro：无权限时返回可读错误（常见 40203）。"""

    name = "tushare"

    def __init__(self, token: str) -> None:
        self.token = (token or "").strip()

    def fetch(self, *, vertical: str, limit: int = 30) -> list[NewsDraft]:
        if not self.token:
            raise RuntimeError("未配置 Tushare Token。请在「接入真源」中填写，或设置环境变量 TUSHARE_TOKEN。")
        # news 接口需相应积分权限；无权限时 API 返回 code!=0
        payload = json.dumps(
            {
                "api_name": "news",
                "token": self.token,
                "params": {"src": "sina", "start_date": "", "end_date": ""},
                "fields": "datetime,content,title,channels",
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            "http://api.tushare.pro",
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "BlockHub-FinanceNews/1.0"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"Tushare HTTP 错误: {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise RuntimeError(f"Tushare 网络失败: {exc}") from exc

        code = data.get("code")
        if code not in (0, "0", None):
            msg = str(data.get("msg") or data.get("message") or "未知错误")
            raise RuntimeError(f"Tushare 接口拒绝（code={code}）：{msg}。请确认积分/权限，或改用 public_cn 公开源。")

        fields = data.get("data", {}).get("fields") or []
        items = data.get("data", {}).get("items") or []
        if not fields or not items:
            raise RuntimeError("Tushare 返回空数据（可能无权限或时段无新闻）。")

        idx = {name: i for i, name in enumerate(fields)}
        v = vertical if vertical in VERTICALS else "bank"
        out: list[NewsDraft] = []
        for row in items[:limit]:
            title = str(row[idx["title"]] if "title" in idx else "")[:300]
            content = str(row[idx["content"]] if "content" in idx else "")
            dt_raw = str(row[idx["datetime"]] if "datetime" in idx else "")
            if not title and content:
                title = content[:80]
            if not title:
                continue
            digest = hashlib.sha1(f"{dt_raw}|{title}".encode("utf-8")).hexdigest()[:20]
            published = None
            if dt_raw:
                try:
                    published = datetime.fromisoformat(dt_raw.replace(" ", "T")).replace(tzinfo=timezone.utc)
                except ValueError:
                    published = datetime.now(timezone.utc)
            out.append(
                NewsDraft(
                    vertical=v,
                    scope="macro_cn",
                    title=title,
                    summary=(content or title)[:400],
                    body=content[:4000],
                    symbols=[],
                    source="tushare",
                    external_id=f"ts-{digest}",
                    heat=50,
                    published_at=published or datetime.now(timezone.utc),
                )
            )
        if not out:
            raise RuntimeError("Tushare 解析后无有效新闻条目。")
        return out


class PublicCnAdapter:
    """东方财富财经要闻公开列表（无 key；非官方授权行情，仅作兜底）。"""

    name = "public_cn"

    def fetch(self, *, vertical: str, limit: int = 30) -> list[NewsDraft]:
        # 财经要闻分页接口（公开）
        url = (
            "https://np-listapi.eastmoney.com/comm/web/getNewsByColumns"
            "?client=web&biz=web_news_col"
            "&column=350&order=1&needInteractData=0&page_index=1"
            f"&page_size={min(limit, 20)}&req_trace=blockhub"
        )
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; BlockHubFinanceNews/1.0)",
                "Accept": "application/json",
            },
            method="GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                data = json.loads(raw)
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"公开源 HTTP 错误: {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"公开源拉取失败: {exc}") from exc

        # 兼容多种字段结构
        list_data = (
            (data.get("data") or {}).get("list")
            or (data.get("data") or {}).get("items")
            or data.get("list")
            or []
        )
        if not list_data:
            raise RuntimeError("公开源返回空列表（可能被限频或接口变更）。")

        v = vertical if vertical in VERTICALS else "bank"
        out: list[NewsDraft] = []
        for i, item in enumerate(list_data[:limit]):
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or item.get("Title") or "")[:300]
            summary = str(item.get("digest") or item.get("summary") or item.get("Digest") or title)[:500]
            code = str(item.get("code") or item.get("artcode") or item.get("url") or i)
            if not title:
                continue
            digest = hashlib.sha1(f"{code}|{title}".encode("utf-8")).hexdigest()[:20]
            out.append(
                NewsDraft(
                    vertical=v,
                    scope="macro_cn" if i % 3 else ("micro" if i % 2 else "macro_global"),
                    title=title,
                    summary=summary,
                    body=summary,
                    symbols=[],
                    source="public_cn",
                    external_id=f"em-{digest}",
                    heat=max(40, 95 - i * 3),
                    published_at=datetime.now(timezone.utc),
                )
            )
        if not out:
            raise RuntimeError("公开源解析后无有效条目。")
        return out


def resolve_adapter(provider: str, token: str = "") -> NewsSourceAdapter:
    p = (provider or "").strip().lower()
    if p == "tushare":
        return TushareAdapter(token)
    if p == "public_cn":
        return PublicCnAdapter()
    if p == "demo":
        return DemoAdapter()
    raise ValueError(f"不支持的新闻源: {provider}（可选 tushare / public_cn）")
