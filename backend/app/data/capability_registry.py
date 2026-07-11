"""统一能力注册表：业务模块 + Flutter 运行时工具能力。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CapabilityDef:
    key: str
    name: str
    category: str
    widget: str
    agent_id: str
    flutter_pkg: str = ""
    keywords: tuple[str, ...] = ()
    # 以下为「约定之外的显式覆盖」字段：默认留空，由 build_manifest / schema_generator
    # 走约定推导（web_pkg→@blockhub/web-capability-{slug}，route→/{slug}，
    # menu_icon→module，menu_label→name）。仅为不符合约定的能力填写，无需逐个硬编码。
    web_pkg: str = ""      # 显式 Web 包名（如 chat/voice/approval/kb/dashboard 共享包时与 slug 不同）
    menu_icon: str = ""    # 菜单图标名；留空走 "module"
    menu_label: str = ""   # 菜单别名；留空走 name
    route: str = ""        # 路由路径；留空走 /{slug} 约定


# ── Flutter / 移动端工具能力（纳入能力板块）────────────────────────
FLUTTER_CAPABILITIES: list[CapabilityDef] = [
    CapabilityDef("schedule_alarm", "定时闹钟", "Flutter工具", "AlarmWidget", "notify",
                    "flutter_local_notifications+zonedSchedule", ("闹钟", "alarm", "定时", "cron", "准时", "每天", "重复提醒", "番茄钟", "计时器", "倒计时")),
    CapabilityDef("flutter_push", "移动推送", "Flutter工具", "PushWidget", "notify",
                    "flutter_local_notifications / TPNS", ("推送", "push", "消息推送", "离线推送")),
    CapabilityDef("flutter_scan_qr", "扫码识别", "Flutter工具", "ScanWidget", "integration",
                    "mobile_scanner", ("扫码", "二维码", "条形码", "qr", "盘点扫码")),
    CapabilityDef("flutter_geolocation", "定位签到", "Flutter工具", "GeoWidget", "integration",
                    "geolocator", ("定位", "gps", "签到", "外勤", "打卡定位", "轨迹", "工地")),
    CapabilityDef("flutter_camera", "拍照上传", "Flutter工具", "CameraWidget", "integration",
                    "image_picker / camera", ("拍照", "相机", "上传照片", "现场拍照", "ocr识别", "巡检", "隐患")),
    CapabilityDef("flutter_map", "地图导航", "Flutter工具", "MapWidget", "integration",
                    "tencent_map_flutter / amap", ("地图", "导航", "路线", "门店分布", "派单地图", "调度")),
    CapabilityDef("flutter_offline", "离线缓存", "Flutter工具", "OfflineWidget", "integration",
                    "hive / sqflite", ("离线", "缓存", "无网络", "本地存储", "断网")),
    CapabilityDef("flutter_biometric", "生物识别", "Flutter工具", "BioWidget", "security",
                    "local_auth", ("指纹", "面容", "face id", "生物识别", "解锁")),
    CapabilityDef("flutter_signature", "手写签名", "Flutter工具", "SignWidget", "approval",
                    "signature", ("签名", "手写", "电子签", "签批")),
    CapabilityDef("flutter_speech", "语音交互", "Flutter工具", "SpeechWidget", "chat_qa",
                    "record + audioplayers + web_socket_channel", ("语音", "说话", "tts", "语音输入", "朗读")),
    CapabilityDef("flutter_file_picker", "文件选择", "Flutter工具", "FileWidget", "kb",
                    "file_picker", ("选文件", "附件", "上传文件", "导入excel", "pdf上传")),
    CapabilityDef("flutter_pdf", "PDF预览", "Flutter工具", "PdfWidget", "kb",
                    "flutter_pdfview", ("pdf", "预览文档", "合同预览")),
    CapabilityDef("flutter_webview", "内嵌网页", "Flutter工具", "WebViewWidget", "integration",
                    "webview_flutter", ("webview", "内嵌网页", "h5", "h5页面", "嵌入系统", "旧系统")),
    CapabilityDef("flutter_chart", "移动图表", "Flutter工具", "MobileChartWidget", "report",
                    "fl_chart", ("图表", "折线图", "柱状图", "移动端看板")),
]

# 业务核心模块（与 seed CAPABILITIES 对齐 + 常用别名）
CORE_CAPABILITIES: list[CapabilityDef] = [
    CapabilityDef("chat_qa", "智能问答", "智能交互", "ChatWidget", "chat_qa",
                    "", ("问答", "faq", "客服", "智能问", "对话"),
                    web_pkg="@blockhub/web-capability-chat", menu_icon="chat", route="/chat"),
    CapabilityDef("chat_voice", "语音问答", "智能交互", "VoiceWidget", "chat_qa",
                    "speech_to_text", ("语音问答", "语音助手"),
                    web_pkg="@blockhub/web-capability-chat", menu_icon="chat", route="/chat"),
    CapabilityDef("shanghai_voice", "上海话语音交互", "智能交互", "ShanghaiVoiceWidget", "shanghai_voice",
                    "record+web_socket_channel+audioplayers",
                    ("上海话", "语音助手", "方言", "实时语音", "麦克风"),
                    web_pkg="@blockhub/web-capability-voice", menu_icon="mic", menu_label="上海话语音", route="/voice"),
    CapabilityDef("shanghai_voice_stream", "实时语音流", "智能交互", "VoiceStreamWidget", "shanghai_voice",
                    "web_socket_channel",
                    ("语音流", "asr", "tts", "websocket"),
                    web_pkg="@blockhub/web-capability-voice", menu_icon="mic", menu_label="实时语音", route="/voice"),
    CapabilityDef("kb_document", "知识库", "知识数据", "KBUploadWidget", "kb",
                    "file_picker", ("知识库", "文档", "制度", "手册", "sop"),
                    web_pkg="@blockhub/web-capability-kb", menu_icon="book", route="/kb"),
    CapabilityDef("approval_flow", "审批流", "流程审批", "FormWidget", "approval",
                    "", ("审批", "请假", "报销", "流程", "待办", "会签", "合同", "盖章", "签章", "电子签"),
                    web_pkg="@blockhub/web-capability-approval", menu_icon="approval", route="/approval"),
    CapabilityDef("approval_inbox", "待办中心", "流程审批", "ListWidget", "approval",
                    "", ("待办", "已办", "inbox", "案件", "进度跟踪", "跟踪"),
                    web_pkg="@blockhub/web-capability-approval", menu_icon="inbox", route="/inbox"),
    CapabilityDef("chart_dashboard", "数据看板", "可视化", "DashboardWidget", "report",
                    "fl_chart", ("看板", "dashboard", "报表", "统计", "数据大屏"),
                    web_pkg="@blockhub/web-capability-dashboard", menu_icon="chart", route="/dashboard"),
    CapabilityDef("chart_funnel", "销售漏斗", "可视化", "FunnelWidget", "report",
                    "fl_chart", ("漏斗", "转化", "商机阶段"),
                    web_pkg="@blockhub/web-capability-dashboard", menu_icon="chart", route="/dashboard"),
    CapabilityDef("data_nl_query", "智能问数", "知识数据", "NLQueryWidget", "report",
                    "", ("问数", "自然语言查数", "sql查询", "查销售", "查数据", "业绩数据")),
    CapabilityDef("notify_inapp", "站内信", "通知集成", "InboxWidget", "notify",
                    "flutter_local_notifications", ("站内", "消息中心", "提醒", "通知"),
                    web_pkg="@blockhub/web-capability-dashboard", menu_icon="bell", route="/notifications"),
    CapabilityDef("notify_email", "邮件通知", "通知集成", "EmailWidget", "notify",
                    "", ("邮件", "email", "发邮件")),
    CapabilityDef("notify_im", "企微钉钉", "通知集成", "IMWidget", "notify",
                    "", ("企微", "钉钉", "企业微信", "飞书")),
    CapabilityDef("rbac_page", "角色权限", "权限安全", "RBACWidget", "creation",
                    "go_router", ("权限", "角色", "rbac", "可见范围")),
    CapabilityDef("erp_connector", "ERP对接", "外部集成", "ERPWidget", "integration",
                    "", ("erp", "sap", "用友", "金蝶")),
    CapabilityDef("meeting_booking", "会议室预约", "外部集成", "MeetingWidget", "integration",
                    "", ("会议室", "预约会议", "订会议室", "客房预订", "课程预约", "酒店", "健身房")),
    CapabilityDef("it_helpdesk", "IT报障", "外部集成", "HelpdeskWidget", "integration",
                    "", ("报障", "it工单", "电脑故障", "helpdesk", "售后工单", "工单")),
    CapabilityDef("asset_manage", "资产管理", "外部集成", "AssetWidget", "integration",
                    "", ("资产", "领用", "固定资产")),
    CapabilityDef("form_widget", "表单组件", "平台能力", "FormWidget", "creation",
                    "flutter_form_builder", ("表单", "问卷", "席位", "登记", "填写")),
    CapabilityDef("list_widget", "列表组件", "平台能力", "ListWidget", "creation",
                    "", ("列表", "清单", "目录", "席位安排")),
    CapabilityDef("multi_agent", "多助手", "智能交互", "MultiAgentWidget", "chat_qa",
                    "", ("多助手", "multi agent")),
]

INDUSTRY_HINTS: list[tuple[tuple[str, ...], str, str]] = [
    (("制造", "工厂", "产线", "设备", "报修", "mes", "质检"), "mfg", "传统制造"),
    (("销售", "crm", "客户", "报价", "合同", "商机"), "sales", "销售行业"),
    (("医院", "医疗", "患者", "排班", "his", "导诊"), "med", "医疗健康"),
    (("游戏", "玩家", "公会", "活动规则", "小游戏", "打架", "战斗", "宠物", "动画", "手游", "开服", "npc", "狗", "猫", "对战", "趣味", "娱乐"), "game", "游戏娱乐"),
    (("办公", "人事", "行政", "全员"), "office", "通用办公"),
    (("零售", "电商", "会员", "库存"), "retail", "零售电商"),
    (("教育", "课程", "学生", "家校"), "edu", "教育培训"),
    (("物流", "运单", "仓储", "配送"), "logistics", "物流仓储"),
    (("建筑", "工地", "施工", "巡检"), "construction", "建筑工程"),
    (("酒店", "餐饮", "客房"), "hotel", "酒店餐饮"),
    (("律师", "法务", "案件"), "legal", "法律服务"),
    (("农业", "补贴", "农资"), "agriculture", "农业"),
    (("传媒", "内容", "审核"), "media", "传媒内容"),
    (("汽车", "售后", "4s"), "auto", "汽车交通"),
    (("健身", "课程"), "office", "通用办公"),
]

ALL_CAPABILITIES: dict[str, CapabilityDef] = {
    c.key: c for c in CORE_CAPABILITIES + FLUTTER_CAPABILITIES
}


def list_capabilities() -> list[dict]:
    out = []
    for c in ALL_CAPABILITIES.values():
        out.append({
            "key": c.key,
            "name": c.name,
            "category": c.category,
            "widget": c.widget,
            "agent_id": c.agent_id,
            "flutter_pkg": c.flutter_pkg,
            "keywords": list(c.keywords),
        })
    return sorted(out, key=lambda x: (x["category"], x["key"]))


def capability_catalog_for_llm() -> str:
    lines = []
    for c in ALL_CAPABILITIES.values():
        kw = "、".join(c.keywords[:8]) if c.keywords else ""
        pkg = f" [Flutter:{c.flutter_pkg}]" if c.flutter_pkg else ""
        lines.append(f"- {c.key}: {c.name} ({c.category}){pkg} 关键词:{kw}")
    return "\n".join(lines)
