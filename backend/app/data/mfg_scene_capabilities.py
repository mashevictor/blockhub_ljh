"""传统制造 场景 → 真能力 SSOT（DeepSeek 丰富）。"""

from __future__ import annotations

SCENES: list[dict] = [
    {
        "name": "设备报修工单",
        "category": "设备运维",
        "capability_key": "device_repair",
        "pages": "form+list",
        "problem": "一线报修依赖电话或微信，信息零散，维修响应慢，无法追溯历史维修记录。",
        "page_kind": "form_list",
        "default_category": "device-repair",
        "form_headline": "设备报修",
        "fields": [
            {
                "key": "title",
                "label": "设备名称",
                "type": "text",
                "placeholder": "请输入设备名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "故障描述",
                "type": "textarea",
                "placeholder": "请描述故障现象",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "报修人",
                "type": "text",
                "placeholder": "请输入报修人姓名",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "报修时间",
                "type": "date",
                "placeholder": "选择报修时间",
                "optional": False
            }
        ]
    },
    {
        "name": "保养计划执行",
        "category": "设备运维",
        "capability_key": "maintenance_plan",
        "pages": "form+list",
        "problem": "保养计划靠纸质记录，执行情况难追踪，漏保超期无人提醒，设备寿命缩短。",
        "page_kind": "form_list",
        "default_category": "maintenance-plan",
        "form_headline": "保养计划执行",
        "fields": [
            {
                "key": "title",
                "label": "设备编号",
                "type": "text",
                "placeholder": "请输入设备编号",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "保养项目",
                "type": "text",
                "placeholder": "如更换机油、清洁滤芯",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "执行人",
                "type": "text",
                "placeholder": "请输入执行人姓名",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "计划日期",
                "type": "date",
                "placeholder": "选择计划日期",
                "optional": False
            }
        ]
    },
    {
        "name": "点检标准库",
        "category": "设备运维",
        "capability_key": "kb_document",
        "pages": "chat+kb",
        "problem": "点检标准分散在纸质文件或个人电脑，新员工培训困难，现场执行无统一参考。",
        "page_kind": "chat_kb",
        "default_category": "inspection-standard",
        "form_headline": "点检标准查询",
        "fields": []
    },
    {
        "name": "备件更换记录",
        "category": "设备运维",
        "capability_key": "material_issue",
        "pages": "form+list",
        "problem": "备件更换无系统记录，库存消耗不明，重复采购或短缺影响维修效率。",
        "page_kind": "form_list",
        "default_category": "spare-part-replacement",
        "form_headline": "备件更换记录",
        "fields": [
            {
                "key": "title",
                "label": "备件名称",
                "type": "text",
                "placeholder": "请输入备件名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "更换数量",
                "type": "number",
                "placeholder": "请输入数量",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "更换人",
                "type": "text",
                "placeholder": "请输入更换人姓名",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "更换日期",
                "type": "date",
                "placeholder": "选择更换日期",
                "optional": False
            }
        ]
    },
    {
        "name": "TPM活动记录",
        "category": "设备运维",
        "capability_key": "training_record",
        "pages": "form+list",
        "problem": "TPM活动缺乏数字化记录，参与率、问题发现与改善成果无法量化分析。",
        "page_kind": "form_list",
        "default_category": "tpm-activity",
        "form_headline": "TPM活动记录",
        "fields": [
            {
                "key": "title",
                "label": "活动主题",
                "type": "text",
                "placeholder": "请输入活动主题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "参与人数",
                "type": "number",
                "placeholder": "请输入参与人数",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "发现隐患数",
                "type": "number",
                "placeholder": "请输入发现隐患数",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "活动日期",
                "type": "date",
                "placeholder": "选择活动日期",
                "optional": False
            }
        ]
    },
    {
        "name": "生产日报录入",
        "category": "生产OEE",
        "capability_key": "mfg_oee",
        "pages": "form+list",
        "problem": "车间生产数据依赖纸质报表，汇总滞后且易出错，无法实时计算OEE。通过生产日报表单录入产量、工时、停机时长，系统自动计算OEE并生成看板。",
        "page_kind": "form_list",
        "default_category": "production-oee",
        "form_headline": "生产日报",
        "fields": [
            {
                "key": "title",
                "label": "产线/工位",
                "type": "text",
                "placeholder": "如A线",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "计划产量",
                "type": "number",
                "placeholder": "件",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "实际产量",
                "type": "number",
                "placeholder": "件",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "停机时长(分钟)",
                "type": "number",
                "placeholder": "分钟",
                "optional": False
            }
        ]
    },
    {
        "name": "停机原因分析",
        "category": "生产OEE",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "停机原因记录零散，无法追溯根因，影响OEE改善。通过表单记录每次停机原因（设备故障、换型、缺料等），汇总分析TOP问题。",
        "page_kind": "form_list",
        "default_category": "production-oee",
        "form_headline": "停机原因记录",
        "fields": [
            {
                "key": "title",
                "label": "设备名称",
                "type": "text",
                "placeholder": "如CNC-01",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "停机开始时间",
                "type": "date",
                "placeholder": "选择日期时间",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "停机结束时间",
                "type": "date",
                "placeholder": "选择日期时间",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "停机原因",
                "type": "text",
                "placeholder": "如设备故障",
                "optional": False
            }
        ]
    },
    {
        "name": "换型时间统计",
        "category": "生产OEE",
        "capability_key": "mfg_oee",
        "pages": "form+list",
        "problem": "换型时间缺乏标准化记录，难以识别浪费。通过表单记录每次换型开始/结束时间及类型，自动计算换型时长，支持SMED改善。",
        "page_kind": "form_list",
        "default_category": "production-oee",
        "form_headline": "换型时间记录",
        "fields": [
            {
                "key": "title",
                "label": "工单号",
                "type": "text",
                "placeholder": "如WO-001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "换型开始时间",
                "type": "date",
                "placeholder": "选择日期时间",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "换型结束时间",
                "type": "date",
                "placeholder": "选择日期时间",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "换型类型",
                "type": "text",
                "placeholder": "如模具更换",
                "optional": False
            }
        ]
    },
    {
        "name": "节拍异常预警",
        "category": "生产OEE",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "产线节拍异常无法实时感知，导致产能损失。通过对接设备传感器数据，当实际节拍超过标准节拍阈值时，自动推送预警消息到班组长。",
        "page_kind": "notify",
        "default_category": "production-oee",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "产能达成看板",
        "category": "生产OEE",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "管理层无法直观了解每日产能达成情况，决策滞后。通过图表展示各产线计划产量、实际产量、达成率及趋势，支持钻取查看明细。",
        "page_kind": "chart",
        "default_category": "production-oee",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "来料质检记录",
        "category": "质量SPC",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "来料批次多，纸质记录易丢失，无法追溯供应商质量表现，真库闭环实现电子化记录与统计。",
        "page_kind": "form_list",
        "default_category": "incoming_inspection",
        "form_headline": "来料质检报告",
        "fields": [
            {
                "key": "title",
                "label": "批次号",
                "type": "text",
                "placeholder": "如 B20241001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "供应商",
                "type": "text",
                "placeholder": "供应商名称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "检验结果",
                "type": "text",
                "placeholder": "合格/不合格",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "不合格原因等",
                "optional": True
            }
        ]
    },
    {
        "name": "过程检SPC监控",
        "category": "质量SPC",
        "capability_key": "quality_inspect",
        "pages": "chart+list",
        "problem": "过程检测数据分散，无法实时监控CPK，异常发现滞后，真库闭环实现SPC图表与预警。",
        "page_kind": "chart",
        "default_category": "process_spc",
        "form_headline": "过程检SPC数据",
        "fields": [
            {
                "key": "title",
                "label": "工序",
                "type": "text",
                "placeholder": "如焊接工位",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "测量值",
                "type": "number",
                "placeholder": "实测数值",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "规格上限",
                "type": "number",
                "placeholder": "USL",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "规格下限",
                "type": "number",
                "placeholder": "LSL",
                "optional": False
            }
        ]
    },
    {
        "name": "不合格品评审",
        "category": "质量SPC",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "不合格品评审流程线下流转慢，处置意见不统一，真库闭环实现电子评审与闭环跟踪。",
        "page_kind": "form_list",
        "default_category": "nonconformance_review",
        "form_headline": "不合格品评审单",
        "fields": [
            {
                "key": "title",
                "label": "不合格编号",
                "type": "text",
                "placeholder": "如NCR-001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "产品名称",
                "type": "text",
                "placeholder": "产品名称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "处置方式",
                "type": "text",
                "placeholder": "返工/报废/让步",
                "optional": False
            },
            {
                "key": "note",
                "label": "评审意见",
                "type": "textarea",
                "placeholder": "详细意见",
                "optional": True
            }
        ]
    },
    {
        "name": "客诉返工跟踪",
        "category": "质量SPC",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "客户投诉返工任务无系统跟踪，易遗漏或超期，真库闭环实现返工单全流程监控。",
        "page_kind": "form_list",
        "default_category": "customer_return",
        "form_headline": "客诉返工单",
        "fields": [
            {
                "key": "title",
                "label": "客诉编号",
                "type": "text",
                "placeholder": "如CASE-001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "产品型号",
                "type": "text",
                "placeholder": "产品型号",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "返工数量",
                "type": "number",
                "placeholder": "数量",
                "optional": False
            },
            {
                "key": "note",
                "label": "返工说明",
                "type": "textarea",
                "placeholder": "返工步骤",
                "optional": True
            }
        ]
    },
    {
        "name": "成品检报告",
        "category": "质量SPC",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "成品检验报告手工填写效率低，数据难汇总分析，真库闭环实现电子报告与合格率统计。",
        "page_kind": "form_list",
        "default_category": "final_inspection",
        "form_headline": "成品检验报告",
        "fields": [
            {
                "key": "title",
                "label": "成品批次",
                "type": "text",
                "placeholder": "如F20241001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "检验项目",
                "type": "text",
                "placeholder": "外观/尺寸/性能",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "检验结果",
                "type": "text",
                "placeholder": "合格/不合格",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "不合格项描述",
                "optional": True
            }
        ]
    },
    {
        "name": "领料单登记",
        "category": "物料仓储",
        "capability_key": "material_issue",
        "pages": "form+list",
        "problem": "纸质领料单易丢失、数据滞后，无法实时追踪物料去向，导致库存账实不符。通过表单登记领料信息，自动更新库存台账。",
        "page_kind": "form_list",
        "default_category": "material-warehouse",
        "form_headline": "领料登记",
        "fields": [
            {
                "key": "title",
                "label": "领料单号",
                "type": "text",
                "placeholder": "自动生成或手动输入",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "物料编码",
                "type": "text",
                "placeholder": "如：M-001",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "数量",
                "type": "number",
                "placeholder": "请输入数量",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "领料人",
                "type": "text",
                "placeholder": "员工姓名",
                "optional": False
            }
        ]
    },
    {
        "name": "退料单登记",
        "category": "物料仓储",
        "capability_key": "material_issue",
        "pages": "form+list",
        "problem": "退料流程不规范，退回物料无记录，造成库存虚增或浪费。通过表单记录退料原因和数量，及时更新库存。",
        "page_kind": "form_list",
        "default_category": "material-warehouse",
        "form_headline": "退料登记",
        "fields": [
            {
                "key": "title",
                "label": "退料单号",
                "type": "text",
                "placeholder": "自动生成或手动输入",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "物料编码",
                "type": "text",
                "placeholder": "如：M-001",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "退料数量",
                "type": "number",
                "placeholder": "请输入数量",
                "optional": False
            },
            {
                "key": "note",
                "label": "退料原因",
                "type": "textarea",
                "placeholder": "如：质量问题、多余领料",
                "optional": True
            }
        ]
    },
    {
        "name": "齐套检查",
        "category": "物料仓储",
        "capability_key": "material_issue",
        "pages": "form+list",
        "problem": "生产前无法快速确认物料是否齐套，导致产线停工待料。通过录入工单BOM，系统自动比对库存，输出缺料清单。",
        "page_kind": "form_list",
        "default_category": "material-warehouse",
        "form_headline": "齐套检查",
        "fields": [
            {
                "key": "title",
                "label": "工单号",
                "type": "text",
                "placeholder": "如：WO-20231001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "产品编码",
                "type": "text",
                "placeholder": "如：P-001",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "计划数量",
                "type": "number",
                "placeholder": "请输入计划生产数量",
                "optional": False
            }
        ]
    },
    {
        "name": "超发预警",
        "category": "物料仓储",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "领料超发无预警，导致库存短缺或成本失控。系统根据BOM定额和已领用量，超发时自动推送预警消息给仓库主管。",
        "page_kind": "notify",
        "default_category": "material-warehouse",
        "form_headline": "超发预警配置",
        "fields": [
            {
                "key": "title",
                "label": "预警名称",
                "type": "text",
                "placeholder": "如：超发预警-工单WO001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "物料编码",
                "type": "text",
                "placeholder": "如：M-001",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "超发阈值",
                "type": "number",
                "placeholder": "如：10（单位：件）",
                "optional": False
            }
        ]
    },
    {
        "name": "盘点任务",
        "category": "物料仓储",
        "capability_key": "material_issue",
        "pages": "form+list",
        "problem": "盘点依赖纸质表格，数据汇总慢、易出错。通过移动端录入盘点数据，自动生成差异报表，支持复盘。",
        "page_kind": "form_list",
        "default_category": "material-warehouse",
        "form_headline": "盘点录入",
        "fields": [
            {
                "key": "title",
                "label": "盘点单号",
                "type": "text",
                "placeholder": "自动生成或手动输入",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "物料编码",
                "type": "text",
                "placeholder": "如：M-001",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "盘点数量",
                "type": "number",
                "placeholder": "请输入实际盘点数量",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "差异原因等",
                "optional": True
            }
        ]
    },
    {
        "name": "隐患随手拍",
        "category": "安环班组",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "一线员工发现安全隐患后上报流程繁琐，纸质记录易丢失，闭环追踪困难；通过手机拍照+表单提交，自动推送给责任人整改并归档。",
        "page_kind": "form_list",
        "default_category": "safety-hazard",
        "form_headline": "隐患上报",
        "fields": [
            {
                "key": "title",
                "label": "隐患描述",
                "type": "text",
                "placeholder": "简要描述隐患情况",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "隐患位置",
                "type": "text",
                "placeholder": "如：3号车间东侧通道",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "隐患照片",
                "type": "text",
                "placeholder": "拍照上传",
                "optional": True
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "其他说明",
                "optional": True
            }
        ]
    },
    {
        "name": "班前会记录",
        "category": "安环班组",
        "capability_key": "training_record",
        "pages": "form+list",
        "problem": "班前会内容靠纸质签到和手写记录，无法追溯和统计；通过电子化记录会议内容、参会人员、安全交底，形成可查档案。",
        "page_kind": "form_list",
        "default_category": "shift-meeting",
        "form_headline": "班前会记录",
        "fields": [
            {
                "key": "title",
                "label": "会议主题",
                "type": "text",
                "placeholder": "如：早班安全交底",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "参会人数",
                "type": "number",
                "placeholder": "实际到会人数",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "会议内容",
                "type": "textarea",
                "placeholder": "安全注意事项、任务分配等",
                "optional": False
            },
            {
                "key": "note",
                "label": "记录人",
                "type": "text",
                "placeholder": "姓名",
                "optional": True
            }
        ]
    },
    {
        "name": "排班与考勤",
        "category": "安环班组",
        "capability_key": "shift_attendance",
        "pages": "form+list",
        "problem": "班组排班靠手工Excel，考勤数据分散，无法实时统计出勤和工时；通过排班表与打卡数据关联，自动生成考勤报表。",
        "page_kind": "form_list",
        "default_category": "attendance",
        "form_headline": "排班调整",
        "fields": [
            {
                "key": "title",
                "label": "班次名称",
                "type": "text",
                "placeholder": "如：早班/中班/夜班",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "人员名单",
                "type": "text",
                "placeholder": "用逗号分隔姓名",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "调班原因等",
                "optional": True
            }
        ]
    },
    {
        "name": "特种作业证管理",
        "category": "安环班组",
        "capability_key": "kb_document",
        "pages": "files",
        "problem": "特种作业人员证书到期未提醒，无证上岗风险高；通过证书电子化存档、到期自动预警，确保持证上岗。",
        "page_kind": "files",
        "default_category": "certificate",
        "form_headline": "证书上传",
        "fields": [
            {
                "key": "title",
                "label": "证书名称",
                "type": "text",
                "placeholder": "如：电焊工操作证",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "持证人",
                "type": "text",
                "placeholder": "姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "有效期至",
                "type": "date",
                "placeholder": "选择到期日期",
                "optional": False
            },
            {
                "key": "note",
                "label": "证书照片",
                "type": "text",
                "placeholder": "上传扫描件",
                "optional": True
            }
        ]
    },
    {
        "name": "能耗碳排看板",
        "category": "安环班组",
        "capability_key": "energy_carbon",
        "pages": "chart",
        "problem": "车间能耗数据分散在电表、气表，无法实时监控和对比；通过接入IoT数据，可视化展示能耗趋势和碳排放量，辅助节能决策。",
        "page_kind": "chart",
        "default_category": "energy",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "SOP智能问答",
        "category": "工艺集成",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "现场操作工查询SOP需翻阅纸质文档或电脑，效率低易出错；通过对话式AI直接检索最新版SOP并返回步骤，闭环知识库。",
        "page_kind": "chat_kb",
        "default_category": "process-integration",
        "form_headline": "SOP问答配置",
        "fields": [
            {
                "key": "title",
                "label": "问答标题",
                "type": "text",
                "placeholder": "如：焊接工序SOP问答",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "关联文档",
                "type": "text",
                "placeholder": "选择SOP文档",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "可选说明",
                "optional": True
            }
        ]
    },
    {
        "name": "图纸BOM检索",
        "category": "工艺集成",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "工程师查找图纸和BOM需登录多个系统，版本混乱；统一知识库按物料号或图号检索最新图纸与BOM清单。",
        "page_kind": "files",
        "default_category": "process-integration",
        "form_headline": "图纸BOM上传",
        "fields": [
            {
                "key": "title",
                "label": "文件名称",
                "type": "text",
                "placeholder": "如：A001-变速箱总成图纸",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "物料号",
                "type": "text",
                "placeholder": "如：M-12345",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "版本",
                "type": "text",
                "placeholder": "如：V2.1",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "可选",
                "optional": True
            }
        ]
    },
    {
        "name": "MES工单同步",
        "category": "工艺集成",
        "capability_key": "erp_connector",
        "pages": "integration",
        "problem": "MES与ERP工单数据割裂，计划员需手动录入报工数据，易延迟出错；自动同步工单状态与报工数据至ERP。",
        "page_kind": "integration",
        "default_category": "process-integration",
        "form_headline": "MES工单同步配置",
        "fields": [
            {
                "key": "title",
                "label": "同步任务名",
                "type": "text",
                "placeholder": "如：产线A工单同步",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "MES接口地址",
                "type": "text",
                "placeholder": "http://mes-api/orders",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "ERP系统",
                "type": "text",
                "placeholder": "如：SAP",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "可选",
                "optional": True
            }
        ]
    },
    {
        "name": "工艺变更记录",
        "category": "工艺集成",
        "capability_key": "training_record",
        "pages": "form+list",
        "problem": "工艺变更后培训记录分散，无法追溯变更执行情况；通过表单记录变更内容及培训确认，形成闭环。",
        "page_kind": "form_list",
        "default_category": "process-integration",
        "form_headline": "工艺变更培训记录",
        "fields": [
            {
                "key": "title",
                "label": "变更编号",
                "type": "text",
                "placeholder": "如：ECN-2024-001",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "变更描述",
                "type": "text",
                "placeholder": "简要描述变更内容",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "培训人员",
                "type": "text",
                "placeholder": "工号或姓名",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "可选",
                "optional": True
            }
        ]
    },
    {
        "name": "ERP报工看板",
        "category": "工艺集成",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "生产报工数据分散在ERP模块，管理层无法实时掌握产线效率；通过图表展示报工达成率与工时分布。",
        "page_kind": "chart",
        "default_category": "process-integration",
        "form_headline": "报工看板配置",
        "fields": [
            {
                "key": "title",
                "label": "看板名称",
                "type": "text",
                "placeholder": "如：产线A报工看板",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "数据源",
                "type": "text",
                "placeholder": "ERP报工表",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "可选",
                "optional": True
            }
        ]
    }
]

SCENES_BY_NAME = {s['name']: s for s in SCENES}

def mfg_pack_scenes() -> list[dict[str, str]]:
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

def enrich_mfg_menu_plan_item(item: dict, name: str) -> dict:
    row = SCENES_BY_NAME.get(name)
    if not row:
        return item
    ck = str(row.get('capability_key') or '').strip()
    if ck:
        item['capability_key'] = ck
    return item
