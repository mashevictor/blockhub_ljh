# CapShip 开源路线图

## MVP 0.1（可对外讲故事）

**目标：** 「选 2 个能力 + 1 个壳 → 本地 Web 可预览」

- contract Python 包 + 单测  
- web-core + web-runtime + 2 个能力包  
- 示例：`examples/hello-delivery`  
- 文档：README + SPEC + 与 LangChain 差异一节  

**不做：** APK CI、LLM、广场。

## 0.2（双端闭环）

- Flutter shell + sync/build 脚本  
- 本地 APK 文档（手动环境）  
- per-app `applicationId` 规则开源  
- GitHub Action：仅 `flutter analyze`（不出 APK 亦可）

## 0.3（可选 AI）

- `ai-codegen` Provider 接口  
- 未知 key → generated_page 合并示例  
- 强调「预览 ≠ 完整包生成」

## 0.4（生态）

- Capability Pack 脚手架 CLI：`capship pack new my_cap`  
- 第三方包注册规范 + 校验工具  
- 与 LangGraph 的「示例集成」：Agent 产出 keys → 调 CapShip publish（展示正交）

## 1.0

- 契约版本稳定（semver）  
- Docker 一键 demo  
- 安全基线：无密钥入仓、示例用 mock LLM  
- 治理：CODE_OF_CONDUCT、CONTRIBUTING、安全漏洞渠道  

## 叙事口径（对外）

**推荐一句话**

> CapShip turns a set of capabilities into a trimmed web app and mobile APK—without requiring an LLM on the critical path.

**中文**

> CapShip 把「能力选型」编译成可裁剪的网页与 App 制品；智能体框架负责思考，CapShip 负责交付。

## 成功指标（开源后 90 天）

| 指标 | 目标 |
|------|------|
| 独立 clone 跑通 Web demo | < 15 分钟 |
| 外部 Capability Pack PR | ≥ 1 |
| Issue 中「是不是 LangChain」澄清帖 | 有标准回答可链到 ARCHITECTURE |
| BlockHub 生产依赖 CapShip 包 | 主仓不再复制 schema/manifest 逻辑 |
