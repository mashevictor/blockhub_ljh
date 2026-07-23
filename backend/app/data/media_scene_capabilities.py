"""传媒内容 场景 → 真能力 SSOT（DeepSeek 丰富）。"""

from __future__ import annotations

SCENES: list[dict] = [
    {
        "name": "选题申报",
        "category": "选题策划",
        "capability_key": "media_topic",
        "pages": "form+list",
        "problem": "记者通过表单提交选题，主编在列表中审核，避免微信碎片化沟通，所有选题沉淀至数据库。",
        "page_kind": "form_list",
        "default_category": "topic-planning",
        "form_headline": "选题申报",
        "fields": [
            {
                "key": "title",
                "label": "选题标题",
                "type": "text",
                "placeholder": "输入选题标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "选题类型",
                "type": "text",
                "placeholder": "如：热点/深度/人物",
                "optional": False
            },
            {
                "key": "note",
                "label": "选题说明",
                "type": "textarea",
                "placeholder": "简述选题背景和角度",
                "optional": True
            }
        ]
    },
    {
        "name": "采访提纲",
        "category": "选题策划",
        "capability_key": "media_topic",
        "pages": "chat+kb",
        "problem": "记者在知识库中创建采访提纲模板，AI辅助生成问题，避免每次从零开始，提纲统一管理。",
        "page_kind": "chat_kb",
        "default_category": "topic-planning",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "角本大纲",
        "category": "选题策划",
        "capability_key": "media_topic",
        "pages": "chat+kb",
        "problem": "编导在知识库中协作撰写视频角本大纲，AI提供结构建议，避免版本混乱，大纲可复用。",
        "page_kind": "chat_kb",
        "default_category": "topic-planning",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "竞品选题监测",
        "category": "选题策划",
        "capability_key": "media_topic",
        "pages": "chart",
        "problem": "通过自然语言查询竞品选题数据，图表展示热点趋势，避免手动爬取，数据驱动选题决策。",
        "page_kind": "chart",
        "default_category": "topic-planning",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "热点选题池",
        "category": "选题策划",
        "capability_key": "media_topic",
        "pages": "chat+kb",
        "problem": "AI实时抓取热点并推荐选题，记者可提问获取灵感，避免选题枯竭，热点池动态更新。",
        "page_kind": "chat_kb",
        "default_category": "topic-planning",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "稿件审核",
        "category": "内容生产",
        "capability_key": "media_review",
        "pages": "form+list",
        "problem": "编辑提交稿件后，需多人逐字审核并留痕，当前依赖邮件/微信，版本混乱易出错。真库闭环：稿件提交→审核流→终版归档。",
        "page_kind": "form_list",
        "default_category": "content-production",
        "form_headline": "提交稿件审核",
        "fields": [
            {
                "key": "title",
                "label": "稿件标题",
                "type": "text",
                "placeholder": "请输入稿件标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "稿件文件",
                "type": "text",
                "placeholder": "上传稿件链接或附件",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "审核人",
                "type": "text",
                "placeholder": "选择审核人",
                "optional": False
            }
        ]
    },
    {
        "name": "视频成片审核",
        "category": "内容生产",
        "capability_key": "media_review",
        "pages": "form+list",
        "problem": "视频成片需逐帧审核，标注时间轴问题，当前无统一平台，沟通成本高。真库闭环：提交成片→时间轴标注→审核通过/驳回。",
        "page_kind": "form_list",
        "default_category": "content-production",
        "form_headline": "提交视频成片审核",
        "fields": [
            {
                "key": "title",
                "label": "视频标题",
                "type": "text",
                "placeholder": "请输入视频标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "视频链接",
                "type": "text",
                "placeholder": "上传视频链接",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "审核人",
                "type": "text",
                "placeholder": "选择审核人",
                "optional": False
            }
        ]
    },
    {
        "name": "素材版权登记",
        "category": "内容生产",
        "capability_key": "media_asset",
        "pages": "form+list",
        "problem": "素材版权信息分散，使用前无法快速确认授权状态，存在侵权风险。真库闭环：登记素材版权→自动查重→授权到期提醒。",
        "page_kind": "form_list",
        "default_category": "content-production",
        "form_headline": "登记素材版权",
        "fields": [
            {
                "key": "title",
                "label": "素材名称",
                "type": "text",
                "placeholder": "请输入素材名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "版权方",
                "type": "text",
                "placeholder": "请输入版权方",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "授权到期日",
                "type": "date",
                "placeholder": "选择授权到期日",
                "optional": False
            }
        ]
    },
    {
        "name": "配音字幕管理",
        "category": "内容生产",
        "capability_key": "media_asset",
        "pages": "form+list",
        "problem": "配音字幕任务依赖人工排期，进度不透明，容易延误。真库闭环：创建配音/字幕任务→分配人员→跟踪完成状态。",
        "page_kind": "form_list",
        "default_category": "content-production",
        "form_headline": "创建配音/字幕任务",
        "fields": [
            {
                "key": "title",
                "label": "任务名称",
                "type": "text",
                "placeholder": "请输入任务名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "任务类型",
                "type": "text",
                "placeholder": "配音/字幕",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "负责人",
                "type": "text",
                "placeholder": "选择负责人",
                "optional": False
            }
        ]
    },
    {
        "name": "封面图审核",
        "category": "内容生产",
        "capability_key": "media_asset",
        "pages": "form+list",
        "problem": "封面图需符合品牌规范，当前无审核流程，上线后才发现问题。真库闭环：提交封面图→审核规范→通过/驳回。",
        "page_kind": "form_list",
        "default_category": "content-production",
        "form_headline": "提交封面图审核",
        "fields": [
            {
                "key": "title",
                "label": "封面图名称",
                "type": "text",
                "placeholder": "请输入封面图名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "封面图文件",
                "type": "text",
                "placeholder": "上传封面图链接",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "审核人",
                "type": "text",
                "placeholder": "选择审核人",
                "optional": False
            }
        ]
    },
    {
        "name": "内容敏感词审查",
        "category": "合规审核",
        "capability_key": "media_review",
        "pages": "form+list",
        "problem": "稿件发布前需人工逐字排查敏感词，效率低易遗漏，真库自动扫描并标记违规内容",
        "page_kind": "form_list",
        "default_category": "content-review",
        "form_headline": "新建敏感词审查任务",
        "fields": [
            {
                "key": "title",
                "label": "稿件标题",
                "type": "text",
                "placeholder": "输入稿件标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "稿件内容",
                "type": "textarea",
                "placeholder": "粘贴或输入待审查内容",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "审查类型",
                "type": "text",
                "placeholder": "如：政治敏感、广告法",
                "optional": True
            }
        ]
    },
    {
        "name": "肖像授权核查",
        "category": "合规审核",
        "capability_key": "kb_document",
        "pages": "chat+kb",
        "problem": "使用人物肖像时授权文件分散，无法快速确认授权范围与有效期，真库关联授权文档并自动比对",
        "page_kind": "chat_kb",
        "default_category": "portrait-rights",
        "form_headline": "肖像授权查询",
        "fields": [
            {
                "key": "title",
                "label": "人物姓名",
                "type": "text",
                "placeholder": "输入人物姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "使用场景",
                "type": "text",
                "placeholder": "如：海报、视频",
                "optional": True
            }
        ]
    },
    {
        "name": "广告法合规检查",
        "category": "合规审核",
        "capability_key": "media_review",
        "pages": "form+list",
        "problem": "广告文案易出现违禁词（如“最”“第一”），人工检查耗时且标准不一，真库自动比对广告法词库",
        "page_kind": "form_list",
        "default_category": "ad-compliance",
        "form_headline": "广告法合规检查",
        "fields": [
            {
                "key": "title",
                "label": "广告文案标题",
                "type": "text",
                "placeholder": "输入广告文案标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "文案内容",
                "type": "textarea",
                "placeholder": "粘贴广告文案",
                "optional": False
            }
        ]
    },
    {
        "name": "领导人报道规范审核",
        "category": "合规审核",
        "capability_key": "media_review",
        "pages": "form+list",
        "problem": "领导人报道需严格遵循称谓、排序等规范，人工核对易出错，真库内置规范库自动校验",
        "page_kind": "form_list",
        "default_category": "leader-report",
        "form_headline": "领导人报道规范审核",
        "fields": [
            {
                "key": "title",
                "label": "报道标题",
                "type": "text",
                "placeholder": "输入报道标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "报道内容",
                "type": "textarea",
                "placeholder": "粘贴报道正文",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "涉及领导人",
                "type": "text",
                "placeholder": "如：习近平、李克强",
                "optional": True
            }
        ]
    },
    {
        "name": "二审三审流程跟踪",
        "category": "合规审核",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "稿件需多级审核，流程状态不透明，易遗漏或延误，真库记录审核节点与意见，实时跟踪",
        "page_kind": "form_list",
        "default_category": "multi-review",
        "form_headline": "新建审核流程",
        "fields": [
            {
                "key": "title",
                "label": "稿件标题",
                "type": "text",
                "placeholder": "输入稿件标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "当前审核环节",
                "type": "text",
                "placeholder": "如：二审",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "审核意见或说明",
                "optional": True
            }
        ]
    },
    {
        "name": "多平台分发",
        "category": "发布运营",
        "capability_key": "media_live",
        "pages": "form+list",
        "problem": "内容需同时发布到微信、抖音、B站等平台，手动操作易遗漏且效率低，通过统一分发任务管理实现一键多平台发布。",
        "page_kind": "form_list",
        "default_category": "publish_ops",
        "form_headline": "新建分发任务",
        "fields": [
            {
                "key": "title",
                "label": "内容标题",
                "type": "text",
                "placeholder": "输入内容标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "目标平台",
                "type": "text",
                "placeholder": "如微信、抖音、B站",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "发布时间",
                "type": "datetime",
                "placeholder": "选择发布时间",
                "optional": False
            }
        ]
    },
    {
        "name": "直播场控",
        "category": "发布运营",
        "capability_key": "media_live",
        "pages": "chat+kb",
        "problem": "直播过程中评论刷屏，需快速识别违规内容并执行禁言、踢出等操作，通过AI实时审核与场控指令结合提升响应速度。",
        "page_kind": "chat_kb",
        "default_category": "live_control",
        "form_headline": "场控指令",
        "fields": [
            {
                "key": "title",
                "label": "指令名称",
                "type": "text",
                "placeholder": "如禁言、踢出",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "目标用户",
                "type": "text",
                "placeholder": "输入用户ID或昵称",
                "optional": False
            }
        ]
    },
    {
        "name": "互动评论治理",
        "category": "发布运营",
        "capability_key": "media_review",
        "pages": "chat+kb",
        "problem": "评论区负面舆情、垃圾广告频发，人工审核效率低，通过智能过滤与批量处理实现高效治理。",
        "page_kind": "chat_kb",
        "default_category": "comment_moderation",
        "form_headline": "评论治理规则",
        "fields": [
            {
                "key": "title",
                "label": "规则名称",
                "type": "text",
                "placeholder": "如屏蔽关键词",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "关键词",
                "type": "text",
                "placeholder": "输入屏蔽关键词",
                "optional": False
            }
        ]
    },
    {
        "name": "置顶策略",
        "category": "发布运营",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "重要内容需在多个平台置顶展示，手动设置繁琐且易过期，通过策略化置顶管理实现自动生效与失效。",
        "page_kind": "form_list",
        "default_category": "pin_strategy",
        "form_headline": "新建置顶策略",
        "fields": [
            {
                "key": "title",
                "label": "策略名称",
                "type": "text",
                "placeholder": "输入策略名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "目标平台",
                "type": "text",
                "placeholder": "如微信、抖音",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "置顶内容",
                "type": "text",
                "placeholder": "输入内容ID或链接",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "生效时间",
                "type": "datetime",
                "placeholder": "选择生效时间",
                "optional": False
            }
        ]
    },
    {
        "name": "下架应急",
        "category": "发布运营",
        "capability_key": "media_live",
        "pages": "form+list",
        "problem": "内容出现违规或舆情风险需紧急下架，跨平台手动操作耗时，通过一键下架任务快速响应。",
        "page_kind": "form_list",
        "default_category": "emergency_takedown",
        "form_headline": "新建下架任务",
        "fields": [
            {
                "key": "title",
                "label": "任务名称",
                "type": "text",
                "placeholder": "输入任务名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "目标内容",
                "type": "text",
                "placeholder": "输入内容ID或链接",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "下架平台",
                "type": "text",
                "placeholder": "如微信、抖音",
                "optional": False
            }
        ]
    },
    {
        "name": "刊例报价管理",
        "category": "活动广告",
        "capability_key": "kb_document",
        "pages": "form+list",
        "problem": "销售频繁手工制作刊例报价单，版本混乱，客户询价响应慢；真库存储标准刊例模板与历史报价，一键生成报价单。",
        "page_kind": "form_list",
        "default_category": "media_rate_card",
        "form_headline": "新建刊例报价",
        "fields": [
            {
                "key": "title",
                "label": "报价单名称",
                "type": "text",
                "placeholder": "如：2025Q1品牌合作报价",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "客户名称",
                "type": "text",
                "placeholder": "输入客户公司名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "报价总金额",
                "type": "number",
                "placeholder": "单位：元",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "特殊折扣或条款",
                "optional": True
            }
        ]
    },
    {
        "name": "广告排期看板",
        "category": "活动广告",
        "capability_key": "media_calendar",
        "pages": "chart",
        "problem": "多项目广告排期冲突频发，资源利用率低；真库同步排期数据，甘特图可视化展示各渠道投放时段。",
        "page_kind": "chart",
        "default_category": "ad_schedule",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "活动效果复盘",
        "category": "活动广告",
        "capability_key": "data_nl_query",
        "pages": "chat+kb",
        "problem": "活动结束后复盘数据分散在多个报表，人工汇总耗时易错；真库接入活动数据，自然语言查询ROI、曝光量等指标。",
        "page_kind": "chat_kb",
        "default_category": "campaign_review",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "品牌合作审批",
        "category": "活动广告",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "品牌合作流程依赖邮件流转，进度不透明，易遗漏关键节点；真库固化合作审批流程，自动通知下一节点。",
        "page_kind": "form_list",
        "default_category": "brand_collab",
        "form_headline": "品牌合作申请",
        "fields": [
            {
                "key": "title",
                "label": "合作项目名称",
                "type": "text",
                "placeholder": "如：XX品牌联名活动",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "合作品牌",
                "type": "text",
                "placeholder": "品牌全称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "预算金额",
                "type": "number",
                "placeholder": "单位：元",
                "optional": False
            },
            {
                "key": "note",
                "label": "合作内容简述",
                "type": "textarea",
                "placeholder": "权益、时间等",
                "optional": True
            }
        ]
    },
    {
        "name": "投放效果预警",
        "category": "活动广告",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "广告投放中效果异常（如曝光骤降）无法实时感知，错过优化窗口；真库监控投放数据，触发阈值自动推送预警。",
        "page_kind": "notify",
        "default_category": "ad_alert",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "舆情监测工单",
        "category": "舆情数据",
        "capability_key": "media_review",
        "pages": "form+list",
        "problem": "舆情爆发时需快速创建监测任务并跟踪处置，当前依赖邮件/IM散乱沟通，无法闭环。真库存储舆情事件与处置记录。",
        "page_kind": "form_list",
        "default_category": "public-opinion",
        "form_headline": "新建舆情监测任务",
        "fields": [
            {
                "key": "title",
                "label": "舆情标题",
                "type": "text",
                "placeholder": "如：某品牌食品安全事件",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "监测关键词",
                "type": "text",
                "placeholder": "逗号分隔",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "监测平台",
                "type": "text",
                "placeholder": "微博/微信/抖音等",
                "optional": True
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "补充说明",
                "optional": True
            }
        ]
    },
    {
        "name": "热搜趋势看板",
        "category": "舆情数据",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "运营需实时掌握热搜词排名与阅读量变化，手动截图汇总效率低。真库聚合多平台热搜数据并可视化。",
        "page_kind": "chart",
        "default_category": "hot-search",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "阅读量智能问答",
        "category": "舆情数据",
        "capability_key": "data_nl_query",
        "pages": "chat+kb",
        "problem": "编辑想快速查询某文章阅读量或对比历史数据，需反复找BI提数。真库对接内容数据库支持自然语言查询。",
        "page_kind": "chat_kb",
        "default_category": "readership",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "危机公关协作",
        "category": "舆情数据",
        "capability_key": "campaign_ops",
        "pages": "notify",
        "problem": "危机事件需跨部门快速响应，当前通知滞后、任务分配混乱。真库自动触发通知并跟踪响应进度。",
        "page_kind": "notify",
        "default_category": "crisis-response",
        "form_headline": "",
        "fields": []
    }
]

SCENES_BY_NAME = {s['name']: s for s in SCENES}

def media_pack_scenes() -> list[dict[str, str]]:
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

def enrich_media_menu_plan_item(item: dict, name: str) -> dict:
    row = SCENES_BY_NAME.get(name)
    if not row:
        return item
    ck = str(row.get('capability_key') or '').strip()
    if ck:
        item['capability_key'] = ck
    return item
