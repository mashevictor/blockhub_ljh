"""法律服务 场景 → 真能力 SSOT（DeepSeek 丰富）。"""

from __future__ import annotations

SCENES: list[dict] = [
    {
        "name": "立案登记",
        "category": "案件立案",
        "capability_key": "legal_case",
        "pages": "form+list",
        "problem": "律师需手动录入案件信息，易遗漏关键字段，且无法自动生成案号，导致立案效率低、数据混乱。通过表单登记后自动生成案号并存入案件库，实现闭环管理。",
        "page_kind": "form_list",
        "default_category": "case-filing",
        "form_headline": "立案登记",
        "fields": [
            {
                "key": "title",
                "label": "案件名称",
                "type": "text",
                "placeholder": "请输入案件名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "当事人",
                "type": "text",
                "placeholder": "请输入当事人姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "案由",
                "type": "text",
                "placeholder": "如合同纠纷",
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
        "name": "利益冲突检索",
        "category": "案件立案",
        "capability_key": "legal_preserve",
        "pages": "form+list",
        "problem": "接案前无法快速检索律所内是否存在利益冲突，易违反职业道德。通过输入当事人或对方当事人名称，自动比对已有案件库，返回冲突结果。",
        "page_kind": "form_list",
        "default_category": "conflict-check",
        "form_headline": "利益冲突检索",
        "fields": [
            {
                "key": "title",
                "label": "当事人名称",
                "type": "text",
                "placeholder": "输入当事人或对方当事人",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "案件类型",
                "type": "text",
                "placeholder": "如民事、刑事",
                "optional": True
            }
        ]
    },
    {
        "name": "当事人建档",
        "category": "案件立案",
        "capability_key": "legal_case",
        "pages": "form+list",
        "problem": "当事人信息分散在邮件、文档中，无法统一管理。通过表单录入当事人基本信息、联系方式、历史案件，形成当事人档案库，支持快速查询。",
        "page_kind": "form_list",
        "default_category": "client-profile",
        "form_headline": "当事人建档",
        "fields": [
            {
                "key": "title",
                "label": "姓名/名称",
                "type": "text",
                "placeholder": "请输入当事人姓名或单位名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "联系方式",
                "type": "text",
                "placeholder": "手机或邮箱",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "证件号",
                "type": "text",
                "placeholder": "身份证或统一社会信用代码",
                "optional": True
            }
        ]
    },
    {
        "name": "管辖审查",
        "category": "案件立案",
        "capability_key": "legal_preserve",
        "pages": "form+list",
        "problem": "立案前需人工判断法院是否有管辖权，易出错。通过输入案件要素（地域、标的额等），自动匹配管辖规则，给出建议管辖法院。",
        "page_kind": "form_list",
        "default_category": "jurisdiction-review",
        "form_headline": "管辖审查",
        "fields": [
            {
                "key": "title",
                "label": "案件类型",
                "type": "text",
                "placeholder": "如合同纠纷、侵权",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "标的额（元）",
                "type": "number",
                "placeholder": "请输入标的金额",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "被告所在地",
                "type": "text",
                "placeholder": "如北京市朝阳区",
                "optional": False
            }
        ]
    },
    {
        "name": "诉讼保全申请",
        "category": "案件立案",
        "capability_key": "legal_preserve",
        "pages": "form+list",
        "problem": "保全申请材料多、格式要求严格，手动填写易遗漏。通过表单引导填写保全类型、财产线索、担保信息，自动生成申请文书草稿。",
        "page_kind": "form_list",
        "default_category": "preservation-apply",
        "form_headline": "诉讼保全申请",
        "fields": [
            {
                "key": "title",
                "label": "保全类型",
                "type": "text",
                "placeholder": "财产保全/证据保全",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "财产线索",
                "type": "textarea",
                "placeholder": "描述财产信息",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "担保方式",
                "type": "text",
                "placeholder": "现金/保函/抵押",
                "optional": True
            }
        ]
    },
    {
        "name": "证据台账管理",
        "category": "证据鉴定",
        "capability_key": "legal_evidence",
        "pages": "form+list",
        "problem": "案件证据分散在纸质卷宗和不同系统中，无法快速检索和跟踪证据状态，导致举证遗漏或重复。通过证据台账统一登记、分类和状态追踪，实现证据全生命周期管理。",
        "page_kind": "form_list",
        "default_category": "evidence-ledger",
        "form_headline": "新增证据条目",
        "fields": [
            {
                "key": "title",
                "label": "证据名称",
                "type": "text",
                "placeholder": "如：合同原件",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "证据类型",
                "type": "text",
                "placeholder": "书证/物证/电子数据等",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "关联案件",
                "type": "text",
                "placeholder": "案号或案件名称",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "存放位置、保管人等",
                "optional": True
            }
        ]
    },
    {
        "name": "鉴定委托流程",
        "category": "证据鉴定",
        "capability_key": "legal_evidence",
        "pages": "form+list",
        "problem": "委托鉴定机构时，委托书、检材清单、鉴定要求等材料反复沟通，流程不透明，进度难追踪。通过标准化委托表单和流程跟踪，确保委托规范、进度可视。",
        "page_kind": "form_list",
        "default_category": "appraisal-commission",
        "form_headline": "鉴定委托申请",
        "fields": [
            {
                "key": "title",
                "label": "委托事项",
                "type": "text",
                "placeholder": "如：笔迹鉴定",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "鉴定机构",
                "type": "text",
                "placeholder": "机构名称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "检材清单",
                "type": "textarea",
                "placeholder": "列出检材名称、数量",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "特殊要求等",
                "optional": True
            }
        ]
    },
    {
        "name": "证据交换记录",
        "category": "证据鉴定",
        "capability_key": "legal_evidence",
        "pages": "form+list",
        "problem": "证据交换过程缺乏记录，对方提交的证据清单和己方质证意见易丢失。通过证据交换登记，记录交换时间、证据清单和质证意见，便于庭审引用。",
        "page_kind": "form_list",
        "default_category": "evidence-exchange",
        "form_headline": "证据交换记录",
        "fields": [
            {
                "key": "title",
                "label": "交换批次",
                "type": "text",
                "placeholder": "如：第一次证据交换",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "对方证据清单",
                "type": "textarea",
                "placeholder": "证据名称、份数",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "己方质证意见",
                "type": "textarea",
                "placeholder": "对每份证据的意见",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "交换日期、地点等",
                "optional": True
            }
        ]
    },
    {
        "name": "证人出庭管理",
        "category": "证据鉴定",
        "capability_key": "legal_hearing",
        "pages": "form+list",
        "problem": "证人出庭安排混乱，通知、证言要点、出庭状态缺乏统一管理。通过证人出庭登记，记录证人信息、证言要点和出庭状态，确保庭审顺利。",
        "page_kind": "form_list",
        "default_category": "witness-management",
        "form_headline": "证人出庭登记",
        "fields": [
            {
                "key": "title",
                "label": "证人姓名",
                "type": "text",
                "placeholder": "姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "证言要点",
                "type": "textarea",
                "placeholder": "证明事项",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "出庭状态",
                "type": "text",
                "placeholder": "已通知/已确认/已出庭",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "联系方式、注意事项",
                "optional": True
            }
        ]
    },
    {
        "name": "电子证据固定",
        "category": "证据鉴定",
        "capability_key": "legal_evidence",
        "pages": "form+list",
        "problem": "电子证据（邮件、网页、聊天记录）易被篡改，固定过程缺乏规范记录。通过电子证据固定登记，记录取证时间、方式、哈希值等，确保证据效力。",
        "page_kind": "form_list",
        "default_category": "digital-evidence",
        "form_headline": "电子证据固定记录",
        "fields": [
            {
                "key": "title",
                "label": "证据名称",
                "type": "text",
                "placeholder": "如：邮件截图",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "固定方式",
                "type": "text",
                "placeholder": "截图/录屏/哈希校验等",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "哈希值",
                "type": "text",
                "placeholder": "SHA256值",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "取证时间、工具等",
                "optional": True
            }
        ]
    },
    {
        "name": "开庭排期管理",
        "category": "诉讼排期",
        "capability_key": "legal_case",
        "pages": "form+list",
        "problem": "律师无法集中管理所有案件的庭审时间，易遗漏或冲突，通过系统统一录入开庭排期并自动提醒，避免错过庭审。",
        "page_kind": "form_list",
        "default_category": "hearing-schedule",
        "form_headline": "新增开庭排期",
        "fields": [
            {
                "key": "title",
                "label": "案件名称",
                "type": "text",
                "placeholder": "请输入案件名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "开庭日期",
                "type": "date",
                "placeholder": "选择开庭日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "法庭地点",
                "type": "text",
                "placeholder": "请输入法庭地点",
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
        "name": "延期申请审批",
        "category": "诉讼排期",
        "capability_key": "legal_case",
        "pages": "form+list",
        "problem": "律师需频繁申请延期开庭，纸质流程效率低且易丢失，通过线上提交延期申请并关联案件，审批后自动更新排期。",
        "page_kind": "form_list",
        "default_category": "postponement-request",
        "form_headline": "延期申请",
        "fields": [
            {
                "key": "title",
                "label": "案件名称",
                "type": "text",
                "placeholder": "请输入案件名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "原开庭日期",
                "type": "date",
                "placeholder": "选择原开庭日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "申请延期至",
                "type": "date",
                "placeholder": "选择新日期",
                "optional": False
            },
            {
                "key": "note",
                "label": "延期理由",
                "type": "textarea",
                "placeholder": "请详细说明延期理由",
                "optional": False
            }
        ]
    },
    {
        "name": "庭审纪要记录",
        "category": "诉讼排期",
        "capability_key": "legal_hearing",
        "pages": "form+list",
        "problem": "庭审过程关键信息散落，事后追溯困难，通过结构化记录庭审纪要，支持按案件检索，提升复盘效率。",
        "page_kind": "form_list",
        "default_category": "hearing-notes",
        "form_headline": "新增庭审纪要",
        "fields": [
            {
                "key": "title",
                "label": "案件名称",
                "type": "text",
                "placeholder": "请输入案件名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "庭审日期",
                "type": "date",
                "placeholder": "选择庭审日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "法官",
                "type": "text",
                "placeholder": "请输入法官姓名",
                "optional": False
            },
            {
                "key": "note",
                "label": "纪要内容",
                "type": "textarea",
                "placeholder": "记录庭审要点",
                "optional": False
            }
        ]
    },
    {
        "name": "上诉期限提醒",
        "category": "诉讼排期",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "上诉期限严格，人工记忆易超期导致失权，系统自动计算并推送提醒，确保按时上诉。",
        "page_kind": "notify",
        "default_category": "appeal-deadline",
        "form_headline": "上诉期限提醒配置",
        "fields": [
            {
                "key": "title",
                "label": "案件名称",
                "type": "text",
                "placeholder": "请输入案件名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "判决日期",
                "type": "date",
                "placeholder": "选择判决日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "提醒提前天数",
                "type": "number",
                "placeholder": "如15",
                "optional": False
            }
        ]
    },
    {
        "name": "执行立案申请",
        "category": "诉讼排期",
        "capability_key": "legal_enforce",
        "pages": "form+list",
        "problem": "判决生效后执行立案流程繁琐，材料准备不规范易被退回，通过标准化表单提交申请，自动校验材料完整性。",
        "page_kind": "form_list",
        "default_category": "enforcement-filing",
        "form_headline": "执行立案申请",
        "fields": [
            {
                "key": "title",
                "label": "案件名称",
                "type": "text",
                "placeholder": "请输入案件名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "判决案号",
                "type": "text",
                "placeholder": "如(2023)京01民初1号",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "申请执行金额",
                "type": "number",
                "placeholder": "请输入金额（元）",
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
        "name": "合同审查",
        "category": "非诉合同",
        "capability_key": "legal_contract_ops",
        "pages": "form+list",
        "problem": "合同审查流程繁琐，缺乏标准化审查清单，导致风险遗漏；系统提供审查任务分配与条款风险点记录，闭环管理。",
        "page_kind": "form_list",
        "default_category": "contract-review",
        "form_headline": "合同审查申请",
        "fields": [
            {
                "key": "title",
                "label": "合同名称",
                "type": "text",
                "placeholder": "输入合同名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "合同类型",
                "type": "text",
                "placeholder": "如采购、销售、租赁",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "审查要点",
                "type": "textarea",
                "placeholder": "描述需要审查的重点条款",
                "optional": True
            }
        ]
    },
    {
        "name": "条款风险点",
        "category": "非诉合同",
        "capability_key": "legal_contract_ops",
        "pages": "chat+kb",
        "problem": "合同条款风险识别依赖个人经验，缺乏知识库支撑；通过知识库问答快速定位风险条款，提升审查效率。",
        "page_kind": "chat_kb",
        "default_category": "clause-risk",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "律师函",
        "category": "非诉合同",
        "capability_key": "legal_contract_ops",
        "pages": "form+list",
        "problem": "律师函起草缺乏模板与流程管理，版本混乱；系统提供模板库与审批流程，确保律师函质量与可追溯。",
        "page_kind": "form_list",
        "default_category": "legal-letter",
        "form_headline": "律师函起草申请",
        "fields": [
            {
                "key": "title",
                "label": "函件标题",
                "type": "text",
                "placeholder": "如催款律师函",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "收件方",
                "type": "text",
                "placeholder": "对方公司或个人",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "事实摘要",
                "type": "textarea",
                "placeholder": "简要描述事实背景",
                "optional": False
            }
        ]
    },
    {
        "name": "常法顾问问答",
        "category": "非诉合同",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "常法顾问咨询重复率高，缺乏知识沉淀；通过智能问答与知识库，快速解答常见法律问题，减少人工重复劳动。",
        "page_kind": "chat_kb",
        "default_category": "legal-advisor-qa",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "执行案件登记",
        "category": "执行回款",
        "capability_key": "legal_enforce",
        "page_kind": "form_list",
        "problem": "执行案件信息分散在邮件和Excel中，无法统一管理立案、承办人、标的额等关键字段，导致回款进度不透明。",
        "form_headline": "执行案件登记",
        "fields": [
            {
                "key": "title",
                "label": "案件名称",
                "type": "text",
                "placeholder": "如：张三诉李四借款纠纷执行案",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "案号",
                "type": "text",
                "placeholder": "如：(2023)京0105执12345号",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "承办律师",
                "type": "text",
                "placeholder": "律师姓名",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "执行标的额（元）",
                "type": "number",
                "placeholder": "如：1000000",
                "optional": False
            }
        ]
    },
    {
        "name": "财产线索提报",
        "category": "执行回款",
        "capability_key": "legal_enforce",
        "page_kind": "form_list",
        "problem": "财产线索零散分布在微信、邮件中，缺乏统一提报和跟进机制，容易遗漏关键财产信息。",
        "form_headline": "财产线索提报",
        "fields": [
            {
                "key": "title",
                "label": "线索名称",
                "type": "text",
                "placeholder": "如：被执行人房产线索",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "财产类型",
                "type": "text",
                "placeholder": "如：房产、车辆、银行存款",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "线索描述",
                "type": "textarea",
                "placeholder": "详细描述财产位置、权属等信息",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "关联案件",
                "type": "text",
                "placeholder": "关联执行案号",
                "optional": True
            }
        ]
    },
    {
        "name": "失信名单跟踪",
        "category": "执行回款",
        "capability_key": "legal_enforce",
        "page_kind": "notify",
        "problem": "无法及时获取被执行人被纳入失信名单的状态变化，错过追加或惩戒时机。",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "回款进度看板",
        "category": "执行回款",
        "capability_key": "legal_enforce",
        "page_kind": "chart",
        "problem": "回款数据分散，管理层无法直观查看各案件回款率、周期和趋势，决策缺乏数据支撑。",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "法规RAG检索",
        "category": "法规知识",
        "capability_key": "policy_qa",
        "pages": "chat+kb",
        "problem": "律师人工检索法规耗时且易遗漏，通过RAG检索知识库，输入自然语言即可精准定位相关法条，闭环知识库。",
        "page_kind": "chat_kb",
        "default_category": "legal-regulations",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "案例库智能问答",
        "category": "法规知识",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "裁判文书数量庞大，律师难以快速找到类似案例，通过案例库问答系统，输入案情即可获得相似案例及裁判要点。",
        "page_kind": "chat_kb",
        "default_category": "case-law",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "司法解释问答",
        "category": "法规知识",
        "capability_key": "policy_qa",
        "pages": "chat+kb",
        "problem": "司法解释更新频繁，律师难以掌握最新解释，通过司法解释知识库问答，实时获取权威解读。",
        "page_kind": "chat_kb",
        "default_category": "judicial-interpretation",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "时效计算器辅助",
        "category": "法规知识",
        "capability_key": "legal_case",
        "pages": "form+list",
        "problem": "诉讼时效计算复杂易出错，通过时效计算器表单输入起算日、期限等，自动计算截止日并生成记录列表。",
        "page_kind": "form_list",
        "default_category": "limitation-calculator",
        "form_headline": "时效计算",
        "fields": [
            {
                "key": "title",
                "label": "案件名称",
                "type": "text",
                "placeholder": "输入案件名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "起算日期",
                "type": "date",
                "placeholder": "选择起算日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "时效期限（年）",
                "type": "number",
                "placeholder": "输入年限",
                "optional": False
            }
        ]
    },
    {
        "name": "合规培训题库",
        "category": "法规知识",
        "capability_key": "kb_document",
        "pages": "files",
        "problem": "合规培训缺乏针对性题库，通过上传法规文档自动生成试题，并管理题库文件。",
        "page_kind": "files",
        "default_category": "compliance-training",
        "form_headline": "",
        "fields": []
    }
]

SCENES_BY_NAME = {s['name']: s for s in SCENES}

def legal_pack_scenes() -> list[dict[str, str]]:
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

def enrich_legal_menu_plan_item(item: dict, name: str) -> dict:
    row = SCENES_BY_NAME.get(name)
    if not row:
        return item
    ck = str(row.get('capability_key') or '').strip()
    if ck:
        item['capability_key'] = ck
    return item
