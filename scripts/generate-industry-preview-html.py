#!/usr/bin/env python3
"""生成 20 行业独立站效果预览 HTML（合并 industry_packs_all + 视觉主题）。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS, scene_count_for_pack  # noqa: E402

# 与 home/src/data/industryVisualThemes.ts 同步
VISUAL = {
    "office": {"layout": "corporate", "pattern": "grid", "motif": "🏢", "heroPitch": "集团级数字办公中枢 · 从制度问答到全流程审批"},
    "mfg": {"layout": "industrial", "pattern": "circuit", "motif": "🏭", "heroPitch": "智能制造现场 · 报修、SOP、质检、MES 一体"},
    "sales": {"layout": "bold", "pattern": "diagonal", "motif": "📈", "heroPitch": "销售增长引擎 · 话术、漏斗、合同、CRM"},
    "med": {"layout": "clinical", "pattern": "minimal", "motif": "🏥", "heroPitch": "智慧医院协同 · 指南、排班、导诊、HIS"},
    "game": {"layout": "neon", "pattern": "dots", "motif": "🎮", "heroPitch": "游戏运营中台 · 玩家 FAQ、客服、活动通知"},
    "retail": {"layout": "commerce", "pattern": "waves", "motif": "🛒", "heroPitch": "全渠道零售 · 库存、会员、促销、订单"},
    "edu": {"layout": "academic", "pattern": "grid", "motif": "🎓", "heroPitch": "智慧校园 · 课程、题库、排课、家校"},
    "finance": {"layout": "institutional", "pattern": "minimal", "motif": "💰", "heroPitch": "金融科技合规 · 风控、理财、尽调闭环"},
    "logistics": {"layout": "logistics", "pattern": "diagonal", "motif": "📦", "heroPitch": "智慧物流 · 运单、仓储、调度、签收"},
    "realestate": {"layout": "estate", "pattern": "waves", "motif": "🏠", "heroPitch": "地产全周期 · 看房、签约、物业、报修"},
    "hotel": {"layout": "hospitality", "pattern": "organic", "motif": "🏨", "heroPitch": "酒店餐饮运营 · 预订、排班、客诉、巡检"},
    "energy": {"layout": "energy", "pattern": "circuit", "motif": "⚡", "heroPitch": "能源电力运维 · 巡检、工单、能耗、安全"},
    "gov": {"layout": "civic", "pattern": "grid", "motif": "🏛", "heroPitch": "数字政务便民 · 办事指南、诉求、审批"},
    "legal": {"layout": "judicial", "pattern": "minimal", "motif": "⚖️", "heroPitch": "律所数字化 · 案件、合同、法规检索"},
    "hr": {"layout": "people", "pattern": "organic", "motif": "👥", "heroPitch": "人力资源数智化 · 招聘、绩效、培训、薪酬"},
    "marketing": {"layout": "campaign", "pattern": "diagonal", "motif": "📣", "heroPitch": "增长营销中枢 · 活动、线索、内容、投放"},
    "construction": {"layout": "blueprint", "pattern": "blueprint", "motif": "🏗", "heroPitch": "智慧工地 · 进度、安全、材料、验收"},
    "agriculture": {"layout": "organic", "pattern": "organic", "motif": "🌾", "heroPitch": "数字农业 · 溯源、巡检、补贴、产销"},
    "media": {"layout": "broadcast", "pattern": "waves", "motif": "📺", "heroPitch": "传媒内容中台 · 选题、审核、版权、分发"},
    "auto": {"layout": "motion", "pattern": "diagonal", "motif": "🚗", "heroPitch": "汽车服务数字化 · 售后、试驾、配件、工单"},
}

HIGHLIGHTS = {
    "office": ["人事财务审批知识库一站打通", "制度问答 + 请假报销主路径十分钟上线", "适合集团总部与多部门协同"],
    "mfg": ["设备报修派工 · SOP 工艺问答 · 质检审批闭环", "产线异常到保养提醒全链路", "图纸 BOM 检索 + 能耗碳排统计"],
    "sales": ["产品话术问答 · 报价折扣审批 · 销售漏斗看板", "外勤签到 + 区域分析助力一线", "合同会签与商机到期提醒"],
    "med": ["诊疗指南药品库 · 排班调班 · 不良事件上报", "患者宣教与智能导诊", "科室运营看板 + 会诊转诊"],
    "game": ["玩家 FAQ/攻略 · 客服工单 · 活动上线通知", "版号合规审查 · NPC 角色对话", "留存 ARPU 看板 + 渠道 ROI"],
    "retail": ["库存预警 · 促销审批 · 订单全渠道跟踪", "退换货工单 · 供应商对账", "陈列检查与价格变更审批"],
    "edu": ["课程排课 · 题库练习 · 家校通知", "成绩分析预警 · 在线答疑", "学费收缴与考勤统计"],
    "finance": ["合规审查 · 风控预警 · 理财智能问答", "尽调报告协同 · 授信审批", "监管报送与投后管理"],
    "logistics": ["运单跟踪 · 仓储盘点 · 车辆调度", "签收确认 · 运费结算", "路线优化与装卸排队"],
    "realestate": ["看房预约 · 签约审批 · 物业报修", "租金收缴 · 装修验收", "房源上架与业主投诉闭环"],
    "hotel": ["客房预订排房 · 排班调班 · 客诉处理", "巡检打卡 · 食材申购", "会员积分与卫生检查"],
    "energy": ["设备巡检 · 工单派发 · 能耗监测", "安全告警 · 两票管理", "应急演练与运行日志检索"],
    "gov": ["办事指南 · 诉求受理 · 在线审批", "政策问答 · 督查督办", "证照申领与政务数据看板"],
    "legal": ["案件进度管理 · 合同风险审查", "法规判例智能检索", "立案登记 · 庭审提醒"],
    "hr": ["招聘面试 · 绩效评估 · 培训计划", "薪酬核算 · 入离职办理", "人才盘点与员工自助问答"],
    "marketing": ["活动策划审批 · 线索智能分配", "内容合规审核 · 投放分析", "竞品监测与效果复盘"],
    "construction": ["进度日报 · 安全检查 · 材料申购", "分项验收电子签字 · 图纸变更", "劳务考勤与竣工归档"],
    "agriculture": ["产销全程溯源 · 田间巡检", "补贴在线申报 · 气象预警", "病虫害识别与合作社管理"],
    "media": ["选题策划 · 内容多级审核", "版权登记授权 · 分发排期", "舆情监测与阅读量分析"],
    "auto": ["试驾预约 · 售后维修工单", "保养到期提醒 · 事故报案引导", "门店客流与延保推介"],
}

def build_payload() -> list[dict]:
    out = []
    for pack in ALL_INDUSTRY_PACKS:
        key = pack["key"]
        vis = VISUAL.get(key, VISUAL["office"])
        scenes = pack.get("scenes") or []
        total = scene_count_for_pack(key)
        out.append({
            "key": key,
            "name": pack["name"],
            "icon": pack.get("icon", "📦"),
            "color": pack.get("color", "#6366f1"),
            "tagline": pack.get("tagline", ""),
            "total": total,
            "layout": vis["layout"],
            "pattern": vis["pattern"],
            "motif": vis["motif"],
            "heroPitch": vis["heroPitch"],
            "highlights": HIGHLIGHTS.get(key, []),
            "scenes": [{"name": s["name"], "problem": s["problem"], "agent": s.get("agent", "")} for s in scenes[:6]],
        })
    return out

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>积木仓 · 20 行业独立站效果预览（合并版）</title>
<style>
:root{--pri:#0d47a1;--accent:#00b894;--bg:#e8edf3;--card:#fff;--text:#1e293b;--muted:#64748b;--border:#dbeafe}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.55}
.chrome{position:sticky;top:0;z-index:100;background:#0f172a;color:#e2e8f0;padding:14px 20px;box-shadow:0 4px 24px rgba(0,0,0,.2)}
.chrome h1{font-size:16px;margin-bottom:6px}
.chrome p{font-size:12px;opacity:.8;margin-bottom:10px;max-width:900px}
.nav{display:flex;flex-wrap:wrap;gap:6px;max-height:120px;overflow-y:auto}
.nav a{font-size:11px;padding:5px 10px;border-radius:999px;background:#334155;color:#e2e8f0;text-decoration:none}
.nav a:hover,.nav a.on{background:linear-gradient(135deg,#0d47a1,#1976d2)}
.wrap{max-width:1100px;margin:0 auto;padding:20px 16px 60px}
.note{background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:12px 14px;font-size:12px;margin-bottom:20px;line-height:1.7}
.ind-block{margin-bottom:48px;scroll-margin-top:140px}
.ind-label{font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px;letter-spacing:.05em}
.ind-frame{border-radius:16px;overflow:hidden;box-shadow:0 16px 48px rgba(13,71,161,.12);border:1px solid var(--border);background:var(--card)}
.ind-meta{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#1e293b;color:#94a3b8;font-size:11px}
.ind-meta a{color:#67e8f9;text-decoration:none;font-weight:600}
.ind-page{--accent:var(--ind-color);background:#f9fafb}
.ind-hero{position:relative;padding:36px 28px 32px;color:#fff;background-size:cover;background-position:center;overflow:hidden}
.ind-hero::before{content:'';position:absolute;inset:0;opacity:.35;pointer-events:none}
.ind-page.pattern-grid .ind-hero::before{background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:28px 28px}
.ind-page.pattern-circuit .ind-hero::before{background-image:radial-gradient(circle at 20% 30%,rgba(255,255,255,.12) 0 2px,transparent 3px);background-size:48px 48px}
.ind-page.pattern-dots .ind-hero::before{background-image:radial-gradient(rgba(255,255,255,.14) 1px,transparent 1px);background-size:16px 16px}
.ind-page.pattern-diagonal .ind-hero::before{background:repeating-linear-gradient(-45deg,transparent,transparent 12px,rgba(255,255,255,.05) 12px,rgba(255,255,255,.05) 24px)}
.ind-page.pattern-waves .ind-hero::before{background:radial-gradient(ellipse 80% 50% at 50% 120%,rgba(255,255,255,.15),transparent 60%)}
.ind-page.pattern-blueprint .ind-hero::before{background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:20px 20px}
.ind-page.pattern-organic .ind-hero::before{background:radial-gradient(circle at 10% 20%,rgba(255,255,255,.12),transparent 40%)}
.ind-page.pattern-minimal .ind-hero::before{opacity:.15}
.ind-hero-inner{position:relative;z-index:1;max-width:720px}
.ind-badge{display:inline-block;font-size:10px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);margin-bottom:8px}
.ind-hero h2{font-size:26px;font-weight:800;margin-bottom:8px}
.ind-hero p{font-size:14px;opacity:.92;line-height:1.6}
.ind-motif{position:absolute;right:24px;top:20px;font-size:64px;opacity:.2}
.ind-stats{display:flex;flex-wrap:wrap;gap:20px;margin-top:18px}
.ind-stats div strong{display:block;font-size:22px}
.ind-stats div span{font-size:11px;opacity:.85}
.ind-body{padding:24px 28px 28px}
.ind-body h3{font-size:15px;color:var(--ind-color);margin-bottom:10px}
.ind-body ul{margin:0 0 16px 18px;font-size:13px;color:var(--muted)}
.ind-body li{margin-bottom:4px}
.ind-scenes{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.ind-scene{border:1px solid var(--border);border-radius:10px;padding:12px;font-size:12px;background:#fff}
.ind-scene strong{display:block;margin-bottom:4px;color:var(--text)}
.ind-scene em{font-size:10px;color:var(--muted);font-style:normal}
.layout-corporate .ind-hero-inner{text-align:center;margin:0 auto}
.layout-corporate .ind-stats{justify-content:center}
.layout-industrial .ind-hero{border-left:6px solid rgba(255,255,255,.5)}
.layout-bold .ind-hero{clip-path:polygon(0 0,100% 0,100% 92%,0 100%)}
.layout-neon .ind-frame{box-shadow:0 0 40px color-mix(in srgb,var(--ind-color) 35%,transparent)}
.layout-hospitality .ind-hero{border-radius:0 0 28px 28px}
.layout-blueprint .ind-body{border-top:1px dashed color-mix(in srgb,var(--ind-color) 40%,#cbd5e1)}
.layout-motion .ind-hero{border-bottom:3px solid rgba(255,255,255,.35)}
.footer{text-align:center;font-size:12px;color:var(--muted);padding:24px}
</style>
</head>
<body>
<header class="chrome">
  <h1>积木仓 BlockHub · 20 行业独立站效果预览</h1>
  <p>合并现有 Catalog 场景数据 + 20 套差异化视觉主题（layout / pattern / hero）。线上路由 <code>/industry/:key</code> 已接入相同主题类名。豆包对话设计参考：<a href="https://www.doubao.com/thread/xbda891e4f55583ed89e33a97412bf64d" style="color:#67e8f9">对话链接</a>（需登录查看原稿，本页按项目数据落地）。</p>
  <nav class="nav" id="nav"></nav>
</header>
<div class="wrap">
  <div class="note">
    <strong>使用说明：</strong>下方每块为一套行业独立站迷你效果（Hero + 亮点 + 场景卡片）。
    启动 Home <code>npm run dev</code> 后访问 <code>http://localhost:5173/industry/mfg</code> 等查看完整页（含 10 套模板 Gallery + API 场景清单）。
  </div>
  <div id="root"></div>
</div>
<footer class="footer">生成于脚本 generate-industry-preview-html.py · 数据来自 industry_packs_all.py</footer>
<script>
const DATA = __DATA_JSON__;
const root = document.getElementById('root');
const nav = document.getElementById('nav');
DATA.forEach((ind, i) => {
  const a = document.createElement('a');
  a.href = '#ind-' + ind.key;
  a.textContent = ind.icon + ' ' + ind.name;
  if (i === 0) a.classList.add('on');
  nav.appendChild(a);
});
root.innerHTML = DATA.map(ind => {
  const grad = `linear-gradient(105deg, color-mix(in srgb, ${ind.color} 88%, #0f172a) 0%, #0f172a 60%)`;
  const scenes = ind.scenes.map(s => `<div class="ind-scene"><strong>${s.name}</strong><em>${s.problem}</em></div>`).join('');
  const hl = ind.highlights.map(h => `<li>${h}</li>`).join('');
  return `<section class="ind-block" id="ind-${ind.key}">
    <div class="ind-label">${ind.layout.toUpperCase()} · pattern-${ind.pattern} · ${ind.total} 场景</div>
    <div class="ind-frame">
      <div class="ind-meta"><span>${ind.key} · ${ind.name}</span><a href="/industry/${ind.key}" target="_blank">打开线上页 →</a></div>
      <div class="ind-page layout-${ind.layout} pattern-${ind.pattern}" style="--ind-color:${ind.color}">
        <div class="ind-hero" style="background-image:${grad}">
          <span class="ind-motif">${ind.motif}</span>
          <div class="ind-hero-inner">
            <span class="ind-badge">独立方案站 · 深度包 · ${ind.total} 场景</span>
            <h2>${ind.name}</h2>
            <p>${ind.heroPitch || ind.tagline}</p>
            <div class="ind-stats">
              <div><strong>${ind.total}</strong><span>业务场景</span></div>
              <div><strong>5</strong><span>端交付</span></div>
              <div><strong>AI</strong><span>大模型方案</span></div>
            </div>
          </div>
        </div>
        <div class="ind-body">
          <h3>方案亮点</h3>
          <ul>${hl}</ul>
          <h3>精选场景（前 6 项）</h3>
          <div class="ind-scenes">${scenes || '<p style="color:#94a3b8">办公场景见 Catalog 办公包</p>'}</div>
        </div>
      </div>
    </div>
  </section>`;
}).join('');
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const id = e.target.id.replace('ind-', '');
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#ind-' + id));
  });
}, { rootMargin: '-40% 0px -50% 0px' });
document.querySelectorAll('.ind-block').forEach(el => obs.observe(el));
</script>
</body>
</html>
"""

def main() -> None:
    data = build_payload()
    html = HTML_TEMPLATE.replace("__DATA_JSON__", json.dumps(data, ensure_ascii=False))
    out = ROOT / "docs" / "previews" / "20行业独立站效果预览.html"
    out.write_text(html, encoding="utf-8")
    print(f"Wrote {out} ({len(data)} industries)")


if __name__ == "__main__":
    main()
