"""能源电力 场景 → 真能力 SSOT（DeepSeek 丰富）。"""

from __future__ import annotations

SCENES: list[dict] = [
    {
        "name": "工作票签发",
        "category": "两票三制",
        "capability_key": "energy_ticket",
        "page_kind": "form_list",
        "problem": "现场工作票签发依赖纸质流转，易丢失且审批耗时，通过电子化工作票实现签发、许可、终结全流程闭环。",
        "default_category": "work-ticket",
        "form_headline": "工作票签发",
        "fields": [
            {
                "key": "title",
                "label": "工作票编号",
                "type": "text",
                "placeholder": "自动生成或手动输入",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "工作任务",
                "type": "textarea",
                "placeholder": "描述工作任务内容",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "签发人",
                "type": "text",
                "placeholder": "签发人姓名",
                "optional": False
            }
        ]
    },
    {
        "name": "操作票管理",
        "category": "两票三制",
        "capability_key": "energy_ticket",
        "page_kind": "form_list",
        "problem": "操作票执行缺乏标准化，易出现误操作，通过电子操作票规范步骤并强制确认，降低操作风险。",
        "default_category": "operation-ticket",
        "form_headline": "操作票管理",
        "fields": [
            {
                "key": "title",
                "label": "操作票编号",
                "type": "text",
                "placeholder": "自动生成",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "操作任务",
                "type": "textarea",
                "placeholder": "操作任务描述",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "操作人",
                "type": "text",
                "placeholder": "操作人姓名",
                "optional": False
            }
        ]
    },
    {
        "name": "动火票审批",
        "category": "两票三制",
        "capability_key": "energy_hotwork",
        "page_kind": "form_list",
        "problem": "动火作业审批流程繁琐，安全措施确认不到位，通过电子动火票实现审批与安全措施闭环。",
        "default_category": "fire-ticket",
        "form_headline": "动火票审批",
        "fields": [
            {
                "key": "title",
                "label": "动火票编号",
                "type": "text",
                "placeholder": "自动生成",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "动火地点",
                "type": "text",
                "placeholder": "动火作业地点",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "动火级别",
                "type": "text",
                "placeholder": "一级/二级/三级",
                "optional": False
            }
        ]
    },
    {
        "name": "许可开工确认",
        "category": "两票三制",
        "capability_key": "energy_ticket",
        "page_kind": "form_list",
        "problem": "开工前安全措施确认依赖口头传达，易遗漏，通过电子确认单逐项检查并签字，确保安全措施落实。",
        "default_category": "start-permit",
        "form_headline": "许可开工确认",
        "fields": [
            {
                "key": "title",
                "label": "关联工作票编号",
                "type": "text",
                "placeholder": "输入工作票编号",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "安全措施确认",
                "type": "textarea",
                "placeholder": "逐项确认安全措施",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "许可人",
                "type": "text",
                "placeholder": "许可人姓名",
                "optional": False
            }
        ]
    },
    {
        "name": "工作票终结",
        "category": "两票三制",
        "capability_key": "energy_hotwork",
        "page_kind": "form_list",
        "problem": "工作票终结时设备状态变更记录不全，通过电子终结票记录设备状态并归档，形成完整闭环。",
        "default_category": "ticket-close",
        "form_headline": "工作票终结",
        "fields": [
            {
                "key": "title",
                "label": "工作票编号",
                "type": "text",
                "placeholder": "输入工作票编号",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "设备状态变更",
                "type": "textarea",
                "placeholder": "描述设备状态变更情况",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "终结人",
                "type": "text",
                "placeholder": "终结人姓名",
                "optional": False
            }
        ]
    },
    {
        "name": "典型票库检索",
        "category": "两票三制",
        "capability_key": "energy_hotwork",
        "page_kind": "chat_kb",
        "problem": "典型票库分散在纸质档案中，检索困难，通过知识库管理典型票并支持智能检索，快速复用。",
        "default_category": "typical-ticket",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "缺陷登记",
        "category": "缺陷隐患",
        "capability_key": "energy_defect",
        "pages": "form+list",
        "problem": "现场巡检发现设备缺陷后，纸质登记易遗漏、流转慢，无法及时录入系统并触发整改流程。",
        "page_kind": "form_list",
        "default_category": "defect",
        "form_headline": "缺陷登记",
        "fields": [
            {
                "key": "title",
                "label": "缺陷标题",
                "type": "text",
                "placeholder": "例如：1号主变油位异常",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "设备名称",
                "type": "text",
                "placeholder": "请输入设备名称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "缺陷等级",
                "type": "text",
                "placeholder": "一般/严重/危急",
                "optional": False
            },
            {
                "key": "note",
                "label": "缺陷描述",
                "type": "textarea",
                "placeholder": "详细描述缺陷现象",
                "optional": True
            }
        ]
    },
    {
        "name": "隐患分级",
        "category": "缺陷隐患",
        "capability_key": "energy_defect",
        "pages": "form+list",
        "problem": "隐患缺乏统一分级标准，导致整改优先级混乱，重大隐患未能及时处理。",
        "page_kind": "form_list",
        "default_category": "hazard",
        "form_headline": "隐患分级",
        "fields": [
            {
                "key": "title",
                "label": "隐患名称",
                "type": "text",
                "placeholder": "例如：电缆沟积水",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "隐患等级",
                "type": "text",
                "placeholder": "Ⅰ/Ⅱ/Ⅲ级",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "责任部门",
                "type": "text",
                "placeholder": "请输入部门",
                "optional": False
            }
        ]
    },
    {
        "name": "整改闭环",
        "category": "缺陷隐患",
        "capability_key": "energy_defect",
        "pages": "form+list",
        "problem": "整改任务下发后，缺乏跟踪闭环机制，超期未整改无人提醒，隐患长期存在。",
        "page_kind": "form_list",
        "default_category": "rectification",
        "form_headline": "整改闭环",
        "fields": [
            {
                "key": "title",
                "label": "整改任务",
                "type": "text",
                "placeholder": "例如：更换损坏的绝缘子",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "责任人",
                "type": "text",
                "placeholder": "请输入姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "计划完成日期",
                "type": "date",
                "placeholder": "请选择日期",
                "optional": False
            }
        ]
    },
    {
        "name": "重复缺陷预警",
        "category": "缺陷隐患",
        "capability_key": "energy_defect",
        "pages": "chart+notify",
        "problem": "同一设备反复出现同类缺陷，缺乏统计分析，无法预警并推动根因治理。",
        "page_kind": "chart",
        "default_category": "repeat_defect",
        "form_headline": "重复缺陷分析",
        "fields": []
    },
    {
        "name": "安环拍图",
        "category": "缺陷隐患",
        "capability_key": "energy_defect",
        "pages": "form+list",
        "problem": "现场安全环保问题拍照后无法直接关联缺陷记录，整改前后对比缺失，闭环证据不足。",
        "page_kind": "form_list",
        "default_category": "safety_env",
        "form_headline": "安环拍图",
        "fields": [
            {
                "key": "title",
                "label": "问题标题",
                "type": "text",
                "placeholder": "例如：油污泄漏",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "位置",
                "type": "text",
                "placeholder": "请输入具体位置",
                "optional": False
            },
            {
                "key": "note",
                "label": "整改前照片",
                "type": "text",
                "placeholder": "上传照片URL",
                "optional": True
            }
        ]
    },
    {
        "name": "线路巡检打卡",
        "category": "巡检点检",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "人工巡检打卡依赖纸质记录，无法实时追踪到位情况，通过移动端打卡+后台列表闭环管理。",
        "page_kind": "form_list",
        "default_category": "line-patrol",
        "form_headline": "线路巡检打卡",
        "fields": [
            {
                "key": "title",
                "label": "巡检线路",
                "type": "text",
                "placeholder": "请输入线路名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "杆塔编号",
                "type": "text",
                "placeholder": "如：T01",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "打卡时间",
                "type": "date",
                "placeholder": "选择时间",
                "optional": False
            }
        ]
    },
    {
        "name": "变电站点检记录",
        "category": "巡检点检",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "变电站点检项目多、漏检风险高，通过标准化表单逐项记录并汇总，确保点检无遗漏。",
        "page_kind": "form_list",
        "default_category": "substation-inspection",
        "form_headline": "变电站点检记录",
        "fields": [
            {
                "key": "title",
                "label": "变电站名称",
                "type": "text",
                "placeholder": "如：110kV中心变",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "设备编号",
                "type": "text",
                "placeholder": "如：主变#1",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "点检项目",
                "type": "text",
                "placeholder": "如：油温、油位",
                "optional": False
            },
            {
                "key": "note",
                "label": "异常备注",
                "type": "textarea",
                "placeholder": "如有异常请描述",
                "optional": True
            }
        ]
    },
    {
        "name": "无人机巡视报告",
        "category": "巡检点检",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "无人机巡视影像数据分散，无法集中管理缺陷，通过上传报告+缺陷标记实现闭环。",
        "page_kind": "form_list",
        "default_category": "drone-patrol",
        "form_headline": "无人机巡视报告",
        "fields": [
            {
                "key": "title",
                "label": "巡视区域",
                "type": "text",
                "placeholder": "如：东线#10-#20",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "发现缺陷",
                "type": "text",
                "placeholder": "如：绝缘子破损",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "缺陷等级",
                "type": "text",
                "placeholder": "一般/严重/危急",
                "optional": False
            }
        ]
    },
    {
        "name": "测温异常登记",
        "category": "巡检点检",
        "capability_key": "energy_defect",
        "pages": "form+list",
        "problem": "红外测温发现异常后缺乏标准登记流程，通过表单记录温度值、位置并自动关联缺陷库。",
        "page_kind": "form_list",
        "default_category": "temperature-anomaly",
        "form_headline": "测温异常登记",
        "fields": [
            {
                "key": "title",
                "label": "设备名称",
                "type": "text",
                "placeholder": "如：隔离开关A相",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "实测温度(℃)",
                "type": "number",
                "placeholder": "如：85",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "环境温度(℃)",
                "type": "number",
                "placeholder": "如：30",
                "optional": False
            },
            {
                "key": "note",
                "label": "异常描述",
                "type": "textarea",
                "placeholder": "详细描述异常情况",
                "optional": True
            }
        ]
    },
    {
        "name": "表计抄录台账",
        "category": "巡检点检",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "人工抄录表计数据易出错、难追溯，通过移动端录入+历史数据对比实现精准管理。",
        "page_kind": "form_list",
        "default_category": "meter-reading",
        "form_headline": "表计抄录台账",
        "fields": [
            {
                "key": "title",
                "label": "表计编号",
                "type": "text",
                "placeholder": "如：M-001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "抄录读数",
                "type": "number",
                "placeholder": "如：1234.5",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "抄录时间",
                "type": "date",
                "placeholder": "选择时间",
                "optional": False
            }
        ]
    },
    {
        "name": "计划停电通知",
        "category": "停电抢修",
        "capability_key": "energy_outage",
        "pages": "form+list",
        "problem": "计划停电信息人工传递慢，居民无法提前获知，导致投诉；通过系统自动生成停电通知并推送用户，实现闭环。",
        "page_kind": "form_list",
        "default_category": "planned_outage",
        "form_headline": "新增计划停电通知",
        "fields": [
            {
                "key": "title",
                "label": "停电标题",
                "type": "text",
                "placeholder": "如：10kV线路检修停电",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "停电范围",
                "type": "text",
                "placeholder": "如：XX小区、XX路",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "停电时间",
                "type": "date",
                "placeholder": "选择停电开始时间",
                "optional": False
            }
        ]
    },
    {
        "name": "故障抢修派工",
        "category": "停电抢修",
        "capability_key": "energy_restore",
        "pages": "form+list",
        "problem": "故障抢修派工依赖电话沟通，效率低且易遗漏；通过系统自动派单并跟踪抢修进度，实现闭环管理。",
        "page_kind": "form_list",
        "default_category": "fault_repair",
        "form_headline": "故障抢修派工单",
        "fields": [
            {
                "key": "title",
                "label": "故障描述",
                "type": "text",
                "placeholder": "如：XX变压器冒烟",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "故障地点",
                "type": "text",
                "placeholder": "具体位置",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "派工班组",
                "type": "text",
                "placeholder": "如：抢修一班",
                "optional": False
            }
        ]
    },
    {
        "name": "复电确认记录",
        "category": "停电抢修",
        "capability_key": "energy_restore",
        "pages": "form+list",
        "problem": "抢修完成后复电确认靠人工上报，无法实时掌握复电状态；通过系统记录复电时间并自动通知，实现闭环。",
        "page_kind": "form_list",
        "default_category": "restoration_confirm",
        "form_headline": "复电确认",
        "fields": [
            {
                "key": "title",
                "label": "停电事件",
                "type": "text",
                "placeholder": "关联的停电事件编号",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "复电时间",
                "type": "date",
                "placeholder": "实际复电时间",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "确认人",
                "type": "text",
                "placeholder": "操作人姓名",
                "optional": False
            }
        ]
    },
    {
        "name": "影响户数统计",
        "category": "停电抢修",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "停电影响户数统计依赖手工汇总，数据滞后且不准确；通过系统自动统计并展示图表，实现实时监控。",
        "page_kind": "chart",
        "default_category": "affected_customers",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "保电任务管理",
        "category": "停电抢修",
        "capability_key": "energy_restore",
        "pages": "form+list",
        "problem": "重要活动保电任务缺乏系统化管理，任务执行情况无法跟踪；通过系统创建保电任务并记录执行情况，实现闭环。",
        "page_kind": "form_list",
        "default_category": "power_guarantee",
        "form_headline": "新增保电任务",
        "fields": [
            {
                "key": "title",
                "label": "任务名称",
                "type": "text",
                "placeholder": "如：两会保电",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "保电地点",
                "type": "text",
                "placeholder": "具体场所",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "保电时间",
                "type": "date",
                "placeholder": "开始时间",
                "optional": False
            }
        ]
    },
    {
        "name": "备件领用申请",
        "category": "物资双碳",
        "capability_key": "energy_spare",
        "pages": "form+list",
        "problem": "现场抢修时备件领用流程繁琐，纸质单据易丢失，无法实时追踪库存和领用记录，导致物资管理混乱。",
        "page_kind": "form_list",
        "default_category": "spare_part",
        "form_headline": "备件领用申请",
        "fields": [
            {
                "key": "title",
                "label": "领用标题",
                "type": "text",
                "placeholder": "如：风机叶片螺栓领用",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "备件名称",
                "type": "text",
                "placeholder": "输入备件名称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "数量",
                "type": "number",
                "placeholder": "输入数量",
                "optional": False
            },
            {
                "key": "note",
                "label": "用途说明",
                "type": "textarea",
                "placeholder": "说明领用原因及使用位置",
                "optional": True
            }
        ]
    },
    {
        "name": "备件归还登记",
        "category": "物资双碳",
        "capability_key": "energy_spare",
        "pages": "form+list",
        "problem": "备件归还无系统记录，归还状态不明，易造成库存虚增或丢失，影响后续抢修效率。",
        "page_kind": "form_list",
        "default_category": "spare_return",
        "form_headline": "备件归还登记",
        "fields": [
            {
                "key": "title",
                "label": "归还标题",
                "type": "text",
                "placeholder": "如：归还风机叶片螺栓",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "备件名称",
                "type": "text",
                "placeholder": "输入备件名称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "归还数量",
                "type": "number",
                "placeholder": "输入归还数量",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "归还状态、损坏情况等",
                "optional": True
            }
        ]
    },
    {
        "name": "碳排放数据填报",
        "category": "物资双碳",
        "capability_key": "energy_emissions",
        "pages": "form+list",
        "problem": "碳排放数据依赖手工Excel填报，数据分散、易出错，无法满足合规审计要求。",
        "page_kind": "form_list",
        "default_category": "carbon_emission",
        "form_headline": "碳排放数据填报",
        "fields": [
            {
                "key": "title",
                "label": "填报周期",
                "type": "text",
                "placeholder": "如：2024年Q1",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "排放类型",
                "type": "text",
                "placeholder": "如：直接排放、间接排放",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "排放量(吨CO2)",
                "type": "number",
                "placeholder": "输入排放量",
                "optional": False
            },
            {
                "key": "note",
                "label": "数据来源说明",
                "type": "textarea",
                "placeholder": "如：电表读数、燃料消耗记录",
                "optional": True
            }
        ]
    },
    {
        "name": "能耗统计看板",
        "category": "物资双碳",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "各厂区能耗数据手工汇总滞后，无法实时监控能耗异常，难以支撑节能决策。",
        "page_kind": "chart",
        "default_category": "energy_consumption",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "油耗台账记录",
        "category": "物资双碳",
        "capability_key": "energy_ticket",
        "pages": "form+list",
        "problem": "车辆油耗手工登记，数据不透明，无法有效监控油料消耗和成本。",
        "page_kind": "form_list",
        "default_category": "fuel_log",
        "form_headline": "油耗台账记录",
        "fields": [
            {
                "key": "title",
                "label": "车辆编号",
                "type": "text",
                "placeholder": "如：京A12345",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "加油量(L)",
                "type": "number",
                "placeholder": "输入加油量",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "里程数(km)",
                "type": "number",
                "placeholder": "输入当前里程",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "加油站点、司机等",
                "optional": True
            }
        ]
    },
    {
        "name": "调度令执行闭环",
        "category": "调度安环",
        "capability_key": "energy_ticket",
        "pages": "form+list",
        "problem": "调度令下达后缺乏执行跟踪，易遗漏或超时，通过工单系统实现调度令的接收、执行、反馈全流程闭环。",
        "page_kind": "form_list",
        "default_category": "dispatch-order",
        "form_headline": "调度令执行记录",
        "fields": [
            {
                "key": "title",
                "label": "调度令编号",
                "type": "text",
                "placeholder": "如 D20241201-001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "执行内容",
                "type": "textarea",
                "placeholder": "描述调度令具体操作",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "执行人",
                "type": "text",
                "placeholder": "值班员姓名",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "执行时间",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            }
        ]
    },
    {
        "name": "接地线管理",
        "category": "调度安环",
        "capability_key": "energy_defect",
        "pages": "form+list",
        "problem": "接地线装拆记录混乱，易造成带地线合闸事故，通过缺陷管理模块实现接地线位置、状态、责任人实时追踪。",
        "page_kind": "form_list",
        "default_category": "ground-wire",
        "form_headline": "接地线装拆记录",
        "fields": [
            {
                "key": "title",
                "label": "接地线编号",
                "type": "text",
                "placeholder": "如 JDX-001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "装拆位置",
                "type": "text",
                "placeholder": "如 #1主变高压侧",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "操作类型",
                "type": "text",
                "placeholder": "装设/拆除",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "异常情况说明",
                "optional": True
            }
        ]
    },
    {
        "name": "安规知识问答",
        "category": "调度安环",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "现场人员对安规条款记忆模糊，查询纸质规程效率低，通过RAG问答系统快速获取准确安规解释。",
        "page_kind": "chat_kb",
        "default_category": "safety-rules",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "反措落实跟踪",
        "category": "调度安环",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "反事故措施落实缺乏闭环管理，整改情况难以追溯，通过质检模块记录反措任务、责任人、完成状态。",
        "page_kind": "form_list",
        "default_category": "anti-accident",
        "form_headline": "反措任务单",
        "fields": [
            {
                "key": "title",
                "label": "反措编号",
                "type": "text",
                "placeholder": "如 FC-2024-001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "措施内容",
                "type": "textarea",
                "placeholder": "描述具体反事故措施",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "责任人",
                "type": "text",
                "placeholder": "姓名",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "完成期限",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            }
        ]
    },
    {
        "name": "场站应急演练",
        "category": "调度安环",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "应急演练计划执行随意，演练记录缺失，通过巡检模块制定演练计划、记录演练过程、评估演练效果。",
        "page_kind": "form_list",
        "default_category": "emergency-drill",
        "form_headline": "应急演练记录",
        "fields": [
            {
                "key": "title",
                "label": "演练名称",
                "type": "text",
                "placeholder": "如火灾应急演练",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "演练时间",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "参与人员",
                "type": "text",
                "placeholder": "人员名单",
                "optional": False
            },
            {
                "key": "note",
                "label": "演练总结",
                "type": "textarea",
                "placeholder": "问题与改进措施",
                "optional": True
            }
        ]
    }
]

SCENES_BY_NAME = {s['name']: s for s in SCENES}

def energy_pack_scenes() -> list[dict[str, str]]:
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

def enrich_energy_menu_plan_item(item: dict, name: str) -> dict:
    row = SCENES_BY_NAME.get(name)
    if not row:
        return item
    ck = str(row.get('capability_key') or '').strip()
    if ck:
        item['capability_key'] = ck
    return item
