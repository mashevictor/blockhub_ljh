"""建筑工程 场景 → 真能力 SSOT（DeepSeek 丰富）。"""

from __future__ import annotations

SCENES: list[dict] = [
    {
        "name": "隐患整改闭环",
        "category": "现场安监",
        "capability_key": "const_safety",
        "pages": "form+list",
        "problem": "隐患整改纸质记录易丢失，无法追踪闭环，真库自动关联整改前后照片与验收人，确保100%销项。",
        "page_kind": "form_list",
        "default_category": "hazard-rectification",
        "form_headline": "隐患整改记录",
        "fields": [
            {
                "key": "title",
                "label": "隐患描述",
                "type": "text",
                "placeholder": "例如：临边防护缺失",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "整改责任人",
                "type": "text",
                "placeholder": "选择或输入",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "整改期限",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "note",
                "label": "整改措施",
                "type": "textarea",
                "placeholder": "详细描述",
                "optional": True
            }
        ]
    },
    {
        "name": "高处作业许可",
        "category": "现场安监",
        "capability_key": "const_safety",
        "pages": "form+list",
        "problem": "高处作业审批流于形式，无电子化记录，真库自动校验作业人员资质与安全措施，到期自动提醒。",
        "page_kind": "form_list",
        "default_category": "height-work-permit",
        "form_headline": "高处作业许可证",
        "fields": [
            {
                "key": "title",
                "label": "作业地点",
                "type": "text",
                "placeholder": "例如：3号楼5层",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "作业高度",
                "type": "number",
                "placeholder": "单位：米",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "作业人员",
                "type": "text",
                "placeholder": "持证人员姓名",
                "optional": False
            },
            {
                "key": "note",
                "label": "安全措施",
                "type": "textarea",
                "placeholder": "安全带、安全网等",
                "optional": True
            }
        ]
    },
    {
        "name": "临边防护检查",
        "category": "现场安监",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "临边防护检查依赖纸质巡检表，数据难汇总，真库自动生成检查记录并关联整改工单。",
        "page_kind": "form_list",
        "default_category": "edge-protection-check",
        "form_headline": "临边防护检查表",
        "fields": [
            {
                "key": "title",
                "label": "检查部位",
                "type": "text",
                "placeholder": "例如：基坑东侧",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "检查结果",
                "type": "text",
                "placeholder": "合格/不合格",
                "optional": False
            },
            {
                "key": "note",
                "label": "问题描述",
                "type": "textarea",
                "placeholder": "不合格时填写",
                "optional": True
            }
        ]
    },
    {
        "name": "安全交底记录",
        "category": "现场安监",
        "capability_key": "const_safety",
        "pages": "form+list",
        "problem": "安全交底纸质签字易造假，真库电子签名+人脸识别，交底内容自动推送至作业人员手机。",
        "page_kind": "form_list",
        "default_category": "safety-disclosure",
        "form_headline": "安全交底记录",
        "fields": [
            {
                "key": "title",
                "label": "交底内容",
                "type": "text",
                "placeholder": "例如：高处作业安全",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "交底人",
                "type": "text",
                "placeholder": "安全员姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "被交底人",
                "type": "text",
                "placeholder": "作业人员姓名",
                "optional": False
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
        "name": "事故快报",
        "category": "现场安监",
        "capability_key": "const_safety",
        "pages": "form+list",
        "problem": "事故上报流程慢，信息传递失真，真库一键上报并自动通知应急小组，同步生成事故档案。",
        "page_kind": "form_list",
        "default_category": "accident-report",
        "form_headline": "事故快报表",
        "fields": [
            {
                "key": "title",
                "label": "事故类型",
                "type": "text",
                "placeholder": "例如：高处坠落",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "发生时间",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "伤亡人数",
                "type": "number",
                "placeholder": "0",
                "optional": False
            },
            {
                "key": "note",
                "label": "事故经过",
                "type": "textarea",
                "placeholder": "简要描述",
                "optional": True
            }
        ]
    },
    {
        "name": "材料进场验收",
        "category": "质量验收",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "材料进场时纸质单据易丢失、信息不透明，导致后续追溯困难；通过系统记录验收数据并关联检验报告，实现闭环管理。",
        "page_kind": "form_list",
        "default_category": "quality_acceptance",
        "form_headline": "材料进场验收记录",
        "fields": [
            {
                "key": "title",
                "label": "材料名称",
                "type": "text",
                "placeholder": "如：钢筋HRB400",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "进场数量",
                "type": "number",
                "placeholder": "单位：吨",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "验收日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "note",
                "label": "验收结论",
                "type": "textarea",
                "placeholder": "合格/不合格及说明",
                "optional": True
            }
        ]
    },
    {
        "name": "隐蔽工程验收",
        "category": "质量验收",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "隐蔽工程覆盖前未及时验收，后期返工成本高；通过移动端拍照记录、签字确认，确保验收流程可追溯。",
        "page_kind": "form_list",
        "default_category": "quality_acceptance",
        "form_headline": "隐蔽工程验收记录",
        "fields": [
            {
                "key": "title",
                "label": "验收部位",
                "type": "text",
                "placeholder": "如：地下室底板防水",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "验收人",
                "type": "text",
                "placeholder": "监理/施工方代表",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "验收日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "note",
                "label": "验收意见",
                "type": "textarea",
                "placeholder": "合格/不合格及整改要求",
                "optional": True
            }
        ]
    },
    {
        "name": "检验批验收",
        "category": "质量验收",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "检验批数据分散在纸质表格中，统计分析困难；系统化记录检验批主控项目和一般项目，自动生成合格率报表。",
        "page_kind": "form_list",
        "default_category": "quality_acceptance",
        "form_headline": "检验批验收记录",
        "fields": [
            {
                "key": "title",
                "label": "检验批名称",
                "type": "text",
                "placeholder": "如：模板安装检验批",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "主控项目合格率",
                "type": "number",
                "placeholder": "百分比，如95",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "一般项目合格率",
                "type": "number",
                "placeholder": "百分比，如90",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "不合格项说明",
                "optional": True
            }
        ]
    },
    {
        "name": "实测实量",
        "category": "质量验收",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "现场实测数据手工记录易出错，且难以汇总分析；通过移动端录入垂直度、平整度等数据，自动计算偏差并生成统计图表。",
        "page_kind": "form_list",
        "default_category": "quality_acceptance",
        "form_headline": "实测实量记录",
        "fields": [
            {
                "key": "title",
                "label": "测量部位",
                "type": "text",
                "placeholder": "如：3层剪力墙",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "垂直度偏差(mm)",
                "type": "number",
                "placeholder": "实测值",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "平整度偏差(mm)",
                "type": "number",
                "placeholder": "实测值",
                "optional": False
            },
            {
                "key": "note",
                "label": "是否合格",
                "type": "textarea",
                "placeholder": "合格/不合格",
                "optional": True
            }
        ]
    },
    {
        "name": "不合格品处理",
        "category": "质量验收",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "不合格品处理流程不闭环，整改结果无法跟踪；系统记录不合格项、整改措施及复查结果，形成闭环管理。",
        "page_kind": "form_list",
        "default_category": "quality_acceptance",
        "form_headline": "不合格品处理记录",
        "fields": [
            {
                "key": "title",
                "label": "不合格品描述",
                "type": "text",
                "placeholder": "如：混凝土强度不足",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "整改措施",
                "type": "text",
                "placeholder": "如：返工处理",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "复查日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "note",
                "label": "复查结论",
                "type": "textarea",
                "placeholder": "合格/不合格",
                "optional": True
            }
        ]
    },
    {
        "name": "形象进度填报",
        "category": "进度签证",
        "capability_key": "const_progress",
        "pages": "form+list",
        "problem": "现场进度数据分散，无法实时汇总，导致管理层决策滞后。通过移动端填报形象进度，自动汇总至项目看板。",
        "page_kind": "form_list",
        "default_category": "progress",
        "form_headline": "形象进度填报",
        "fields": [
            {
                "key": "title",
                "label": "分部分项工程",
                "type": "text",
                "placeholder": "如：主体结构-3层",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "完成百分比",
                "type": "number",
                "placeholder": "0-100",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "填报日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "施工情况说明",
                "optional": True
            }
        ]
    },
    {
        "name": "工期预警",
        "category": "进度签证",
        "capability_key": "const_visa",
        "pages": "notify",
        "problem": "关键节点延误无法及时通知，导致项目延期。系统自动对比计划与实际进度，超期自动推送预警。",
        "page_kind": "notify",
        "default_category": "progress",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "工程签证",
        "category": "进度签证",
        "capability_key": "const_visa",
        "pages": "form+list",
        "problem": "签证单流转慢，纸质易丢失，结算时扯皮。线上发起签证，关联合同与变更，审批后自动归档。",
        "page_kind": "form_list",
        "default_category": "acceptance",
        "form_headline": "工程签证单",
        "fields": [
            {
                "key": "title",
                "label": "签证编号",
                "type": "text",
                "placeholder": "自动生成",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "签证内容",
                "type": "textarea",
                "placeholder": "描述变更原因及工程量",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "涉及金额",
                "type": "number",
                "placeholder": "元",
                "optional": False
            },
            {
                "key": "note",
                "label": "附件",
                "type": "text",
                "placeholder": "上传相关文件",
                "optional": True
            }
        ]
    },
    {
        "name": "变更洽商",
        "category": "进度签证",
        "capability_key": "const_visa",
        "pages": "form+list",
        "problem": "设计变更沟通成本高，版本混乱。线上洽商记录变更过程，关联图纸与签证，确保可追溯。",
        "page_kind": "form_list",
        "default_category": "acceptance",
        "form_headline": "变更洽商记录",
        "fields": [
            {
                "key": "title",
                "label": "变更编号",
                "type": "text",
                "placeholder": "自动生成",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "变更描述",
                "type": "textarea",
                "placeholder": "变更原因及内容",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "提出方",
                "type": "text",
                "placeholder": "设计/施工/业主",
                "optional": False
            },
            {
                "key": "note",
                "label": "关联图纸",
                "type": "text",
                "placeholder": "图纸编号",
                "optional": True
            }
        ]
    },
    {
        "name": "关键节点管控",
        "category": "进度签证",
        "capability_key": "const_visa",
        "pages": "chart",
        "problem": "关键节点进度不透明，无法直观对比。通过甘特图展示计划与实际，偏差一目了然。",
        "page_kind": "chart",
        "default_category": "progress",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "劳务实名登记",
        "category": "劳务物资",
        "capability_key": "const_labor",
        "pages": "form+list",
        "problem": "工人入场信息手工登记易错漏，无法与考勤联动，需实名制闭环管理。",
        "page_kind": "form_list",
        "default_category": "labor",
        "form_headline": "劳务人员实名登记",
        "fields": [
            {
                "key": "title",
                "label": "姓名",
                "type": "text",
                "placeholder": "请输入姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "身份证号",
                "type": "text",
                "placeholder": "请输入身份证号",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "工种",
                "type": "text",
                "placeholder": "如钢筋工",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "进场日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            }
        ]
    },
    {
        "name": "材料调拨单",
        "category": "劳务物资",
        "capability_key": "deco_material",
        "pages": "form+list",
        "problem": "项目间材料调拨缺乏标准化流程，库存数据滞后，易造成浪费或短缺。",
        "page_kind": "form_list",
        "default_category": "material",
        "form_headline": "材料调拨申请",
        "fields": [
            {
                "key": "title",
                "label": "材料名称",
                "type": "text",
                "placeholder": "如钢筋",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "调出项目",
                "type": "text",
                "placeholder": "选择项目",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "调入项目",
                "type": "text",
                "placeholder": "选择项目",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "数量",
                "type": "number",
                "placeholder": "输入数量",
                "optional": False
            }
        ]
    },
    {
        "name": "机械进出场记录",
        "category": "劳务物资",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "大型机械进出场时间、状态靠纸质单，无法实时追踪，易产生租赁费用纠纷。",
        "page_kind": "form_list",
        "default_category": "equipment",
        "form_headline": "机械进出场登记",
        "fields": [
            {
                "key": "title",
                "label": "机械名称",
                "type": "text",
                "placeholder": "如塔吊",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "车牌/编号",
                "type": "text",
                "placeholder": "输入编号",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "进出场类型",
                "type": "text",
                "placeholder": "进场/出场",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "时间",
                "type": "date",
                "placeholder": "选择时间",
                "optional": False
            }
        ]
    },
    {
        "name": "分包结算登记",
        "category": "劳务物资",
        "capability_key": "const_labor",
        "pages": "form+list",
        "problem": "分包结算数据分散，人工汇总易错，与产值对比困难，影响付款效率。",
        "page_kind": "form_list",
        "default_category": "subcontract",
        "form_headline": "分包结算登记",
        "fields": [
            {
                "key": "title",
                "label": "分包单位",
                "type": "text",
                "placeholder": "输入单位名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "合同编号",
                "type": "text",
                "placeholder": "输入合同编号",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "结算金额",
                "type": "number",
                "placeholder": "输入金额",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "结算周期",
                "type": "text",
                "placeholder": "如2025年1月",
                "optional": False
            }
        ]
    },
    {
        "name": "周转材盘点",
        "category": "劳务物资",
        "capability_key": "deco_material",
        "pages": "form+list",
        "problem": "周转材（模板、脚手架）丢失率高，盘点靠人工，数据不准确，成本失控。",
        "page_kind": "form_list",
        "default_category": "material",
        "form_headline": "周转材盘点记录",
        "fields": [
            {
                "key": "title",
                "label": "材料名称",
                "type": "text",
                "placeholder": "如钢管",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "规格",
                "type": "text",
                "placeholder": "如Φ48",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "盘点数量",
                "type": "number",
                "placeholder": "输入数量",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "存放位置",
                "type": "text",
                "placeholder": "如1号堆场",
                "optional": False
            }
        ]
    },
    {
        "name": "图纸会审记录",
        "category": "图纸交底",
        "capability_key": "const_accept",
        "pages": "form+list",
        "problem": "图纸会审意见分散在纸质或微信，无法追溯闭环，导致施工返工。系统内记录会审问题、责任人和整改状态，形成闭环。",
        "page_kind": "form_list",
        "default_category": "drawing-review",
        "form_headline": "新增图纸会审记录",
        "fields": [
            {
                "key": "title",
                "label": "问题描述",
                "type": "textarea",
                "placeholder": "描述图纸问题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "责任人",
                "type": "text",
                "placeholder": "负责人姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "整改期限",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            }
        ]
    },
    {
        "name": "技术交底记录",
        "category": "图纸交底",
        "capability_key": "const_safety",
        "pages": "form+list",
        "problem": "技术交底缺乏标准化记录，工人凭记忆施工，质量隐患大。系统内填写交底内容、交底人和日期，支持查阅。",
        "page_kind": "form_list",
        "default_category": "tech-disclosure",
        "form_headline": "新增技术交底",
        "fields": [
            {
                "key": "title",
                "label": "交底内容",
                "type": "textarea",
                "placeholder": "输入交底内容",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "交底人",
                "type": "text",
                "placeholder": "交底人姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "交底日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            }
        ]
    },
    {
        "name": "BIM问题单",
        "category": "图纸交底",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "BIM模型问题反馈流程长，现场与模型不一致难以及时修正。系统内提交问题单，关联模型构件，跟踪处理状态。",
        "page_kind": "form_list",
        "default_category": "bim-issue",
        "form_headline": "新增BIM问题单",
        "fields": [
            {
                "key": "title",
                "label": "问题描述",
                "type": "textarea",
                "placeholder": "描述BIM问题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "构件ID",
                "type": "text",
                "placeholder": "如B-001",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "紧急程度",
                "type": "text",
                "placeholder": "高/中/低",
                "optional": False
            }
        ]
    },
    {
        "name": "设计变更台账",
        "category": "图纸交底",
        "capability_key": "const_visa",
        "pages": "form+list",
        "problem": "设计变更单传递不及时，现场按旧图施工造成返工。系统内登记变更内容、生效日期和影响范围，实时同步。",
        "page_kind": "form_list",
        "default_category": "design-change",
        "form_headline": "新增设计变更",
        "fields": [
            {
                "key": "title",
                "label": "变更内容",
                "type": "textarea",
                "placeholder": "描述变更内容",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "生效日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "变更编号",
                "type": "text",
                "placeholder": "如DC-001",
                "optional": False
            }
        ]
    },
    {
        "name": "竣工资料归档",
        "category": "图纸交底",
        "capability_key": "kb_document",
        "pages": "form+list",
        "problem": "竣工资料散落各处，验收时查找困难，影响交付。系统内上传资料、分类归档，支持检索。",
        "page_kind": "form_list",
        "default_category": "as-built-doc",
        "form_headline": "新增竣工资料",
        "fields": [
            {
                "key": "title",
                "label": "资料名称",
                "type": "text",
                "placeholder": "如竣工图",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "上传人",
                "type": "text",
                "placeholder": "姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "上传日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            }
        ]
    },
    {
        "name": "竣工验收清单",
        "category": "竣工收尾",
        "capability_key": "const_accept",
        "pages": "form+list",
        "problem": "竣工验收时纸质清单易丢失、整改项追踪难，通过数字化清单闭环验收流程。",
        "page_kind": "form_list",
        "default_category": "const_accept",
        "form_headline": "竣工验收清单",
        "fields": [
            {
                "key": "title",
                "label": "验收项目",
                "type": "text",
                "placeholder": "如：主体结构验收",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "验收日期",
                "type": "date",
                "placeholder": "",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "验收结论",
                "type": "text",
                "placeholder": "合格/不合格",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "整改要求等",
                "optional": True
            }
        ]
    },
    {
        "name": "消缺整改台账",
        "category": "竣工收尾",
        "capability_key": "quality_inspect",
        "pages": "form+list",
        "problem": "消缺项分散在微信群、纸质单，无法闭环跟踪，通过台账统一记录、指派、销项。",
        "page_kind": "form_list",
        "default_category": "quality_inspect",
        "form_headline": "消缺整改记录",
        "fields": [
            {
                "key": "title",
                "label": "问题描述",
                "type": "text",
                "placeholder": "如：墙面裂缝",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "责任单位",
                "type": "text",
                "placeholder": "如：土建班组",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "整改期限",
                "type": "date",
                "placeholder": "",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "整改状态",
                "type": "text",
                "placeholder": "待整改/已完成",
                "optional": False
            }
        ]
    },
    {
        "name": "保修回访记录",
        "category": "竣工收尾",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "保修期内业主报修无系统记录，回访不及时，通过表单记录报修、派单、回访全流程。",
        "page_kind": "form_list",
        "default_category": "site_patrol",
        "form_headline": "保修回访单",
        "fields": [
            {
                "key": "title",
                "label": "报修内容",
                "type": "text",
                "placeholder": "如：卫生间漏水",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "报修人",
                "type": "text",
                "placeholder": "业主姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "报修日期",
                "type": "date",
                "placeholder": "",
                "optional": False
            },
            {
                "key": "note",
                "label": "处理结果",
                "type": "textarea",
                "placeholder": "维修情况、回访满意度",
                "optional": True
            }
        ]
    },
    {
        "name": "结算争议纪要",
        "category": "竣工收尾",
        "capability_key": "kb_document",
        "pages": "form+list",
        "problem": "结算争议事项口头沟通易扯皮，缺乏书面记录，通过纪要表单固化争议点、协商结果。",
        "page_kind": "form_list",
        "default_category": "kb_document",
        "form_headline": "结算争议纪要",
        "fields": [
            {
                "key": "title",
                "label": "争议事项",
                "type": "text",
                "placeholder": "如：工程量计算差异",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "提出方",
                "type": "text",
                "placeholder": "总包/分包/甲方",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "协商日期",
                "type": "date",
                "placeholder": "",
                "optional": False
            },
            {
                "key": "note",
                "label": "协商结果",
                "type": "textarea",
                "placeholder": "最终意见、签字确认",
                "optional": True
            }
        ]
    }
]

SCENES_BY_NAME = {s['name']: s for s in SCENES}

def construction_pack_scenes() -> list[dict[str, str]]:
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

def enrich_construction_menu_plan_item(item: dict, name: str) -> dict:
    row = SCENES_BY_NAME.get(name)
    if not row:
        return item
    ck = str(row.get('capability_key') or '').strip()
    if ck:
        item['capability_key'] = ck
    return item
