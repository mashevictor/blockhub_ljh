#!/usr/bin/env python3
"""生成 20 行业独立站效果预览 HTML（合并 industry_packs_all + 视觉主题）。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS, scene_count_for_pack  # noqa: E402

# 与 home/src/data/industryStylePacks.ts 同步
STYLE_PACK = {
    "office": "classic", "gov": "classic",
    "mfg": "industrial", "construction": "industrial",
    "sales": "velocity", "marketing": "velocity",
    "med": "serenity", "hotel": "serenity",
    "game": "cyber",
    "retail": "market", "agriculture": "market",
    "edu": "campus",
    "finance": "vault", "legal": "vault",
    "logistics": "freight", "auto": "freight",
    "realestate": "horizon", "energy": "horizon",
    "hr": "people",
    "media": "broadcast",
}

PACK_LABEL = {
    "classic": "经典商务", "industrial": "工业钢铁", "velocity": "增长斜切",
    "serenity": "清新医疗", "cyber": "赛博霓虹", "market": "商超暖色",
    "campus": "学院蓝条", "vault": "金融金库", "freight": "物流干线",
    "horizon": "地平线分栏", "people": "人力 bento", "broadcast": "传媒波段",
}

HERO_VARIANT = {
    "classic": "centered", "industrial": "split-left", "velocity": "stacked-dark",
    "serenity": "soft-card", "cyber": "stacked-dark", "market": "soft-card",
    "campus": "centered", "vault": "split-left", "freight": "minimal-bar",
    "horizon": "split-right", "people": "soft-card", "broadcast": "stacked-dark",
}
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
    for industry_pack in ALL_INDUSTRY_PACKS:
        key = industry_pack["key"]
        vis = VISUAL.get(key, VISUAL["office"])
        style_pack = STYLE_PACK.get(key, "classic")
        scenes = industry_pack.get("scenes") or []
        total = scene_count_for_pack(key)
        out.append({
            "key": key,
            "name": industry_pack["name"],
            "icon": industry_pack.get("icon", "📦"),
            "color": industry_pack.get("color", "#6366f1"),
            "tagline": industry_pack.get("tagline", ""),
            "total": total,
            "stylePack": style_pack,
            "styleLabel": PACK_LABEL.get(style_pack, style_pack),
            "heroVariant": HERO_VARIANT.get(style_pack, "centered"),
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
<title>积木仓 · 20 行业独立站效果预览（12 套样式包）</title>
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
/* ── 12 套样式包（与 industry-style-packs.css 对齐）── */
.pack-classic{background:linear-gradient(180deg,#f4f7fb,#fff)}
.pack-classic .ind-body{background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(13,71,161,.08);margin:16px;border:1px solid #dbeafe}
.pack-classic .ind-scene{border-left:4px solid var(--ind-color)}
.pack-industrial{background:#0f1419;color:#e2e8f0}
.pack-industrial .ind-body{background:#1a2332;border:1px solid #334155;color:#e2e8f0}
.pack-industrial .ind-scene{background:#141c28;border:1px solid #334155;border-radius:2px}
.pack-industrial .ind-stats strong{color:#fbbf24;font-family:monospace}
.pack-velocity{background:#1a0a0a;color:#fecaca}
.pack-velocity .ind-hero{clip-path:polygon(0 0,100% 0,100% 88%,0 100%)}
.pack-velocity .ind-body{background:#2a1515;border-top:3px solid #ef4444;transform:skewX(-1deg);color:#fecaca}
.pack-velocity .ind-scene{background:#2a1515;border-top:3px solid #ef4444;border-radius:0}
.pack-serenity{background:linear-gradient(180deg,#f0fdf4,#fff)}
.pack-serenity .ind-hero{border-radius:0 0 40px 40px}
.pack-serenity .ind-body{border-radius:24px;box-shadow:0 4px 24px rgba(16,185,129,.1);border:1px solid #a7f3d0}
.pack-serenity .ind-scene{border-radius:20px;border:1px solid #a7f3d0}
.pack-cyber{background:#0c0a14;color:#e9d5ff}
.pack-cyber .ind-frame{box-shadow:0 0 40px color-mix(in srgb,var(--ind-color) 40%,transparent)}
.pack-cyber .ind-body{background:rgba(30,20,50,.75);border:1px solid rgba(168,85,247,.35);color:#e9d5ff}
.pack-cyber .ind-scene{background:rgba(40,25,65,.8);border:1px solid #7c3aed}
.pack-market{background:#fff7ed}
.pack-market .ind-stats div{background:#fff;border:2px solid #fed7aa;border-radius:14px;padding:10px 16px}
.pack-market .ind-scene{text-align:center;border-radius:16px;background:linear-gradient(180deg,#fff,#fff7ed);border:1px solid #fdba74}
.pack-campus{background:#eff6ff;background-image:repeating-linear-gradient(90deg,transparent,transparent 48px,rgba(37,99,235,.04) 48px,rgba(37,99,235,.04) 49px)}
.pack-campus .ind-body h3{border-left:6px solid var(--ind-color);padding-left:12px}
.pack-campus .ind-scene{border-left:5px solid #2563eb;border-radius:6px}
.pack-vault{background:#0c1929;color:#cbd5e1}
.pack-vault .ind-body{background:#0f2137;border-top:3px solid #d4af37;color:#e2e8f0}
.pack-vault .ind-stats strong{color:#d4af37}
.pack-vault .ind-scene{background:#0f2137;border:1px solid #334155}
.pack-freight{background:#fffbeb}
.pack-freight .ind-hero{border-bottom:4px dashed #ca8a04;border-radius:0}
.pack-freight .ind-body{border:2px dashed #ca8a04;border-radius:8px}
.pack-freight .ind-scenes{display:flex;flex-direction:column}
.pack-freight .ind-scene{border-left:6px solid #ca8a04;display:grid;grid-template-columns:1fr auto;gap:8px}
.pack-horizon{background:#fafaf9}
.pack-horizon .ind-scenes{grid-template-columns:repeat(2,1fr)}
.pack-horizon .ind-scene{min-height:100px;border-radius:16px;background:linear-gradient(135deg,#fff 60%,color-mix(in srgb,var(--ind-color) 8%,#fff))}
.pack-people{background:linear-gradient(160deg,#faf5ff,#fff)}
.pack-people .ind-body{border-radius:28px;border:2px solid #e9d5ff}
.pack-people ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;list-style:none;margin-left:0}
.pack-people ul li{background:#f3e8ff;border:1px solid #d8b4fe;border-radius:14px;padding:10px 12px}
.pack-people .ind-scenes{grid-template-columns:repeat(3,1fr)}
.pack-people .ind-scene{text-align:center;border-radius:20px;border:2px solid #e9d5ff}
.pack-broadcast{background:#1a0a1a;color:#fce7f3}
.pack-broadcast .ind-body{background:rgba(60,20,60,.6);border:1px solid #ec4899;color:#fce7f3}
.pack-broadcast .ind-hero::after{content:'';position:absolute;left:0;right:0;bottom:0;height:6px;background:repeating-linear-gradient(90deg,#ec4899,#ec4899 20px,#d946ef 20px,#d946ef 40px)}
.pack-broadcast .ind-scene{border-left:4px solid #ec4899;border-radius:0 12px 12px 0;background:rgba(80,25,80,.5)}
.hero-centered .ind-hero-inner{text-align:center;margin:0 auto}
.hero-centered .ind-stats{justify-content:center}
.hero-split-left .ind-hero-inner{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;max-width:900px}
.hero-split-right .ind-hero-inner{display:grid;grid-template-columns:.8fr 1.2fr;gap:20px;max-width:900px}
.hero-split-right .ind-motif{left:24px;right:auto}
.hero-stacked-dark .ind-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.hero-stacked-dark .ind-stats div{background:rgba(0,0,0,.35);border-radius:10px;padding:10px;text-align:center}
.hero-soft-card .ind-hero-inner{background:rgba(255,255,255,.14);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.22);border-radius:18px;padding:20px}
.hero-minimal-bar .ind-hero-inner{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.hero-minimal-bar .ind-motif{position:static;font-size:40px;opacity:.5}
.footer{text-align:center;font-size:12px;color:var(--muted);padding:24px}
</style>
</head>
<body>
<header class="chrome">
  <h1>积木仓 BlockHub · 20 行业独立站效果预览</h1>
  <p>20 个行业映射到 <strong>12 套整页样式包</strong>（classic / industrial / velocity / serenity / cyber / market / campus / vault / freight / horizon / people / broadcast），每套含不同 Hero 结构 + 面板/场景/CTA 形态。线上 <code>/industry/:key</code> 已接入 <code>industry-site--pack-*</code> 类名。</p>
  <nav class="nav" id="nav"></nav>
</header>
<div class="wrap">
  <div class="note">
    <strong>使用说明：</strong>下方每块为一套行业独立站迷你效果，背景/面板/场景布局随 12 套样式包变化。
    启动 Home <code>npm run dev</code> 后访问 <code>http://localhost:5173/industry/mfg</code>、<code>/industry/game</code>、<code>/industry/finance</code> 等对比整页差异。
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
    <div class="ind-label">PACK · ${ind.styleLabel} (${ind.stylePack}) · hero-${ind.heroVariant} · ${ind.total} 场景</div>
    <div class="ind-frame">
      <div class="ind-meta"><span>${ind.key} · ${ind.name}</span><a href="/industry/${ind.key}" target="_blank">打开线上页 →</a></div>
      <div class="ind-page pack-${ind.stylePack} hero-${ind.heroVariant} pattern-${ind.pattern}" style="--ind-color:${ind.color}">
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
