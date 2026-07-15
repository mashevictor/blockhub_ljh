from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TrackChat PaaS API"
    app_version: str = "1.2.2"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://101.32.209.251,http://101.32.209.251/admin,https://101.32.209.251,https://101.32.209.251/admin"

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"
    deepseek_timeout: int = 25

    # Chat LLM（OpenAI 兼容：DeepSeek / 通义 / 豆包等，未设则回退 deepseek_*）
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""
    llm_timeout: int = 60

    # PostgreSQL only — set DATABASE_URL in .env (see .env.example)
    database_url: str = "postgresql+psycopg2://trackchat:trackchat@localhost:5432/trackchat"
    jwt_secret: str = "change-me-in-production-trackchat-d1"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    public_base_url: str = "http://101.32.209.251"
    otp_debug_expose: bool = True

    uploads_dir: str = "uploads"

    # Redis（D5：限流 / OTP 缓存；未配置时回退内存）
    redis_url: str = "redis://127.0.0.1:6379/0"
    rate_limit_enabled: bool = True

    # 腾讯云 COS（生产上传；未配置时走本地 uploads/）
    cos_secret_id: str = ""
    cos_secret_key: str = ""
    cos_region: str = "ap-guangzhou"
    cos_bucket: str = ""
    cos_cdn_base_url: str = ""

    # 邮件（QQ SMTP，参考 D:\product\邮件模板\发送邮件的js.txt）
    smtp_enabled: bool = False
    smtp_host: str = "smtp.qq.com"
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "积木仓 BlockHub"
    publish_email_enabled: bool = True

    # 电信星辰 MaaS · 上海话语音 Agent
    teleai_app_id: str = ""
    teleai_app_key: str = ""
    teleai_region: str = "SH"
    teleai_host: str = "openapi.teleagi.cn"
    teleai_asr_path: str = "/aipaas/voice/v1/asr/fy"
    teleai_tts_path: str = "/aipaas/voice/v1/tts/supernaturalrt"
    teleai_tts_dialect: str = "shanghai"
    teleai_auth_expire_seconds: int = 180000

    @field_validator("teleai_app_id", "teleai_app_key")
    @classmethod
    def strip_teleai_credentials(cls, v: str) -> str:
        return (v or "").strip().strip('"').strip("'")

    # 知识库向量化（OpenAI 兼容 /embeddings；未设则回退 LLM/DeepSeek Key，再无则全文检索）
    embedding_api_key: str = ""
    embedding_base_url: str = ""
    embedding_model: str = "text-embedding-v3"
    embedding_dimension: int = 1536
    embedding_timeout: int = 60
    kb_chunk_size: int = 500
    kb_chunk_overlap: int = 80

    # 企业微信 SSO（P4-I2；未配置时 /auth/oauth/wecom/start 返回 503）
    wecom_corp_id: str = ""
    wecom_agent_id: str = ""
    wecom_secret: str = ""
    wecom_oauth_redirect_uri: str = ""  # 空则用 {public_base_url}/api/v1/auth/oauth/wecom/callback

    # IM 群机器人（P4-I2 解耦自动化：设环境变量即自动绑租户 connector，无需 Runtime 手填）
    # 例：IM_WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…
    im_wecom_webhook_url: str = ""
    im_dingtalk_webhook_url: str = ""
    im_feishu_webhook_url: str = ""
    # 逗号分隔租户 slug；空 = 仅 demo。* = 所有租户在 ensure 时写入
    im_auto_tenant_slugs: str = "demo"

    @field_validator("im_wecom_webhook_url", "im_dingtalk_webhook_url", "im_feishu_webhook_url")
    @classmethod
    def strip_im_webhooks(cls, v: str) -> str:
        return (v or "").strip().strip('"').strip("'")

    @field_validator("database_url")
    @classmethod
    def require_postgresql(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("DATABASE_URL must be a PostgreSQL connection string (postgresql+psycopg2://…)")
        return v


settings = Settings()
