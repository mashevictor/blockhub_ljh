"""政务公用 场景 → 真能力 SSOT（DeepSeek 丰富）。"""

from __future__ import annotations

SCENES: list[dict] = [
    {
        "name": "诉求受理登记",
        "category": "诉求热线",
        "capability_key": "gov_hotline",
        "pages": "form+list",
        "problem": "市民来电信息手工录入慢、易遗漏，需快速登记并自动关联历史诉求，减少重复录入。",
        "page_kind": "form_list",
        "default_category": "hotline-reception",
        "form_headline": "诉求受理登记",
        "fields": [
            {
                "key": "title",
                "label": "诉求标题",
                "type": "text",
                "placeholder": "简要描述诉求内容",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "来电人",
                "type": "text",
                "placeholder": "请输入姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "联系电话",
                "type": "text",
                "placeholder": "手机号或固话",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "诉求内容",
                "type": "textarea",
                "placeholder": "详细描述诉求",
                "optional": False
            }
        ]
    },
    {
        "name": "热线转办派单",
        "category": "诉求热线",
        "capability_key": "gov_hotline",
        "pages": "form+list",
        "problem": "转办部门不明确、派单流程长，需智能推荐承办单位并一键派发，缩短响应时间。",
        "page_kind": "form_list",
        "default_category": "hotline-dispatch",
        "form_headline": "热线转办派单",
        "fields": [
            {
                "key": "title",
                "label": "工单编号",
                "type": "text",
                "placeholder": "系统自动生成",
                "optional": True
            },
            {
                "key": "field_a",
                "label": "承办单位",
                "type": "text",
                "placeholder": "选择或输入承办单位",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "转办意见",
                "type": "textarea",
                "placeholder": "填写转办要求",
                "optional": False
            }
        ]
    },
    {
        "name": "催办督办管理",
        "category": "诉求热线",
        "capability_key": "gov_supervise",
        "pages": "form+list",
        "problem": "超期工单缺乏自动催办，需设置时限规则并自动发送催办通知，提升办结效率。",
        "page_kind": "form_list",
        "default_category": "hotline-urge",
        "form_headline": "催办督办管理",
        "fields": [
            {
                "key": "title",
                "label": "工单编号",
                "type": "text",
                "placeholder": "选择超期工单",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "催办次数",
                "type": "number",
                "placeholder": "自动累计",
                "optional": True
            },
            {
                "key": "field_b",
                "label": "催办备注",
                "type": "textarea",
                "placeholder": "催办说明",
                "optional": True
            }
        ]
    },
    {
        "name": "满意度回访记录",
        "category": "诉求热线",
        "capability_key": "gov_supervise",
        "pages": "form+list",
        "problem": "回访结果手工登记易出错，需结构化记录满意度评价并关联工单，便于统计分析。",
        "page_kind": "form_list",
        "default_category": "hotline-satisfaction",
        "form_headline": "满意度回访记录",
        "fields": [
            {
                "key": "title",
                "label": "工单编号",
                "type": "text",
                "placeholder": "选择已办结工单",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "满意度",
                "type": "text",
                "placeholder": "非常满意/满意/一般/不满意",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "回访备注",
                "type": "textarea",
                "placeholder": "市民反馈意见",
                "optional": True
            }
        ]
    },
    {
        "name": "重复诉求合并",
        "category": "诉求热线",
        "capability_key": "gov_supervise",
        "pages": "form+list",
        "problem": "同一市民多次来电内容相似，需自动识别重复诉求并合并关联，避免重复办理。",
        "page_kind": "form_list",
        "default_category": "hotline-merge",
        "form_headline": "重复诉求合并",
        "fields": [
            {
                "key": "title",
                "label": "主工单编号",
                "type": "text",
                "placeholder": "选择保留的工单",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "被合并工单",
                "type": "text",
                "placeholder": "输入需合并的工单编号",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "合并原因",
                "type": "textarea",
                "placeholder": "说明重复依据",
                "optional": True
            }
        ]
    },
    {
        "name": "紧急工单标记",
        "category": "诉求热线",
        "capability_key": "gov_hotline",
        "pages": "form+list",
        "problem": "涉及生命财产安全的诉求需快速响应，需标记紧急等级并触发优先处置流程。",
        "page_kind": "form_list",
        "default_category": "hotline-emergency",
        "form_headline": "紧急工单标记",
        "fields": [
            {
                "key": "title",
                "label": "工单编号",
                "type": "text",
                "placeholder": "选择需标记的工单",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "紧急等级",
                "type": "text",
                "placeholder": "一级/二级/三级",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "紧急说明",
                "type": "textarea",
                "placeholder": "描述紧急情况",
                "optional": True
            }
        ]
    },
    {
        "name": "网格事件上报",
        "category": "网格治理",
        "capability_key": "gov_grid",
        "pages": "form+list",
        "problem": "网格员巡查发现井盖破损、垃圾堆积等问题，需快速上报并跟踪处置，目前纸质记录流转慢、无法闭环。",
        "page_kind": "form_list",
        "default_category": "grid-event",
        "form_headline": "网格事件上报",
        "fields": [
            {
                "key": "title",
                "label": "事件标题",
                "type": "text",
                "placeholder": "如：XX路井盖破损",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "事件类型",
                "type": "text",
                "placeholder": "如：公共设施",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "发生地址",
                "type": "text",
                "placeholder": "如：XX街道XX路XX号",
                "optional": False
            },
            {
                "key": "note",
                "label": "详细描述",
                "type": "textarea",
                "placeholder": "描述事件具体情况",
                "optional": True
            }
        ]
    },
    {
        "name": "隐患上报",
        "category": "网格治理",
        "capability_key": "gov_grid",
        "pages": "form+list",
        "problem": "网格员发现消防通道堵塞、电线老化等安全隐患，需快速上报并流转至相关部门，传统方式效率低、易遗漏。",
        "page_kind": "form_list",
        "default_category": "grid-hazard",
        "form_headline": "隐患上报",
        "fields": [
            {
                "key": "title",
                "label": "隐患标题",
                "type": "text",
                "placeholder": "如：XX小区消防通道堵塞",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "隐患等级",
                "type": "text",
                "placeholder": "如：一般/重大",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "隐患地址",
                "type": "text",
                "placeholder": "如：XX小区X栋X单元",
                "optional": False
            },
            {
                "key": "note",
                "label": "隐患描述",
                "type": "textarea",
                "placeholder": "描述隐患具体情况",
                "optional": True
            }
        ]
    },
    {
        "name": "矛盾调解记录",
        "category": "网格治理",
        "capability_key": "gov_grid",
        "pages": "form+list",
        "problem": "邻里纠纷、家庭矛盾等调解过程缺乏数字化记录，无法形成案例库和统计分析，影响调解经验传承。",
        "page_kind": "form_list",
        "default_category": "grid-mediation",
        "form_headline": "矛盾调解记录",
        "fields": [
            {
                "key": "title",
                "label": "纠纷标题",
                "type": "text",
                "placeholder": "如：XX邻里噪音纠纷",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "当事人",
                "type": "text",
                "placeholder": "如：张三、李四",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "调解结果",
                "type": "text",
                "placeholder": "如：已和解/转交",
                "optional": False
            },
            {
                "key": "note",
                "label": "调解详情",
                "type": "textarea",
                "placeholder": "描述调解过程及结果",
                "optional": True
            }
        ]
    },
    {
        "name": "巡查打卡",
        "category": "网格治理",
        "capability_key": "gov_grid",
        "pages": "form+list",
        "problem": "网格员巡查路线和频次无法有效监管，存在漏巡、假巡现象，需数字化打卡记录。",
        "page_kind": "form_list",
        "default_category": "grid-patrol",
        "form_headline": "巡查打卡",
        "fields": [
            {
                "key": "title",
                "label": "巡查点位",
                "type": "text",
                "placeholder": "如：XX社区XX网格",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "巡查人员",
                "type": "text",
                "placeholder": "如：网格员姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "巡查时间",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "note",
                "label": "巡查备注",
                "type": "textarea",
                "placeholder": "如：一切正常/发现问题",
                "optional": True
            }
        ]
    },
    {
        "name": "人口信息核查",
        "category": "网格治理",
        "capability_key": "gov_grid",
        "pages": "form+list",
        "problem": "流动人口、出租屋信息更新不及时，数据不准确，影响社区管理和服务精准度。",
        "page_kind": "form_list",
        "default_category": "grid-population",
        "form_headline": "人口信息核查",
        "fields": [
            {
                "key": "title",
                "label": "户主姓名",
                "type": "text",
                "placeholder": "如：王五",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "住址",
                "type": "text",
                "placeholder": "如：XX小区X栋X单元X号",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "人口变动",
                "type": "text",
                "placeholder": "如：新增/迁出/变更",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "其他需要说明的情况",
                "optional": True
            }
        ]
    },
    {
        "name": "证照申领预审",
        "category": "行政审批",
        "capability_key": "gov_service",
        "pages": "form+list",
        "problem": "企业提交证照申领材料后，人工预审耗时且易遗漏，导致反复退件。通过智能表单预审规则自动校验材料完整性，预审通过后自动进入审批流程，减少退件率。",
        "page_kind": "form_list",
        "default_category": "gov_service",
        "form_headline": "证照申领预审",
        "fields": [
            {
                "key": "title",
                "label": "证照名称",
                "type": "text",
                "placeholder": "请输入证照名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "申请人",
                "type": "text",
                "placeholder": "请输入申请人姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "材料清单",
                "type": "textarea",
                "placeholder": "上传材料清单",
                "optional": False
            }
        ]
    },
    {
        "name": "补正告知通知",
        "category": "行政审批",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "审批过程中材料不齐需补正，传统电话或邮件通知效率低、易遗漏。通过系统自动生成补正告知书并推送至申请人，支持在线补正，闭环跟踪。",
        "page_kind": "notify",
        "default_category": "gov_service",
        "form_headline": "补正告知通知",
        "fields": [
            {
                "key": "title",
                "label": "办件编号",
                "type": "text",
                "placeholder": "请输入办件编号",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "补正内容",
                "type": "textarea",
                "placeholder": "请输入补正要求",
                "optional": False
            }
        ]
    },
    {
        "name": "办件进度查询",
        "category": "行政审批",
        "capability_key": "gov_service",
        "pages": "form+list",
        "problem": "申请人无法实时了解办件进度，需频繁电话咨询。通过系统提供办件进度查询入口，实时更新状态，支持短信/微信推送，减少咨询压力。",
        "page_kind": "form_list",
        "default_category": "gov_service",
        "form_headline": "办件进度查询",
        "fields": [
            {
                "key": "title",
                "label": "办件编号",
                "type": "text",
                "placeholder": "请输入办件编号",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "申请人",
                "type": "text",
                "placeholder": "请输入申请人姓名",
                "optional": True
            }
        ]
    },
    {
        "name": "许可证变更审批",
        "category": "行政审批",
        "capability_key": "gov_license",
        "pages": "form+list",
        "problem": "许可证变更涉及多部门并联审批，纸质流转周期长。通过线上表单提交变更申请，系统自动分派至相关部门并联审批，实时汇总意见，缩短办理时间。",
        "page_kind": "form_list",
        "default_category": "gov_license",
        "form_headline": "许可证变更审批",
        "fields": [
            {
                "key": "title",
                "label": "许可证编号",
                "type": "text",
                "placeholder": "请输入许可证编号",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "变更事项",
                "type": "text",
                "placeholder": "请输入变更事项",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "变更原因",
                "type": "textarea",
                "placeholder": "请输入变更原因",
                "optional": False
            }
        ]
    },
    {
        "name": "证照年检提醒",
        "category": "行政审批",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "证照年检到期无提醒，企业易遗忘导致处罚。系统自动计算年检日期，提前推送提醒通知，并附在线年检入口，实现闭环管理。",
        "page_kind": "notify",
        "default_category": "gov_service",
        "form_headline": "证照年检提醒",
        "fields": [
            {
                "key": "title",
                "label": "证照名称",
                "type": "text",
                "placeholder": "请输入证照名称",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "到期日期",
                "type": "date",
                "placeholder": "请选择到期日期",
                "optional": False
            }
        ]
    },
    {
        "name": "办事指南查询",
        "category": "便民服务",
        "capability_key": "gov_service",
        "page_kind": "chat_kb",
        "problem": "市民常因办事流程不清、材料不明而跑空，通过知识库问答直接获取最新办事指南，减少窗口咨询量。",
        "default_category": "gov_service_guide"
    },
    {
        "name": "预约取号管理",
        "category": "便民服务",
        "capability_key": "gov_service",
        "page_kind": "form_list",
        "problem": "线下排队耗时，市民需提前预约办事时段，系统自动分配号源并短信提醒，减少现场等待。",
        "default_category": "appointment",
        "form_headline": "预约取号",
        "fields": [
            {
                "key": "title",
                "label": "事项名称",
                "type": "text",
                "placeholder": "如：身份证补办",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "预约日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "预约时段",
                "type": "text",
                "placeholder": "如：09:00-10:00",
                "optional": False
            }
        ]
    },
    {
        "name": "一件事一次办",
        "category": "便民服务",
        "capability_key": "gov_service",
        "page_kind": "form_list",
        "problem": "多事项联办需重复提交材料，通过一件事主题打包，一次申请、并联审批，减少群众跑动次数。",
        "default_category": "one_thing",
        "form_headline": "一件事一次办申请",
        "fields": [
            {
                "key": "title",
                "label": "主题名称",
                "type": "text",
                "placeholder": "如：新生儿出生",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "申请人姓名",
                "type": "text",
                "placeholder": "请输入姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "身份证号",
                "type": "text",
                "placeholder": "请输入身份证号",
                "optional": False
            }
        ]
    },
    {
        "name": "跨区通办查询",
        "category": "便民服务",
        "capability_key": "gov_service",
        "page_kind": "chat_kb",
        "problem": "市民不清楚哪些事项可跨区办理，通过知识库问答快速获取通办事项清单及办理地点，避免跨区奔波。",
        "default_category": "cross_region"
    },
    {
        "name": "政策解读问答",
        "category": "便民服务",
        "capability_key": "policy_qa",
        "page_kind": "chat_kb",
        "problem": "政策文件晦涩难懂，市民难以理解，通过RAG问答直接解读政策要点，提升政策知晓率。",
        "default_category": "policy_interpretation"
    },
    {
        "name": "应急事件登记",
        "category": "应急公开",
        "capability_key": "gov_service",
        "page_kind": "form_list",
        "problem": "基层应急事件上报依赖电话和微信，信息碎片化，无法统一跟踪闭环。通过表单登记事件，自动生成台账并推送处置任务。",
        "default_category": "emergency_event",
        "form_headline": "应急事件登记",
        "fields": [
            {
                "key": "title",
                "label": "事件标题",
                "type": "text",
                "placeholder": "如：XX小区火灾",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "发生地点",
                "type": "text",
                "placeholder": "详细地址",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "事件类型",
                "type": "text",
                "placeholder": "火灾/地震/洪水等",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "上报人",
                "type": "text",
                "placeholder": "姓名",
                "optional": False
            }
        ]
    },
    {
        "name": "预警信息推送",
        "category": "应急公开",
        "capability_key": "gov_public",
        "page_kind": "notify",
        "problem": "气象、地质灾害预警依赖短信群发，无法精准触达特定区域人群。通过IM定向推送预警，并支持反馈确认。",
        "default_category": "alert_push",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "信息公开申请",
        "category": "应急公开",
        "capability_key": "gov_public",
        "page_kind": "form_list",
        "problem": "公众申请应急信息公开流程不透明，缺乏在线受理和进度查询。通过表单提交申请，系统自动分办并反馈结果。",
        "default_category": "info_disclosure",
        "form_headline": "信息公开申请表",
        "fields": [
            {
                "key": "title",
                "label": "申请事项",
                "type": "text",
                "placeholder": "如：XX事故调查报告",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "申请人",
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
            }
        ]
    },
    {
        "name": "舆情报送",
        "category": "应急公开",
        "capability_key": "gov_public",
        "page_kind": "form_list",
        "problem": "应急舆情信息零散，缺乏统一报送渠道，领导无法及时掌握。通过表单快速报送舆情，自动汇总生成舆情简报。",
        "default_category": "public_opinion",
        "form_headline": "舆情信息报送",
        "fields": [
            {
                "key": "title",
                "label": "舆情标题",
                "type": "text",
                "placeholder": "如：XX事件网络热议",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "来源平台",
                "type": "text",
                "placeholder": "微博/微信/抖音等",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "报送人",
                "type": "text",
                "placeholder": "姓名",
                "optional": False
            },
            {
                "key": "note",
                "label": "舆情摘要",
                "type": "textarea",
                "placeholder": "简要描述舆情内容",
                "optional": False
            }
        ]
    },
    {
        "name": "数据共享申请",
        "category": "基层数据",
        "capability_key": "gov_service",
        "page_kind": "form_list",
        "problem": "基层部门跨层级数据共享流程繁琐，纸质申请周期长，通过线上表单提交申请并自动流转审批，实现数据共享闭环。",
        "default_category": "data_sharing",
        "form_headline": "数据共享申请表",
        "fields": [
            {
                "key": "title",
                "label": "申请标题",
                "type": "text",
                "placeholder": "如：人口数据共享",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "申请部门",
                "type": "text",
                "placeholder": "如：街道办",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "数据范围",
                "type": "textarea",
                "placeholder": "描述所需数据字段",
                "optional": False
            },
            {
                "key": "note",
                "label": "申请理由",
                "type": "textarea",
                "placeholder": "说明用途",
                "optional": True
            }
        ]
    },
    {
        "name": "证照电子亮证",
        "category": "基层数据",
        "capability_key": "gov_license",
        "page_kind": "chat_kb",
        "problem": "群众办事忘带实体证照需往返跑，通过电子证照库在线亮证核验，减少跑动次数。",
        "default_category": "e_license"
    },
    {
        "name": "办件量看板",
        "category": "基层数据",
        "capability_key": "chart_dashboard",
        "page_kind": "chart",
        "problem": "基层办件数据分散难统计，通过可视化看板实时展示办件量趋势，辅助决策。",
        "default_category": "volume_dashboard"
    },
    {
        "name": "自然语言问数",
        "category": "基层数据",
        "capability_key": "data_nl_query",
        "page_kind": "chat_kb",
        "problem": "基层人员不懂SQL无法直接查数据库，通过自然语言提问自动生成查询结果，降低数据获取门槛。",
        "default_category": "nl_query"
    }
]

SCENES_BY_NAME = {s['name']: s for s in SCENES}

def gov_pack_scenes() -> list[dict[str, str]]:
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

def enrich_gov_menu_plan_item(item: dict, name: str) -> dict:
    row = SCENES_BY_NAME.get(name)
    if not row:
        return item
    ck = str(row.get('capability_key') or '').strip()
    if ck:
        item['capability_key'] = ck
    return item
