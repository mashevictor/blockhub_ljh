import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

export type OpsKind = ["edu_grade_alert", "edu_tuition", "edu_attendance", "edu_quiz", "edu_textbook", "edu_makeup", "edu_transfer", "energy_defect", "energy_ticket", "energy_spare", "energy_emissions", "energy_outage", "energy_hotwork", "energy_restore", "gov_appeal", "gov_grid", "gov_license", "gov_hotline", "gov_supervise", "gov_public", "legal_filing", "legal_evidence", "legal_hearing", "legal_contract_ops", "legal_enforce", "legal_preserve", "hr_perf", "hr_training", "hr_headcount", "hr_payroll", "hr_offer", "hr_idp", "const_safety", "const_accept", "const_progress", "const_visa", "const_labor", "agro_patrol", "agro_subsidy", "agro_inventory", "agro_pest", "agro_trace", "media_review", "media_calendar", "media_topic", "media_asset", "media_live", "auto_service", "auto_fleet", "auto_parts", "auto_claim", "auto_charge", "mkt_lead", "mkt_content", "mkt_ab_test", "mkt_roi", "mkt_sign", "mkt_coupon"][number]

interface RecordItem {
  id: string
  record_no: string
  title: string
  field_a: string
  field_b: string
  field_c: string
  field_d: string
  note: string
  status: string
}

interface FieldDef {
  key: 'title' | 'field_a' | 'field_b' | 'field_c' | 'field_d' | 'note'
  label: string
  placeholder?: string
  optional?: boolean
  inputType?: string
  choices?: Array<{ value: string; label: string }>
}

interface KindConfig {
  kind: OpsKind
  heading: string
  accent: string
  industry: string
  fields: FieldDef[]
  doneLabel: string
  doneAction: 'done' | 'approve' | 'close'
}

const CONFIGS = {
  "edu_grade_alert": {
    "kind": "edu_grade_alert",
    "heading": "成绩预警",
    "accent": "#2563eb",
    "industry": "edu",
    "fields": [
      {
        "key": "title",
        "label": "学生/班级"
      },
      {
        "key": "field_a",
        "label": "科目"
      },
      {
        "key": "field_b",
        "label": "分数",
        "optional": true
      },
      {
        "key": "note",
        "label": "预警说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已跟进",
    "doneAction": "done"
  },
  "edu_tuition": {
    "kind": "edu_tuition",
    "heading": "学费收缴",
    "accent": "#2563eb",
    "industry": "edu",
    "fields": [
      {
        "key": "title",
        "label": "学生"
      },
      {
        "key": "field_a",
        "label": "学期"
      },
      {
        "key": "field_b",
        "label": "金额"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已缴费",
    "doneAction": "close"
  },
  "edu_attendance": {
    "kind": "edu_attendance",
    "heading": "到课考勤",
    "accent": "#2563eb",
    "industry": "edu",
    "fields": [
      {
        "key": "title",
        "label": "班级/课程"
      },
      {
        "key": "field_a",
        "label": "日期"
      },
      {
        "key": "field_b",
        "label": "缺勤人数",
        "optional": true
      },
      {
        "key": "note",
        "label": "说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已统计",
    "doneAction": "done"
  },
  "edu_quiz": {
    "kind": "edu_quiz",
    "heading": "题库练习",
    "accent": "#2563eb",
    "industry": "edu",
    "fields": [
      {
        "key": "title",
        "label": "知识点"
      },
      {
        "key": "field_a",
        "label": "题量",
        "optional": true
      },
      {
        "key": "field_b",
        "label": "难度",
        "optional": true
      },
      {
        "key": "note",
        "label": "说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已发布",
    "doneAction": "done"
  },
  "edu_textbook": {
    "kind": "edu_textbook",
    "heading": "教材发放",
    "accent": "#2563eb",
    "industry": "edu",
    "fields": [
      {
        "key": "title",
        "label": "教材名"
      },
      {
        "key": "field_a",
        "label": "版本"
      },
      {
        "key": "field_b",
        "label": "数量",
        "optional": true
      },
      {
        "key": "note",
        "label": "领取人",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已发放",
    "doneAction": "done"
  },
  "edu_makeup": {
    "kind": "edu_makeup",
    "heading": "补考登记",
    "accent": "#2563eb",
    "industry": "edu",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "edu_transfer": {
    "kind": "edu_transfer",
    "heading": "学籍异动",
    "accent": "#2563eb",
    "industry": "edu",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "energy_defect": {
    "kind": "energy_defect",
    "heading": "缺陷隐患",
    "accent": "#eab308",
    "industry": "energy",
    "fields": [
      {
        "key": "title",
        "label": "站点/设备"
      },
      {
        "key": "field_a",
        "label": "隐患等级"
      },
      {
        "key": "field_b",
        "label": "发现人",
        "optional": true
      },
      {
        "key": "note",
        "label": "描述",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已消除",
    "doneAction": "close"
  },
  "energy_ticket": {
    "kind": "energy_ticket",
    "heading": "两票管理",
    "accent": "#eab308",
    "industry": "energy",
    "fields": [
      {
        "key": "title",
        "label": "票号/作业"
      },
      {
        "key": "field_a",
        "label": "票种"
      },
      {
        "key": "field_b",
        "label": "负责人"
      },
      {
        "key": "note",
        "label": "安全措施",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "许可开工",
    "doneAction": "approve"
  },
  "energy_spare": {
    "kind": "energy_spare",
    "heading": "备件领用",
    "accent": "#eab308",
    "industry": "energy",
    "fields": [
      {
        "key": "title",
        "label": "备件名"
      },
      {
        "key": "field_a",
        "label": "数量"
      },
      {
        "key": "field_b",
        "label": "用途",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已出库",
    "doneAction": "done"
  },
  "energy_emissions": {
    "kind": "energy_emissions",
    "heading": "碳排填报",
    "accent": "#eab308",
    "industry": "energy",
    "fields": [
      {
        "key": "title",
        "label": "站点"
      },
      {
        "key": "field_a",
        "label": "周期"
      },
      {
        "key": "field_b",
        "label": "排放量",
        "optional": true
      },
      {
        "key": "note",
        "label": "说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已报送",
    "doneAction": "approve"
  },
  "energy_outage": {
    "kind": "energy_outage",
    "heading": "停电计划",
    "accent": "#eab308",
    "industry": "energy",
    "fields": [
      {
        "key": "title",
        "label": "线路/区域"
      },
      {
        "key": "field_a",
        "label": "计划时段"
      },
      {
        "key": "field_b",
        "label": "影响户数",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已执行",
    "doneAction": "done"
  },
  "energy_hotwork": {
    "kind": "energy_hotwork",
    "heading": "动火票",
    "accent": "#eab308",
    "industry": "energy",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "energy_restore": {
    "kind": "energy_restore",
    "heading": "复电确认",
    "accent": "#eab308",
    "industry": "energy",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "gov_appeal": {
    "kind": "gov_appeal",
    "heading": "诉求受理",
    "accent": "#475569",
    "industry": "gov",
    "fields": [
      {
        "key": "title",
        "label": "诉求主题"
      },
      {
        "key": "field_a",
        "label": "来源渠道"
      },
      {
        "key": "field_b",
        "label": "紧急度",
        "optional": true
      },
      {
        "key": "note",
        "label": "诉求内容",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已办结",
    "doneAction": "close"
  },
  "gov_grid": {
    "kind": "gov_grid",
    "heading": "网格事件",
    "accent": "#475569",
    "industry": "gov",
    "fields": [
      {
        "key": "title",
        "label": "事件"
      },
      {
        "key": "field_a",
        "label": "网格/社区"
      },
      {
        "key": "field_b",
        "label": "网格员",
        "optional": true
      },
      {
        "key": "note",
        "label": "处置说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已处置",
    "doneAction": "done"
  },
  "gov_license": {
    "kind": "gov_license",
    "heading": "证照申领",
    "accent": "#475569",
    "industry": "gov",
    "fields": [
      {
        "key": "title",
        "label": "证照类型"
      },
      {
        "key": "field_a",
        "label": "申请人"
      },
      {
        "key": "field_b",
        "label": "材料齐全",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已发证",
    "doneAction": "approve"
  },
  "gov_hotline": {
    "kind": "gov_hotline",
    "heading": "热线转办",
    "accent": "#475569",
    "industry": "gov",
    "fields": [
      {
        "key": "title",
        "label": "工单号/主题"
      },
      {
        "key": "field_a",
        "label": "转办部门"
      },
      {
        "key": "field_b",
        "label": "时限",
        "optional": true
      },
      {
        "key": "note",
        "label": "摘要",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已回复",
    "doneAction": "close"
  },
  "gov_supervise": {
    "kind": "gov_supervise",
    "heading": "催办督办",
    "accent": "#475569",
    "industry": "gov",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "gov_public": {
    "kind": "gov_public",
    "heading": "信息公开",
    "accent": "#475569",
    "industry": "gov",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "legal_filing": {
    "kind": "legal_filing",
    "heading": "立案登记",
    "accent": "#334155",
    "industry": "legal",
    "fields": [
      {
        "key": "title",
        "label": "案由"
      },
      {
        "key": "field_a",
        "label": "当事人"
      },
      {
        "key": "field_b",
        "label": "案号",
        "optional": true
      },
      {
        "key": "note",
        "label": "摘要",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已立案",
    "doneAction": "done"
  },
  "legal_evidence": {
    "kind": "legal_evidence",
    "heading": "证据台账",
    "accent": "#334155",
    "industry": "legal",
    "fields": [
      {
        "key": "title",
        "label": "证据名"
      },
      {
        "key": "field_a",
        "label": "关联案件"
      },
      {
        "key": "field_b",
        "label": "证据类型",
        "optional": true
      },
      {
        "key": "note",
        "label": "说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已归档",
    "doneAction": "done"
  },
  "legal_hearing": {
    "kind": "legal_hearing",
    "heading": "开庭排期",
    "accent": "#334155",
    "industry": "legal",
    "fields": [
      {
        "key": "title",
        "label": "案件"
      },
      {
        "key": "field_a",
        "label": "开庭时间"
      },
      {
        "key": "field_b",
        "label": "法庭",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已开庭",
    "doneAction": "done"
  },
  "legal_contract_ops": {
    "kind": "legal_contract_ops",
    "heading": "合同审查单",
    "accent": "#334155",
    "industry": "legal",
    "fields": [
      {
        "key": "title",
        "label": "合同名称"
      },
      {
        "key": "field_a",
        "label": "对方"
      },
      {
        "key": "field_b",
        "label": "风险点",
        "optional": true
      },
      {
        "key": "note",
        "label": "审查意见",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "审查通过",
    "doneAction": "approve"
  },
  "legal_enforce": {
    "kind": "legal_enforce",
    "heading": "执行回款",
    "accent": "#334155",
    "industry": "legal",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "legal_preserve": {
    "kind": "legal_preserve",
    "heading": "诉讼保全",
    "accent": "#334155",
    "industry": "legal",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "hr_perf": {
    "kind": "hr_perf",
    "heading": "绩效考核",
    "accent": "#a855f7",
    "industry": "hr",
    "fields": [
      {
        "key": "title",
        "label": "员工"
      },
      {
        "key": "field_a",
        "label": "周期"
      },
      {
        "key": "field_b",
        "label": "等级",
        "optional": true
      },
      {
        "key": "note",
        "label": "评语",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已确认",
    "doneAction": "approve"
  },
  "hr_training": {
    "kind": "hr_training",
    "heading": "培训报名",
    "accent": "#a855f7",
    "industry": "hr",
    "fields": [
      {
        "key": "title",
        "label": "课程"
      },
      {
        "key": "field_a",
        "label": "学员"
      },
      {
        "key": "field_b",
        "label": "场次",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已完成",
    "doneAction": "done"
  },
  "hr_headcount": {
    "kind": "hr_headcount",
    "heading": "编制申请",
    "accent": "#a855f7",
    "industry": "hr",
    "fields": [
      {
        "key": "title",
        "label": "岗位"
      },
      {
        "key": "field_a",
        "label": "部门"
      },
      {
        "key": "field_b",
        "label": "人数"
      },
      {
        "key": "note",
        "label": "理由",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已批复",
    "doneAction": "approve"
  },
  "hr_payroll": {
    "kind": "hr_payroll",
    "heading": "薪资异议",
    "accent": "#a855f7",
    "industry": "hr",
    "fields": [
      {
        "key": "title",
        "label": "员工"
      },
      {
        "key": "field_a",
        "label": "月份"
      },
      {
        "key": "field_b",
        "label": "异议项",
        "optional": true
      },
      {
        "key": "note",
        "label": "说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已处理",
    "doneAction": "close"
  },
  "hr_offer": {
    "kind": "hr_offer",
    "heading": "Offer审批",
    "accent": "#a855f7",
    "industry": "hr",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "hr_idp": {
    "kind": "hr_idp",
    "heading": "个人发展",
    "accent": "#a855f7",
    "industry": "hr",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "const_safety": {
    "kind": "const_safety",
    "heading": "现场安全",
    "accent": "#ca8a04",
    "industry": "construction",
    "fields": [
      {
        "key": "title",
        "label": "工点"
      },
      {
        "key": "field_a",
        "label": "隐患"
      },
      {
        "key": "field_b",
        "label": "整改人",
        "optional": true
      },
      {
        "key": "note",
        "label": "说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已整改",
    "doneAction": "close"
  },
  "const_accept": {
    "kind": "const_accept",
    "heading": "材料验收",
    "accent": "#ca8a04",
    "industry": "construction",
    "fields": [
      {
        "key": "title",
        "label": "材料"
      },
      {
        "key": "field_a",
        "label": "批次"
      },
      {
        "key": "field_b",
        "label": "结果",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "验收通过",
    "doneAction": "approve"
  },
  "const_progress": {
    "kind": "const_progress",
    "heading": "进度填报",
    "accent": "#ca8a04",
    "industry": "construction",
    "fields": [
      {
        "key": "title",
        "label": "分项工程"
      },
      {
        "key": "field_a",
        "label": "完成比例"
      },
      {
        "key": "field_b",
        "label": "日期",
        "optional": true
      },
      {
        "key": "note",
        "label": "说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已确认",
    "doneAction": "done"
  },
  "const_visa": {
    "kind": "const_visa",
    "heading": "工程签证",
    "accent": "#ca8a04",
    "industry": "construction",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "const_labor": {
    "kind": "const_labor",
    "heading": "劳务实名",
    "accent": "#ca8a04",
    "industry": "construction",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "agro_patrol": {
    "kind": "agro_patrol",
    "heading": "田间巡查",
    "accent": "#16a34a",
    "industry": "agriculture",
    "fields": [
      {
        "key": "title",
        "label": "地块"
      },
      {
        "key": "field_a",
        "label": "作物"
      },
      {
        "key": "field_b",
        "label": "长势",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已巡查",
    "doneAction": "done"
  },
  "agro_subsidy": {
    "kind": "agro_subsidy",
    "heading": "补贴申请",
    "accent": "#16a34a",
    "industry": "agriculture",
    "fields": [
      {
        "key": "title",
        "label": "补贴项目"
      },
      {
        "key": "field_a",
        "label": "申请人"
      },
      {
        "key": "field_b",
        "label": "面积/数量",
        "optional": true
      },
      {
        "key": "note",
        "label": "材料说明",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已核准",
    "doneAction": "approve"
  },
  "agro_inventory": {
    "kind": "agro_inventory",
    "heading": "农资出入库",
    "accent": "#16a34a",
    "industry": "agriculture",
    "fields": [
      {
        "key": "title",
        "label": "农资名"
      },
      {
        "key": "field_a",
        "label": "出入类型"
      },
      {
        "key": "field_b",
        "label": "数量"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已记账",
    "doneAction": "done"
  },
  "agro_pest": {
    "kind": "agro_pest",
    "heading": "病虫害上报",
    "accent": "#16a34a",
    "industry": "agriculture",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "agro_trace": {
    "kind": "agro_trace",
    "heading": "溯源批次",
    "accent": "#16a34a",
    "industry": "agriculture",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "media_review": {
    "kind": "media_review",
    "heading": "内容审核",
    "accent": "#db2777",
    "industry": "media",
    "fields": [
      {
        "key": "title",
        "label": "标题/稿件"
      },
      {
        "key": "field_a",
        "label": "频道"
      },
      {
        "key": "field_b",
        "label": "风险点",
        "optional": true
      },
      {
        "key": "note",
        "label": "意见",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "审核通过",
    "doneAction": "approve"
  },
  "media_calendar": {
    "kind": "media_calendar",
    "heading": "发布排期",
    "accent": "#db2777",
    "industry": "media",
    "fields": [
      {
        "key": "title",
        "label": "选题"
      },
      {
        "key": "field_a",
        "label": "渠道"
      },
      {
        "key": "field_b",
        "label": "发布时间",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已发布",
    "doneAction": "done"
  },
  "media_topic": {
    "kind": "media_topic",
    "heading": "选题申报",
    "accent": "#db2777",
    "industry": "media",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "media_asset": {
    "kind": "media_asset",
    "heading": "素材版权",
    "accent": "#db2777",
    "industry": "media",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "media_live": {
    "kind": "media_live",
    "heading": "直播场控",
    "accent": "#db2777",
    "industry": "media",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "auto_service": {
    "kind": "auto_service",
    "heading": "维保工单",
    "accent": "#0284c7",
    "industry": "auto",
    "fields": [
      {
        "key": "title",
        "label": "车牌/VIN"
      },
      {
        "key": "field_a",
        "label": "项目"
      },
      {
        "key": "field_b",
        "label": "里程",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已交车",
    "doneAction": "done"
  },
  "auto_fleet": {
    "kind": "auto_fleet",
    "heading": "车队调度",
    "accent": "#0284c7",
    "industry": "auto",
    "fields": [
      {
        "key": "title",
        "label": "任务"
      },
      {
        "key": "field_a",
        "label": "车辆"
      },
      {
        "key": "field_b",
        "label": "司机",
        "optional": true
      },
      {
        "key": "note",
        "label": "路线",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已完成",
    "doneAction": "done"
  },
  "auto_parts": {
    "kind": "auto_parts",
    "heading": "配件库存",
    "accent": "#0284c7",
    "industry": "auto",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "auto_claim": {
    "kind": "auto_claim",
    "heading": "事故理赔",
    "accent": "#0284c7",
    "industry": "auto",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "auto_charge": {
    "kind": "auto_charge",
    "heading": "充电桩运维",
    "accent": "#0284c7",
    "industry": "auto",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "mkt_lead": {
    "kind": "mkt_lead",
    "heading": "线索分配",
    "accent": "#06b6d4",
    "industry": "marketing",
    "fields": [
      {
        "key": "title",
        "label": "线索/客户"
      },
      {
        "key": "field_a",
        "label": "渠道"
      },
      {
        "key": "field_b",
        "label": "负责人",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已分配",
    "doneAction": "done"
  },
  "mkt_content": {
    "kind": "mkt_content",
    "heading": "内容排期",
    "accent": "#06b6d4",
    "industry": "marketing",
    "fields": [
      {
        "key": "title",
        "label": "选题"
      },
      {
        "key": "field_a",
        "label": "平台"
      },
      {
        "key": "field_b",
        "label": "档期",
        "optional": true
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "已上线",
    "doneAction": "done"
  },
  "mkt_ab_test": {
    "kind": "mkt_ab_test",
    "heading": "AB文案测试",
    "accent": "#06b6d4",
    "industry": "marketing",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "mkt_roi": {
    "kind": "mkt_roi",
    "heading": "投放复盘",
    "accent": "#06b6d4",
    "industry": "marketing",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "mkt_sign": {
    "kind": "mkt_sign",
    "heading": "活动签到",
    "accent": "#06b6d4",
    "industry": "marketing",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  },
  "mkt_coupon": {
    "kind": "mkt_coupon",
    "heading": "券包触达",
    "accent": "#06b6d4",
    "industry": "marketing",
    "fields": [
      {
        "key": "title",
        "label": "标题"
      },
      {
        "key": "field_a",
        "label": "关键信息"
      },
      {
        "key": "note",
        "label": "备注",
        "optional": true,
        "inputType": "textarea"
      }
    ],
    "doneLabel": "完成",
    "doneAction": "done"
  }
} as Record<OpsKind, KindConfig>

function VerticalOpsPanel({ kind, node }: { kind: OpsKind; node: SchemaNode }) {
  const cfg = CONFIGS[kind]
  const { token, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    try {
      const q = new URLSearchParams()
      if (appId) q.set('app_id', appId)
      const data = await apiFetch<{ total: number; items: RecordItem[] }>(
        `/api/v1/vertical-ops/${kind}/records?${q}`,
        token,
      )
      setItems(data.items || [])
      setErr('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
    }
  }, [token, appId, kind])

  useEffect(() => { void load() }, [load])

  const steps: GtgtStep[] = useMemo(
    () =>
      cfg.fields.map((f) => ({
        key: f.key,
        label: f.label,
        optional: f.optional,
        inputType: f.inputType,
        choices: f.choices,
        placeholder: f.placeholder,
      })),
    [cfg],
  )

  const onSubmit = async (values: Record<string, string>) => {
    if (!token) return
    setBusy(true)
    try {
      await apiFetch(`/api/v1/vertical-ops/${kind}/records`, token, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title || values.field_a || cfg.heading,
          field_a: values.field_a || '',
          field_b: values.field_b || '',
          field_c: values.field_c || '',
          field_d: values.field_d || '',
          note: values.note || '',
          app_public_id: appId || '',
          industry_key: cfg.industry,
        }),
      })
      setResetKey((k) => k + 1)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '提交失败')
    } finally {
      setBusy(false)
    }
  }

  const act = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/vertical-ops/${kind}/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  return (
    <div className="bh-flow-body" style={{ ['--bh-accent' as string]: cfg.accent }}>
      <h2 style={{ margin: '0 0 8px', color: cfg.accent }}>{cfg.heading}</h2>
      <p style={{ opacity: 0.7, marginTop: 0 }}>空库空列表 · {'>>'} 单字段步进 · 真 API</p>
      {err ? <p style={{ color: '#b91c1c' }}>{err}</p> : null}
      <GtgtStepComposer key={resetKey} steps={steps} onComplete={onSubmit} disabled={busy || !token} />
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
        {items.map((it) => (
          <li key={it.id} style={{ borderTop: '1px solid #e5e7eb', padding: '10px 0' }}>
            <div><strong>{it.record_no}</strong> · {it.title} · {it.status}</div>
            <div style={{ opacity: 0.7, fontSize: 13 }}>{[it.field_a, it.field_b, it.note].filter(Boolean).join(' · ')}</div>
            {it.status === 'open' ? (
              <button type="button" onClick={() => void act(it.id, cfg.doneAction)} style={{ marginTop: 6 }}>
                {cfg.doneLabel}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {!items.length ? <p style={{ opacity: 0.55 }}>暂无记录</p> : null}
      <span style={{ display: 'none' }}>{String(node?.id || '')}</span>
    </div>
  )
}

export const EduGradeAlertWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'edu_grade_alert' as OpsKind} node={props.node} />
export const EduTuitionWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'edu_tuition' as OpsKind} node={props.node} />
export const EduAttendanceWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'edu_attendance' as OpsKind} node={props.node} />
export const EduQuizWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'edu_quiz' as OpsKind} node={props.node} />
export const EduTextbookWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'edu_textbook' as OpsKind} node={props.node} />
export const EduMakeupWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'edu_makeup' as OpsKind} node={props.node} />
export const EduTransferWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'edu_transfer' as OpsKind} node={props.node} />
export const EnergyDefectWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'energy_defect' as OpsKind} node={props.node} />
export const EnergyTicketWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'energy_ticket' as OpsKind} node={props.node} />
export const EnergySpareWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'energy_spare' as OpsKind} node={props.node} />
export const EnergyEmissionsWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'energy_emissions' as OpsKind} node={props.node} />
export const EnergyOutageWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'energy_outage' as OpsKind} node={props.node} />
export const EnergyHotworkWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'energy_hotwork' as OpsKind} node={props.node} />
export const EnergyRestoreWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'energy_restore' as OpsKind} node={props.node} />
export const GovAppealWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'gov_appeal' as OpsKind} node={props.node} />
export const GovGridWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'gov_grid' as OpsKind} node={props.node} />
export const GovLicenseWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'gov_license' as OpsKind} node={props.node} />
export const GovHotlineWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'gov_hotline' as OpsKind} node={props.node} />
export const GovSuperviseWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'gov_supervise' as OpsKind} node={props.node} />
export const GovPublicWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'gov_public' as OpsKind} node={props.node} />
export const LegalFilingWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'legal_filing' as OpsKind} node={props.node} />
export const LegalEvidenceWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'legal_evidence' as OpsKind} node={props.node} />
export const LegalHearingWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'legal_hearing' as OpsKind} node={props.node} />
export const LegalContractOpsWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'legal_contract_ops' as OpsKind} node={props.node} />
export const LegalEnforceWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'legal_enforce' as OpsKind} node={props.node} />
export const LegalPreserveWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'legal_preserve' as OpsKind} node={props.node} />
export const HrPerfWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'hr_perf' as OpsKind} node={props.node} />
export const HrTrainingWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'hr_training' as OpsKind} node={props.node} />
export const HrHeadcountWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'hr_headcount' as OpsKind} node={props.node} />
export const HrPayrollWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'hr_payroll' as OpsKind} node={props.node} />
export const HrOfferWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'hr_offer' as OpsKind} node={props.node} />
export const HrIdpWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'hr_idp' as OpsKind} node={props.node} />
export const ConstSafetyWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'const_safety' as OpsKind} node={props.node} />
export const ConstAcceptWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'const_accept' as OpsKind} node={props.node} />
export const ConstProgressWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'const_progress' as OpsKind} node={props.node} />
export const ConstVisaWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'const_visa' as OpsKind} node={props.node} />
export const ConstLaborWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'const_labor' as OpsKind} node={props.node} />
export const AgroPatrolWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'agro_patrol' as OpsKind} node={props.node} />
export const AgroSubsidyWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'agro_subsidy' as OpsKind} node={props.node} />
export const AgroInventoryWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'agro_inventory' as OpsKind} node={props.node} />
export const AgroPestWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'agro_pest' as OpsKind} node={props.node} />
export const AgroTraceWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'agro_trace' as OpsKind} node={props.node} />
export const MediaReviewWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'media_review' as OpsKind} node={props.node} />
export const MediaCalendarWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'media_calendar' as OpsKind} node={props.node} />
export const MediaTopicWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'media_topic' as OpsKind} node={props.node} />
export const MediaAssetWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'media_asset' as OpsKind} node={props.node} />
export const MediaLiveWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'media_live' as OpsKind} node={props.node} />
export const AutoServiceWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'auto_service' as OpsKind} node={props.node} />
export const AutoFleetWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'auto_fleet' as OpsKind} node={props.node} />
export const AutoPartsWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'auto_parts' as OpsKind} node={props.node} />
export const AutoClaimWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'auto_claim' as OpsKind} node={props.node} />
export const AutoChargeWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'auto_charge' as OpsKind} node={props.node} />
export const MktLeadWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'mkt_lead' as OpsKind} node={props.node} />
export const MktContentWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'mkt_content' as OpsKind} node={props.node} />
export const MktAbTestWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'mkt_ab_test' as OpsKind} node={props.node} />
export const MktRoiWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'mkt_roi' as OpsKind} node={props.node} />
export const MktSignWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'mkt_sign' as OpsKind} node={props.node} />
export const MktCouponWidget = (props: { node: SchemaNode }) => <VerticalOpsPanel kind={'mkt_coupon' as OpsKind} node={props.node} />
