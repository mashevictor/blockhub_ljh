"""教育培训 场景 → 真能力 SSOT（DeepSeek 丰富）。"""

from __future__ import annotations

SCENES: list[dict] = [
    {
        "name": "家校通知",
        "category": "家校协同",
        "capability_key": "school_notice",
        "pages": "form+list",
        "problem": "学校通知无法精准触达家长，重要信息易遗漏；通过系统推送并跟踪已读未读，闭环家校沟通。",
        "page_kind": "form_list",
        "default_category": "school-notice",
        "form_headline": "发布家校通知",
        "fields": [
            {
                "key": "title",
                "label": "通知标题",
                "type": "text",
                "placeholder": "请输入通知标题",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "通知内容",
                "type": "textarea",
                "placeholder": "请输入通知内容",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "发送对象",
                "type": "text",
                "placeholder": "选择班级或全体",
                "optional": False
            }
        ]
    },
    {
        "name": "作业答疑",
        "category": "家校协同",
        "capability_key": "homework_qa",
        "pages": "chat+kb",
        "problem": "家长辅导作业困难，学生疑问无法及时解答；通过AI问答和知识库提供作业辅导，闭环学习支持。",
        "page_kind": "chat_kb",
        "default_category": "homework-qa",
        "form_headline": "作业答疑",
        "fields": []
    },
    {
        "name": "课程表同步",
        "category": "家校协同",
        "capability_key": "class_schedule",
        "pages": "form+list",
        "problem": "课程调整频繁，家长无法及时获取最新课表；系统同步课程表并推送变更，闭环信息同步。",
        "page_kind": "form_list",
        "default_category": "class-schedule",
        "form_headline": "课程表管理",
        "fields": [
            {
                "key": "title",
                "label": "课程名称",
                "type": "text",
                "placeholder": "如：数学",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "上课时间",
                "type": "text",
                "placeholder": "如：周一 08:00-08:45",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "授课教师",
                "type": "text",
                "placeholder": "教师姓名",
                "optional": False
            }
        ]
    },
    {
        "name": "成绩推送",
        "category": "家校协同",
        "capability_key": "edu_grade_alert",
        "pages": "notify",
        "problem": "考试成绩发布后家长无法及时知晓，沟通滞后；系统自动推送成绩并支持查看详情，闭环成绩通知。",
        "page_kind": "notify",
        "default_category": "grade-alert",
        "form_headline": "成绩推送",
        "fields": []
    },
    {
        "name": "缴费提醒",
        "category": "家校协同",
        "capability_key": "edu_tuition",
        "pages": "notify",
        "problem": "学费、活动费等缴费通知易被忽略，导致逾期；系统自动发送缴费提醒并跟踪缴费状态，闭环缴费管理。",
        "page_kind": "notify",
        "default_category": "tuition",
        "form_headline": "缴费提醒",
        "fields": []
    },
    {
        "name": "考勤通知",
        "category": "家校协同",
        "capability_key": "edu_attendance",
        "pages": "notify",
        "problem": "学生到校离校情况家长无法实时掌握，存在安全隐患；系统自动推送考勤记录，闭环安全监管。",
        "page_kind": "notify",
        "default_category": "attendance",
        "form_headline": "考勤通知",
        "fields": []
    },
    {
        "name": "成绩预警登记",
        "category": "学业评估",
        "capability_key": "edu_grade_alert",
        "pages": "form+list",
        "problem": "班主任无法批量登记不及格学生并自动通知家长，导致预警滞后；通过表单录入预警信息，系统自动推送通知。",
        "page_kind": "form_list",
        "default_category": "grade-alert",
        "form_headline": "成绩预警登记",
        "fields": [
            {
                "key": "title",
                "label": "学生姓名",
                "type": "text",
                "placeholder": "请输入学生姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "预警科目",
                "type": "text",
                "placeholder": "如数学",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "预警分数",
                "type": "number",
                "placeholder": "请输入分数",
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
        "name": "薄弱知识点分析",
        "category": "学业评估",
        "capability_key": "edu_quiz",
        "pages": "chat+kb",
        "problem": "教师难以快速定位班级共性薄弱知识点；通过知识库上传测验数据，AI自动分析并生成报告。",
        "page_kind": "chat_kb",
        "default_category": "weak-points",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "单元测验分析",
        "category": "学业评估",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "单元测验后缺乏可视化分析，教师无法直观了解班级整体表现；通过图表展示平均分、最高分、分数段分布。",
        "page_kind": "chart",
        "default_category": "quiz-analysis",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "作业完成率统计",
        "category": "学业评估",
        "capability_key": "edu_attendance",
        "pages": "chart",
        "problem": "作业完成率数据分散，无法实时监控；通过图表展示每日/每周作业提交率，辅助教学管理。",
        "page_kind": "chart",
        "default_category": "homework-completion",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "学情画像报告",
        "category": "学业评估",
        "capability_key": "data_nl_query",
        "pages": "chat+kb",
        "problem": "家长和教师需要个性化学情报告，但数据分散难以整合；通过自然语言查询生成学生综合画像。",
        "page_kind": "chat_kb",
        "default_category": "student-profile",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "进步榜通知",
        "category": "学业评估",
        "capability_key": "edu_makeup",
        "pages": "notify",
        "problem": "进步学生缺乏及时表彰，激励效果不足；系统自动计算进步幅度并推送喜报到家长群。",
        "page_kind": "notify",
        "default_category": "progress-list",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "调课申请",
        "category": "教务排课",
        "capability_key": "class_schedule",
        "pages": "form+list",
        "problem": "教师临时调课需层层审批，手动协调教室易冲突，排课变更无法实时同步学生与教务系统。",
        "page_kind": "form_list",
        "default_category": "class-schedule",
        "form_headline": "调课申请",
        "fields": [
            {
                "key": "title",
                "label": "课程名称",
                "type": "text",
                "placeholder": "例：高等数学A",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "原上课时间",
                "type": "text",
                "placeholder": "例：周一第1-2节",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "新上课时间",
                "type": "text",
                "placeholder": "例：周三第3-4节",
                "optional": False
            },
            {
                "key": "note",
                "label": "调课原因",
                "type": "textarea",
                "placeholder": "请说明调课原因",
                "optional": False
            }
        ]
    },
    {
        "name": "教室冲突检测",
        "category": "教务排课",
        "capability_key": "class_schedule",
        "pages": "chat+kb",
        "problem": "排课时教室资源紧张，人工检查易遗漏，导致同一时段教室被重复分配。",
        "page_kind": "chat_kb",
        "default_category": "class-schedule",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "课表查询",
        "category": "教务排课",
        "capability_key": "class_schedule",
        "pages": "chat+kb",
        "problem": "学生和教师需频繁查询课表，传统方式操作繁琐，无法快速获取个性化课表。",
        "page_kind": "chat_kb",
        "default_category": "class-schedule",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "考试安排",
        "category": "教务排课",
        "capability_key": "class_schedule",
        "pages": "form+list",
        "problem": "考试时间、考场、监考人员安排依赖人工协调，信息分散易出错，通知不及时。",
        "page_kind": "form_list",
        "default_category": "exam-schedule",
        "form_headline": "考试安排",
        "fields": [
            {
                "key": "title",
                "label": "考试名称",
                "type": "text",
                "placeholder": "例：期中考试",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "考试日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "考场",
                "type": "text",
                "placeholder": "例：教学楼301",
                "optional": False
            },
            {
                "key": "note",
                "label": "监考教师",
                "type": "text",
                "placeholder": "例：张三、李四",
                "optional": True
            }
        ]
    },
    {
        "name": "代课登记",
        "category": "教务排课",
        "capability_key": "class_schedule",
        "pages": "form+list",
        "problem": "教师因故无法上课需找人代课，代课信息无法及时同步，影响教学秩序。",
        "page_kind": "form_list",
        "default_category": "substitute-teacher",
        "form_headline": "代课登记",
        "fields": [
            {
                "key": "title",
                "label": "原任课教师",
                "type": "text",
                "placeholder": "例：王老师",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "代课教师",
                "type": "text",
                "placeholder": "例：李老师",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "代课时间",
                "type": "text",
                "placeholder": "例：2024-03-15 第3节",
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
        "name": "学期校历",
        "category": "教务排课",
        "capability_key": "class_schedule",
        "pages": "chat+kb",
        "problem": "学期安排、节假日、考试周等信息分散，师生无法快速获取统一校历。",
        "page_kind": "chat_kb",
        "default_category": "academic-calendar",
        "form_headline": "",
        "fields": []
    },
    {
        "name": "题库练习",
        "category": "教学互动",
        "capability_key": "edu_quiz",
        "pages": "form+list",
        "problem": "传统纸质练习分发回收效率低，缺乏即时反馈；在线题库支持自动批改与成绩统计，提升练习效果。",
        "page_kind": "form_list",
        "default_category": "quiz",
        "form_headline": "新建题库练习",
        "fields": [
            {
                "key": "title",
                "label": "练习名称",
                "type": "text",
                "placeholder": "如：单元测试1",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "科目",
                "type": "text",
                "placeholder": "如：数学",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "题目数量",
                "type": "number",
                "placeholder": "如：20",
                "optional": False
            }
        ]
    },
    {
        "name": "在线答疑",
        "category": "教学互动",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "课后学生疑问分散，教师无法实时响应；AI助手结合知识库提供7x24小时答疑，并沉淀常见问题。",
        "page_kind": "chat_kb",
        "default_category": "chat-qa",
        "form_headline": "在线答疑设置",
        "fields": [
            {
                "key": "title",
                "label": "答疑课程",
                "type": "text",
                "placeholder": "如：物理答疑",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "教师",
                "type": "text",
                "placeholder": "如：张老师",
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
        "name": "课本学习",
        "category": "教学互动",
        "capability_key": "edu_textbook",
        "pages": "kb",
        "problem": "纸质课本内容固定，无法互动；电子课本支持标注、笔记和知识点关联，提升学习效率。",
        "page_kind": "files",
        "default_category": "textbook",
        "form_headline": "上传课本资源",
        "fields": [
            {
                "key": "title",
                "label": "课本名称",
                "type": "text",
                "placeholder": "如：语文一年级上册",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "版本",
                "type": "text",
                "placeholder": "如：人教版",
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
        "name": "家默督导",
        "category": "教学互动",
        "capability_key": "study_coach",
        "pages": "form+list",
        "problem": "家长无法有效监督家默，教师难以检查；系统记录默写结果并生成报告，辅助家校共育。",
        "page_kind": "form_list",
        "default_category": "study-coach",
        "form_headline": "家默任务发布",
        "fields": [
            {
                "key": "title",
                "label": "默写内容",
                "type": "text",
                "placeholder": "如：第3课生词",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "班级",
                "type": "text",
                "placeholder": "如：二年级2班",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "截止时间",
                "type": "date",
                "placeholder": "如：2025-03-20",
                "optional": False
            }
        ]
    },
    {
        "name": "错题本",
        "category": "教学互动",
        "capability_key": "edu_grade_alert",
        "pages": "chart",
        "problem": "学生错题分散难以整理，重复犯错；系统自动收集错题并生成薄弱点分析图表，针对性巩固。",
        "page_kind": "chart",
        "default_category": "grade-alert",
        "form_headline": "错题本配置",
        "fields": [
            {
                "key": "title",
                "label": "错题本名称",
                "type": "text",
                "placeholder": "如：数学错题本",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "学生",
                "type": "text",
                "placeholder": "如：张三",
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
        "name": "学费收缴管理",
        "category": "学籍财务",
        "capability_key": "edu_tuition",
        "pages": "form+list",
        "problem": "学费收缴依赖人工催缴，对账繁琐，家长缴费状态不透明，需系统自动生成缴费单并实时更新缴费状态。",
        "page_kind": "form_list",
        "default_category": "tuition",
        "form_headline": "学费收缴",
        "fields": [
            {
                "key": "title",
                "label": "学生姓名",
                "type": "text",
                "placeholder": "请输入学生姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "应缴金额",
                "type": "number",
                "placeholder": "请输入应缴金额",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "缴费截止日期",
                "type": "date",
                "placeholder": "请选择截止日期",
                "optional": False
            }
        ]
    },
    {
        "name": "退费申请处理",
        "category": "学籍财务",
        "capability_key": "edu_transfer",
        "pages": "form+list",
        "problem": "退费流程繁琐，需多部门审批，家长等待时间长，缺乏进度追踪。",
        "page_kind": "form_list",
        "default_category": "refund",
        "form_headline": "退费申请",
        "fields": [
            {
                "key": "title",
                "label": "学生姓名",
                "type": "text",
                "placeholder": "请输入学生姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "退费金额",
                "type": "number",
                "placeholder": "请输入退费金额",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "退费原因",
                "type": "textarea",
                "placeholder": "请描述退费原因",
                "optional": False
            }
        ]
    },
    {
        "name": "学籍异动管理",
        "category": "学籍财务",
        "capability_key": "edu_transfer",
        "pages": "form+list",
        "problem": "转班、休学等学籍异动依赖纸质申请，信息同步滞后，影响财务结算。",
        "page_kind": "form_list",
        "default_category": "enrollment_change",
        "form_headline": "学籍异动申请",
        "fields": [
            {
                "key": "title",
                "label": "学生姓名",
                "type": "text",
                "placeholder": "请输入学生姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "异动类型",
                "type": "text",
                "placeholder": "如转班、休学、退学",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "异动日期",
                "type": "date",
                "placeholder": "请选择异动日期",
                "optional": False
            }
        ]
    },
    {
        "name": "教材发放登记",
        "category": "学籍财务",
        "capability_key": "edu_textbook",
        "pages": "form+list",
        "problem": "教材发放记录混乱，库存不清，学生领书无凭证，易产生纠纷。",
        "page_kind": "form_list",
        "default_category": "textbook_distribution",
        "form_headline": "教材发放登记",
        "fields": [
            {
                "key": "title",
                "label": "学生姓名",
                "type": "text",
                "placeholder": "请输入学生姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "教材名称",
                "type": "text",
                "placeholder": "请输入教材名称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "数量",
                "type": "number",
                "placeholder": "请输入数量",
                "optional": False
            }
        ]
    },
    {
        "name": "奖学金申请审核",
        "category": "学籍财务",
        "capability_key": "edu_transfer",
        "pages": "form+list",
        "problem": "奖学金申请材料多，评审标准不透明，结果通知不及时。",
        "page_kind": "form_list",
        "default_category": "scholarship",
        "form_headline": "奖学金申请",
        "fields": [
            {
                "key": "title",
                "label": "学生姓名",
                "type": "text",
                "placeholder": "请输入学生姓名",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "申请奖项",
                "type": "text",
                "placeholder": "请输入奖学金名称",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "成绩排名",
                "type": "text",
                "placeholder": "如年级前10%",
                "optional": False
            }
        ]
    },
    {
        "name": "教研备课协作",
        "category": "师资教研",
        "capability_key": "kb_document",
        "pages": "form+list",
        "problem": "教师备课资源分散，缺乏统一教案库，教研组协作低效；通过教案上传、标签分类与检索实现闭环。",
        "page_kind": "form_list",
        "default_category": "lesson-plan",
        "form_headline": "上传教案",
        "fields": [
            {
                "key": "title",
                "label": "教案标题",
                "type": "text",
                "placeholder": "如：二次函数复习课",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "学科",
                "type": "text",
                "placeholder": "如：数学",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "年级",
                "type": "text",
                "placeholder": "如：初三",
                "optional": False
            },
            {
                "key": "note",
                "label": "备注",
                "type": "textarea",
                "placeholder": "教学反思或注意事项",
                "optional": True
            }
        ]
    },
    {
        "name": "听课评课反馈",
        "category": "师资教研",
        "capability_key": "edu_quiz",
        "pages": "form+list",
        "problem": "听课评课缺乏标准化记录与跟踪，反馈易丢失；通过评课表单提交、评分与改进建议闭环。",
        "page_kind": "form_list",
        "default_category": "class-evaluation",
        "form_headline": "评课记录",
        "fields": [
            {
                "key": "title",
                "label": "授课教师",
                "type": "text",
                "placeholder": "如：张老师",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "课程名称",
                "type": "text",
                "placeholder": "如：Unit 3 Reading",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "评分",
                "type": "number",
                "placeholder": "1-10分",
                "optional": False
            },
            {
                "key": "note",
                "label": "改进建议",
                "type": "textarea",
                "placeholder": "具体建议",
                "optional": True
            }
        ]
    },
    {
        "name": "培训报名管理",
        "category": "师资教研",
        "capability_key": "edu_attendance",
        "pages": "form+list",
        "problem": "教师培训报名依赖纸质或群接龙，统计困难；通过在线报名、名额限制与签到记录闭环。",
        "page_kind": "form_list",
        "default_category": "training-registration",
        "form_headline": "培训报名",
        "fields": [
            {
                "key": "title",
                "label": "培训主题",
                "type": "text",
                "placeholder": "如：新课标解读",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "姓名",
                "type": "text",
                "placeholder": "教师姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "部门",
                "type": "text",
                "placeholder": "如：数学教研组",
                "optional": False
            }
        ]
    },
    {
        "name": "公开课预约",
        "category": "师资教研",
        "capability_key": "class_schedule",
        "pages": "form+list",
        "problem": "公开课安排冲突、教师预约不便；通过在线预约、时间冲突检测与课表展示闭环。",
        "page_kind": "form_list",
        "default_category": "open-class",
        "form_headline": "预约公开课",
        "fields": [
            {
                "key": "title",
                "label": "课题",
                "type": "text",
                "placeholder": "如：光的折射",
                "optional": False
            },
            {
                "key": "field_a",
                "label": "授课教师",
                "type": "text",
                "placeholder": "教师姓名",
                "optional": False
            },
            {
                "key": "field_b",
                "label": "日期",
                "type": "date",
                "placeholder": "选择日期",
                "optional": False
            },
            {
                "key": "field_c",
                "label": "节次",
                "type": "text",
                "placeholder": "如：第2节",
                "optional": False
            }
        ]
    },
    {
        "name": "师资档案查询",
        "category": "师资教研",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "教师档案（职称、荣誉、培训记录）分散难查；通过知识库问答快速检索教师信息闭环。",
        "page_kind": "chat_kb",
        "default_category": "teacher-profile",
        "form_headline": "",
        "fields": []
    }
]

SCENES_BY_NAME = {s['name']: s for s in SCENES}

def edu_pack_scenes() -> list[dict[str, str]]:
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

def enrich_edu_menu_plan_item(item: dict, name: str) -> dict:
    row = SCENES_BY_NAME.get(name)
    if not row:
        return item
    ck = str(row.get('capability_key') or '').strip()
    if ck:
        item['capability_key'] = ck
    return item
