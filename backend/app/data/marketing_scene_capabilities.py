"""市场营销 场景 → 真能力 SSOT（DeepSeek 丰富）。"""

from __future__ import annotations

SCENES: list[dict] = [
    {
        "name": "线索分配",
        "category": "线索获客",
        "capability_key": "sales_lead",
        "page_kind": "form_list",
        "problem": "销售线索手动分配效率低、易遗漏，系统按规则自动分配并跟踪处理状态。",
        "default_category": "lead-assignment",
        "form_headline": "线索分配规则",
        "fields": [
            {
                "key": "title",
                "label": "规则名称",
                "type": "text",
                "placeholder": "如：高意向线索优先",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "分配方式",
                "type": "text",
                "placeholder": "如：轮询/抢单/指定",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "负责人",
                "type": "text",
                "placeholder": "销售团队或成员",
                "optional": True
            }
        ]
    },
    {
        "name": "线索清洗",
        "category": "线索获客",
        "capability_key": "data_nl_query",
        "page_kind": "form_list",
        "problem": "重复、无效线索浪费跟进资源，系统自动去重、验证并标记清洗结果。",
        "default_category": "lead-cleaning",
        "form_headline": "线索清洗规则",
        "fields": [
            {
                "key": "title",
                "label": "规则名称",
                "type": "text",
                "placeholder": "如：重复电话去重",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "清洗条件",
                "type": "text",
                "placeholder": "如：电话重复/邮箱无效",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "处理动作",
                "type": "text",
                "placeholder": "如：标记无效/合并",
                "optional": True
            }
        ]
    },
    {
        "name": "渠道归因",
        "category": "线索获客",
        "capability_key": "mkt_roi",
        "page_kind": "chart",
        "problem": "无法准确评估各渠道ROI，通过归因模型展示线索来源与转化贡献。",
        "default_category": "channel-attribution",
        "form_headline": None,
        "fields": []
    },
    {
        "name": "落地页线索",
        "category": "线索获客",
        "capability_key": "campaign_ops",
        "page_kind": "form_list",
        "problem": "落地页表单线索手动录入易出错，自动抓取并同步至线索库。",
        "default_category": "landing-page-leads",
        "form_headline": "落地页配置",
        "fields": [
            {
                "key": "title",
                "label": "落地页名称",
                "type": "text",
                "placeholder": "如：新品发布会",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "表单字段",
                "type": "text",
                "placeholder": "如：姓名、电话、公司",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "目标人群",
                "type": "text",
                "placeholder": "如：企业市场部",
                "optional": True
            }
        ]
    },
    {
        "name": "会销报名",
        "category": "线索获客",
        "capability_key": "mkt_lead",
        "page_kind": "form_list",
        "problem": "会销报名信息分散难统计，统一收集并自动生成参会名单。",
        "default_category": "event-registration",
        "form_headline": "会销报名表单",
        "fields": [
            {
                "key": "title",
                "label": "活动名称",
                "type": "text",
                "placeholder": "如：2025营销峰会",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "报名人",
                "type": "text",
                "placeholder": "姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "联系方式",
                "type": "text",
                "placeholder": "手机号",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "公司",
                "type": "text",
                "placeholder": "公司名称",
                "optional": True
            }
        ]
    },
    {
        "name": "投放排期管理",
        "category": "内容投放",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "多平台投放排期混乱，人工协调易出错，需统一管理投放时间、渠道与状态。",
        "page_kind": "form_list",
        "default_category": "ad-schedule",
        "form_headline": "新建投放排期",
        "fields": [
            {
                "key": "title",
                "label": "投放名称",
                "type": "text",
                "placeholder": "如：618大促信息流",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "投放平台",
                "type": "text",
                "placeholder": "如：抖音、腾讯广告",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "开始日期",
                "type": "date",
                "placeholder": "",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "结束日期",
                "type": "date",
                "placeholder": "",
                "optional": False
            }
        ]
    },
    {
        "name": "素材库管理",
        "category": "内容投放",
        "capability_key": "mkt_content",
        "pages": "form+list",
        "problem": "素材分散在个人电脑，版本混乱，无法快速检索复用，需集中管理素材标签与状态。",
        "page_kind": "form_list",
        "default_category": "creative-library",
        "form_headline": "上传素材",
        "fields": [
            {
                "key": "title",
                "label": "素材名称",
                "type": "text",
                "placeholder": "如：主视觉-夏日版",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "素材类型",
                "type": "text",
                "placeholder": "如：图片、视频、文案",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "标签",
                "type": "text",
                "placeholder": "如：618、品牌",
                "optional": True
            }
        ]
    },
    {
        "name": "A/B文案测试",
        "category": "内容投放",
        "capability_key": "mkt_ab_test",
        "pages": "form+list",
        "problem": "文案效果依赖主观判断，缺乏结构化对比数据，需记录不同版本文案及投放表现。",
        "page_kind": "form_list",
        "default_category": "ab-test",
        "form_headline": "创建A/B测试",
        "fields": [
            {
                "key": "title",
                "label": "测试名称",
                "type": "text",
                "placeholder": "如：按钮文案对比",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "版本A",
                "type": "textarea",
                "placeholder": "文案内容",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "版本B",
                "type": "textarea",
                "placeholder": "文案内容",
                "optional": False
            }
        ]
    },
    {
        "name": "渠道刊例查询",
        "category": "内容投放",
        "capability_key": "kb_document",
        "pages": "chat+kb",
        "problem": "刊例价格分散在PDF或邮件中，询价效率低，需统一知识库支持自然语言查询。",
        "page_kind": "chat_kb",
        "default_category": "media-rate-card",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "投放复盘报告",
        "category": "内容投放",
        "capability_key": "mkt_roi",
        "pages": "chart",
        "problem": "投放数据散落各平台，人工汇总耗时，需自动生成多维度图表辅助复盘。",
        "page_kind": "chart",
        "default_category": "campaign-review",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "活动策划审批",
        "category": "活动运营",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "活动策划方案线下流转慢，版本混乱，无法追踪审批进度；通过表单提交策划案，自动通知审批人，归档至知识库。",
        "page_kind": "form_list",
        "default_category": "campaign_plan",
        "form_headline": "活动策划审批",
        "fields": [
            {
                "key": "title",
                "label": "活动名称",
                "type": "text",
                "placeholder": "请输入活动名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "活动类型",
                "type": "text",
                "placeholder": "如线上直播、线下沙龙",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "预算金额",
                "type": "number",
                "placeholder": "单位元",
                "optional": False
            },
            {
                "key": "note",
                "label": "策划方案",
                "type": "textarea",
                "placeholder": "简述活动目标、流程、预期效果",
                "optional": True
            }
        ]
    },
    {
        "name": "现场签到核销",
        "category": "活动运营",
        "capability_key": "mkt_sign",
        "pages": "form+list",
        "problem": "活动现场签到效率低，核销码易伪造，数据统计滞后；通过扫码签到实时记录，自动生成签到报表。",
        "page_kind": "form_list",
        "default_category": "checkin",
        "form_headline": "现场签到核销",
        "fields": [
            {
                "key": "title",
                "label": "活动名称",
                "type": "text",
                "placeholder": "选择关联活动",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "签到码",
                "type": "text",
                "placeholder": "扫码或手动输入",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "签到时间",
                "type": "text",
                "placeholder": "自动生成",
                "optional": True
            }
        ]
    },
    {
        "name": "抽奖台账管理",
        "category": "活动运营",
        "capability_key": "mkt_sign",
        "pages": "form+list",
        "problem": "抽奖记录分散，奖品发放无追踪，中奖数据易出错；通过表单记录抽奖结果，自动更新奖品库存。",
        "page_kind": "form_list",
        "default_category": "raffle",
        "form_headline": "抽奖台账",
        "fields": [
            {
                "key": "title",
                "label": "活动名称",
                "type": "text",
                "placeholder": "选择关联活动",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "中奖人",
                "type": "text",
                "placeholder": "姓名或ID",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "奖品名称",
                "type": "text",
                "placeholder": "如iPhone 15",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "发放状态等",
                "optional": True
            }
        ]
    },
    {
        "name": "预算执行跟踪",
        "category": "活动运营",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "活动预算超支难预警，执行进度不透明；通过图表实时展示预算使用率、各科目花费，支持钻取明细。",
        "page_kind": "chart",
        "default_category": "budget",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "复盘纪要归档",
        "category": "活动运营",
        "capability_key": "mkt_roi",
        "pages": "kb",
        "problem": "活动复盘文档散落各处，经验难以复用；通过知识库统一归档复盘纪要，支持全文检索和标签分类。",
        "page_kind": "files",
        "default_category": "retrospective",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "会员分层圈选",
        "category": "会员触达",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "运营人员无法快速按RFM、活跃度等维度圈选分层人群，依赖数据部门提数，导致活动上线延迟。通过内置分层模型和圈选表单，运营可直接创建并保存分层人群，驱动后续触达。",
        "page_kind": "form_list",
        "default_category": "member-segmentation",
        "form_headline": "创建分层人群",
        "fields": [
            {
                "key": "title",
                "label": "人群名称",
                "type": "text",
                "placeholder": "如：高活跃未复购",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "分层规则",
                "type": "textarea",
                "placeholder": "如：RFM得分>4且最近购买>30天",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "预估人数",
                "type": "number",
                "placeholder": "自动计算",
                "optional": True
            }
        ]
    },
    {
        "name": "券包发放任务",
        "category": "会员触达",
        "capability_key": "mkt_coupon",
        "pages": "form+list",
        "problem": "手动发放券包效率低，易漏发错发，且无法追踪核销。通过配置券包发放任务，自动匹配目标人群并记录发放状态，支持核销分析。",
        "page_kind": "form_list",
        "default_category": "coupon-campaign",
        "form_headline": "新建券包发放任务",
        "fields": [
            {
                "key": "title",
                "label": "任务名称",
                "type": "text",
                "placeholder": "如：618满减券包",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "券包配置",
                "type": "textarea",
                "placeholder": "券类型、面额、有效期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "目标人群",
                "type": "text",
                "placeholder": "选择已创建的分层人群",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "发放策略说明",
                "optional": True
            }
        ]
    },
    {
        "name": "沉默唤醒计划",
        "category": "会员触达",
        "capability_key": "mkt_coupon",
        "pages": "form+list",
        "problem": "沉默会员流失率高，缺乏自动化唤醒机制。通过配置唤醒规则（如N天未访问）和触达内容，系统自动执行唤醒任务并跟踪回访率。",
        "page_kind": "form_list",
        "default_category": "reactivation",
        "form_headline": "配置沉默唤醒计划",
        "fields": [
            {
                "key": "title",
                "label": "计划名称",
                "type": "text",
                "placeholder": "如：30天未访问唤醒",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "沉默判定条件",
                "type": "textarea",
                "placeholder": "如：最近访问>30天且未复购",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "触达内容模板",
                "type": "textarea",
                "placeholder": "短信/企微消息模板",
                "optional": False
            }
        ]
    },
    {
        "name": "企微社群触达",
        "category": "会员触达",
        "capability_key": "mkt_coupon",
        "pages": "notify",
        "problem": "企微社群消息发送依赖手工复制粘贴，无法精准定向且缺乏效果统计。通过集成企微API，支持按标签定向发送消息，并自动统计已读/点击。",
        "page_kind": "notify",
        "default_category": "wecom-group",
        "form_headline": "发送社群消息",
        "fields": [
            {
                "key": "title",
                "label": "消息标题",
                "type": "text",
                "placeholder": "如：限时活动提醒",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "消息内容",
                "type": "textarea",
                "placeholder": "支持文本、图片、小程序卡片",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "目标群标签",
                "type": "text",
                "placeholder": "如：高活跃群、新客群",
                "optional": False
            }
        ]
    },
    {
        "name": "生日关怀自动化",
        "category": "会员触达",
        "capability_key": "mkt_coupon",
        "pages": "form+list",
        "problem": "会员生日祝福和优惠券发放依赖人工操作，易遗漏且无法个性化。通过配置生日规则，系统自动在生日当天发送祝福和专属券，并记录触达情况。",
        "page_kind": "form_list",
        "default_category": "birthday-care",
        "form_headline": "配置生日关怀规则",
        "fields": [
            {
                "key": "title",
                "label": "规则名称",
                "type": "text",
                "placeholder": "如：生日月关怀",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "触发条件",
                "type": "textarea",
                "placeholder": "如：生日当天或前3天",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "优惠券配置",
                "type": "textarea",
                "placeholder": "券类型、面额、有效期",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "其他个性化设置",
                "optional": True
            }
        ]
    },
    {
        "name": "竞品价格追踪",
        "category": "竞品监测",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "市场人员需手动收集竞品价格，更新滞后，无法快速响应调价。通过表单录入竞品价格，自动汇总至价格看板，支持历史对比与预警。",
        "page_kind": "form_list",
        "default_category": "competitor-price",
        "form_headline": "竞品价格录入",
        "fields": [
            {
                "key": "title",
                "label": "竞品名称",
                "type": "text",
                "placeholder": "如：A公司",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "产品型号",
                "type": "text",
                "placeholder": "如：X100",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "价格（元）",
                "type": "number",
                "placeholder": "如：1999",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "监测日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            }
        ]
    },
    {
        "name": "竞品活动监测",
        "category": "竞品监测",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "竞品促销活动信息分散，难以集中分析。通过表单记录活动详情，自动生成活动日历与效果对比，辅助制定应对策略。",
        "page_kind": "form_list",
        "default_category": "competitor-activity",
        "form_headline": "竞品活动录入",
        "fields": [
            {
                "key": "title",
                "label": "活动名称",
                "type": "text",
                "placeholder": "如：双十一大促",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "竞品名称",
                "type": "text",
                "placeholder": "如：B公司",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "活动开始",
                "type": "date",
                "placeholder": "开始日期",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "活动结束",
                "type": "date",
                "placeholder": "结束日期",
                "optional": False
            }
        ]
    },
    {
        "name": "舆情对比分析",
        "category": "竞品监测",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "市场人员需快速了解竞品舆情动态，但信息分散在多个平台。通过知识库整合舆情数据，支持自然语言查询对比，如‘A公司近一周负面舆情占比’。",
        "page_kind": "chat_kb",
        "default_category": "competitor-sentiment",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "份额看板",
        "category": "竞品监测",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "市场份额数据更新慢，无法实时掌握竞争格局。通过图表看板展示各竞品份额趋势、环比变化，支持钻取查看明细。",
        "page_kind": "chart",
        "default_category": "market-share",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "ROI看板",
        "category": "效果分析",
        "capability_key": "mkt_roi",
        "pages": "chart",
        "problem": "市场投放ROI计算依赖手工Excel，数据滞后且口径不一；通过接入广告平台API自动生成ROI看板，实时展示各渠道投入产出比。",
        "page_kind": "chart",
        "default_category": "roi-dashboard",
        "form_headline": "ROI看板配置",
        "fields": [
            {
                "key": "title",
                "label": "看板名称",
                "type": "text",
                "placeholder": "如：Q3广告ROI",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "数据源",
                "type": "text",
                "placeholder": "如：Google Ads",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "时间范围",
                "type": "date",
                "placeholder": "选择起始日期",
                "optional": False
            }
        ]
    },
    {
        "name": "漏斗转化分析",
        "category": "效果分析",
        "capability_key": "chart_funnel",
        "pages": "chart",
        "problem": "用户从曝光到转化的各环节流失率不透明，无法定位瓶颈；通过埋点数据自动生成漏斗图，支持按渠道、人群下钻分析。",
        "page_kind": "chart",
        "default_category": "funnel-analysis",
        "form_headline": "漏斗配置",
        "fields": [
            {
                "key": "title",
                "label": "漏斗名称",
                "type": "text",
                "placeholder": "如：注册转化漏斗",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "事件序列",
                "type": "text",
                "placeholder": "如：曝光→点击→注册",
                "optional": False
            }
        ]
    },
    {
        "name": "自然语言问数",
        "category": "效果分析",
        "capability_key": "data_nl_query",
        "pages": "chat+kb",
        "problem": "业务人员想查询活动效果数据需依赖技术写SQL，响应慢；通过自然语言直接提问，系统自动解析并返回图表或数据表格。",
        "page_kind": "chat_kb",
        "default_category": "nl-query",
        "form_headline": "问数示例",
        "fields": [
            {
                "key": "title",
                "label": "问题示例",
                "type": "text",
                "placeholder": "如：上周各渠道获客成本",
                "optional": False
            }
        ]
    },
    {
        "name": "归因分析",
        "category": "效果分析",
        "capability_key": "mkt_roi",
        "pages": "chart",
        "problem": "多渠道转化贡献难以量化，无法合理分配预算；通过多触点归因模型自动计算各渠道贡献度，并生成对比图表。",
        "page_kind": "chart",
        "default_category": "attribution",
        "form_headline": "归因模型配置",
        "fields": [
            {
                "key": "title",
                "label": "分析名称",
                "type": "text",
                "placeholder": "如：Q2多渠道归因",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "归因模型",
                "type": "text",
                "placeholder": "如：线性归因",
                "optional": False
            }
        ]
    }
]

SCENES_BY_NAME = {s['name']: s for s in SCENES}

def marketing_pack_scenes() -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for s in SCENES:
        out.append({
            'name': s['name'],
            'category': s.get('category') or '',
            'problem': s.get('problem') or '',
            'pages': s.get('pages') or 'form+list',
            'agent': s.get('capability_key') or 'chat_qa',
            'standard': '✓',
        })
    return out

def enrich_marketing_menu_plan_item(item: dict, name: str) -> dict:
    row = SCENES_BY_NAME.get(name)
    if not row:
        return item
    ck = str(row.get('capability_key') or '').strip()
    if ck:
        item['capability_key'] = ck
    return item
