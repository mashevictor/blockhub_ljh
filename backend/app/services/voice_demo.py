"""上海话语音演示例句与 LLM 不可用时的兜底回复。"""

from __future__ import annotations

SHANGHAI_GREETING = "侬好！吾是阿拉上海话助手，侬点下面例句试一试，或者直接开麦克风讲上海话。"

SHANGHAI_DEMO_SAMPLES: list[dict[str, str]] = [
    {"label": "侬好", "utterance": "侬好，阿拉想试试上海话语音助手"},
    {"label": "查审批", "utterance": "帮吾查一查今朝有啥审批要处理"},
    {"label": "发布应用", "utterance": "用积木仓发布一个应用要啥步骤"},
    {"label": "天气", "utterance": "今朝上海天气咋样"},
]

# LLM 未配置时的演示回复（仍走上海话 TTS）
SHANGHAI_FALLBACK_BY_KEYWORD: list[tuple[tuple[str, ...], str]] = [
    (("审批", "查"), "好额，阿拉帮侬看过了。今朝有两份审批等侬：一份请假，一份报销。侬要吾先讲哪一桩？"),
    (("发布", "应用", "积木"), "发布应用蛮简单：先选模块，再填品牌名，点发布就得了。阿拉可以一步步带侬做。"),
    (("天气",), "今朝上海阴到多云，气温廿四到廿八度，出门记得带把伞，勿要淋着。"),
    (("侬好", "你好", "您好"), "侬好！吾是阿拉上海话助手。侬可以问审批、应用发布、知识库，或者直接讲侬的业务问题。"),
]

SHANGHAI_FALLBACK_DEFAULT = (
    "吾听懂了。DeepSeek 语义引擎暂时勿好连，先用演示模式回侬。"
    "侬可以问审批、发布应用、知识库搭界额问题。"
)


def pick_shanghai_fallback(user_text: str) -> str:
    text = user_text.strip()
    for keywords, reply in SHANGHAI_FALLBACK_BY_KEYWORD:
        if any(k in text for k in keywords):
            return reply
    return SHANGHAI_FALLBACK_DEFAULT
