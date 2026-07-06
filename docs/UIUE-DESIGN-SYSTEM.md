# 积木仓 BlockHub · UI/UE 设计规范 v1.0

> 适用范围：Home 创建端 · 广场/我的应用 · Admin 管理后台 · 邮件模板 · Runtime Web  
> 设计原则：**商务克制、层次清晰、按钮一眼可辨、文案与操作分离**

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| 统一识别 | 同一套色板、字体、圆角、按钮形态，跨端无割裂感 |
| 操作可辨 | 主按钮 / 次按钮 / 文字链接 / 标签 四类元素形态固定，用户 0.5 秒内可区分 |
| 信息层次 | 标题 → 副标题 → 正文 → 辅助说明，字号与颜色阶梯固定 |
| 邮件可用 | HTML 邮件遵循 Gmail 规范（表格布局 + 行内样式），与 Web 视觉同源 |

---

## 2. 品牌与色彩

### 2.1 主色板（Slate 商务深色）

| 令牌 | 色值 | 用途 |
|------|------|------|
| `--bh-brand` | `#0F172A` | 主按钮、标题强调、导航激活 |
| `--bh-brand-light` | `#334155` | 悬停、次级强调 |
| `--bh-brand-dark` | `#020617` | 深色背景、Hero |
| `--bh-brand-soft` | `#F1F5F9` | 选中态背景、信息块底色 |
| `--bh-accent` | `#475569` | 渐变终点、图标次要色 |

### 2.2 中性色

| 令牌 | 色值 | 用途 |
|------|------|------|
| `--bh-bg` | `#EEF2F7` | 页面背景 |
| `--bh-surface` | `#FFFFFF` | 卡片、弹框、输入框 |
| `--bh-surface-alt` | `#F8FAFC` | 列表斑马纹、次要区块 |
| `--bh-text` | `#0F172A` | 正文、标题 |
| `--bh-text-secondary` | `#475569` | 次要正文 |
| `--bh-muted` | `#64748B` | 说明文字、占位符 |
| `--bh-border` | `#E2E8F0` | 分割线、输入框边框 |

### 2.3 语义色

| 状态 | 色值 | 场景 |
|------|------|------|
| 成功 `--bh-ok` | `#16A34A` | 发布成功、在线状态 |
| 警告 `--bh-warn` | `#F59E0B` | 待处理、构建中 |
| 错误 `--bh-fail` | `#EF4444` | 校验失败、删除确认 |
| 信息 `--bh-info` | `#0284C7` | 提示、链接辅助 |

> **禁止**：邮件与 Web 混用旧版紫色 `#4338CA`；全站统一 Slate 深色商务风。

---

## 3. 字体与排版

### 3.1 字体族

```
-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC",
"Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif
```

邮件客户端回退：`Arial, Helvetica, sans-serif`（不引用外部字体文件）。

### 3.2 字号阶梯

| 级别 | 令牌 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|------|
| H1 | `--bh-fs-2xl` | 28px | 700 | 1.35 | 页面主标题 |
| H2 | `--bh-fs-xl` | 24px | 700 | 1.35 | 区块标题 |
| H3 | `--bh-fs-lg` | 20px | 700 | 1.4 | 卡片标题、弹框标题 |
| H4 | `--bh-fs-md` | 17px | 600 | 1.45 | 小节标题 |
| Body | `--bh-fs-base` | 15px | 400 | 1.6 | 正文、输入框 |
| Small | `--bh-fs-sm` | 13px | 400/600 | 1.55 | 按钮、标签、表格 |
| Caption | `--bh-fs-xs` | 12px | 500 | 1.5 | 辅助说明、时间戳 |
| Micro | `--bh-fs-2xs` | 11px | 600 | 1.4 | 角标、导航分组 |

### 3.3 间距规则

- 组件内边距：卡片 `16–24px`，弹框 `24–32px`
- 标题与正文：`8px`
- 段落间距：`12–16px`
- 区块间距：`24–32px`
- 基于 **4px 网格**，禁止随意使用 7px、13px 等碎数

---

## 4. 组件规范

### 4.1 按钮（四类，禁止混用）

#### 主按钮 `.btn-primary` / `.bh-btn-primary`
- 背景：`--bh-grad-brand`（深 Slate 渐变）
- 文字：白色 `#FFFFFF`，字重 600
- 内边距：`12px 28px`（小屏可 `10px 20px`）
- 圆角：`12px`
- 阴影：`--bh-shadow-btn`
- 悬停：上移 2px，阴影加深
- **用途**：确认发布、登录、下一步、邮件 CTA

#### 次按钮 `.btn-ghost` / `.bh-btn-ghost`
- 背景：白色，边框 `1px solid --bh-border`
- 文字：`--bh-text`，字重 500
- 圆角：`12px`
- **用途**：取消、返回、次要操作

#### 文字按钮 `.bh-btn-text`
- 无边框无背景，颜色 `--bh-brand-light`
- 下划线仅 hover 时出现
- **用途**：「了解更多」「查看全部」

#### 危险按钮 `.bh-btn-danger`
- 背景：`#FEF2F2`，边框 `#FECACA`，文字 `#B91C1C`
- **用途**：删除、撤销

```
视觉对比示意：

┌─────────────────┐   ┌─────────────────┐   打开网页版 →
│  确认并生成      │   │     取消        │   （文字链接）
│  （主按钮·深色）  │   │  （次按钮·白底） │
└─────────────────┘   └─────────────────┘
```

### 4.2 弹框 Modal

| 属性 | 值 |
|------|-----|
| 遮罩 | `rgba(15,23,42,0.55)` |
| 卡片背景 | `--bh-surface` |
| 圆角 | `24px` |
| 最大宽度 | 420px（表单）/ 440px（发布结果） |
| 标题 | 20px / 700 / `--bh-brand-dark` |
| 副标题 | 13px / `--bh-muted` |
| 关闭按钮 | 右上角 ×，24px，`--bh-muted` |

**ContactGateModal / PublishModal** 统一使用 `.modal-overlay` + `.modal-card` 或 `.contact-gate-card`。

### 4.3 标签 Badge

| 类型 | 样式 |
|------|------|
| 默认 | 背景 `#F1F5F9`，文字 `#334155`，圆角 pill，12px |
| 成功 | 背景 `#DCFCE7`，文字 `#047857` |
| 进行中 | 背景 `#FEF3C7`，文字 `#B45309` |
| 品牌 | 背景 `#E2E8F0`，文字 `#0F172A`，字重 600 |

### 4.4 卡片 Card

- 背景 `--bh-surface`
- 边框 `1px solid --bh-border`
- 圆角 `14px`
- 内边距 `16–20px`
- 悬停（可点击）：`box-shadow: --bh-shadow-md`，`translateY(-2px)`

**广场 · 我的应用** 列表项、展开详情、DeliveryProgress 均使用同一卡片规范。

### 4.5 输入框

- 边框 `2px solid --bh-border`（弹框内）或 `1px`（普通表单）
- 圆角 `10–12px`
- 字号 `15px`
- Focus：`border-color: --bh-brand-light` + `box-shadow: 0 0 0 3px rgba(15,23,42,0.08)`

### 4.6 Admin 侧边栏

- 背景：`--bh-grad-hero` 深色渐变
- 导航项：13px，激活态左边框 `#A5B4FC`（唯一允许的微紫点缀）
- Logo 区：白底圆角 13px 容器

---

## 5. 页面级布局

### 5.1 Home 创建端
- 顶栏固定，Logo + 品牌名 + 主题切换
- Hero 区深色渐变 + 白色主按钮（反色）或页面内深色主按钮
- 内容区最大宽度 `1120px`，居中

### 5.2 广场 / 我的应用
- 页面标题 H1 `24px`
- 应用卡片：左图标 + 名称 + 交付形式 Badge + 展开箭头
- 高亮新发布项：左边框 `4px solid --bh-brand` + 浅灰背景

### 5.3 Admin 后台
- 左侧固定导航 240px
- 顶栏 52px 毛玻璃
- 内容区 padding `24px 28px`

---

## 6. 邮件专用规范（Gmail 兼容）

### 6.1 技术约束

| 规则 | 原因 |
|------|------|
| **表格布局** `<table role="presentation">` | Gmail/Outlook 不支持 flex/grid |
| **行内 style** 写在每个元素上 | `<head><style>` 会被 Gmail 剥离 |
| **不用** `position`/`float`/`background-image` 做关键布局 | 客户端裁剪 |
| **按钮用 `<a>` + `display:inline-block`** | 真按钮 `<button>` 支持差 |
| **宽度 600px** 居中 | 邮件客户端标准 |
| **图片加 width/height/alt** | 防止布局跳动、无障碍 |
| **同时发 plain text** | 反垃圾、客户端降级 |

### 6.2 邮件视觉映射

| Web 元素 | 邮件实现 |
|----------|----------|
| Hero 顶栏 | 表格行，背景 `#0F172A`，白字品牌名 |
| 主 CTA | 深色圆角 `<a>` 按钮，padding 14px 32px |
| 信息块 | 表格单元格，背景 `#F8FAFC`，左边框 4px `#0F172A` |
| Badge | `<span>` 行内，背景 `#E2E8F0`，圆角 999px |
| 页脚 | 12px `#64748B`，品牌名加粗 `#0F172A` |

### 6.3 退信常见原因与规避

1. **HTML 过于复杂** → 简化 DOM，减少嵌套
2. **外链图片被拦** → Logo 使用自有域名 HTTPS；正文信息不依赖图片
3. **纯图片邮件** → 保证文字占比 > 60%
4. **可疑链接** → 使用 `public_base_url` 正式域名
5. **缺 plain text** → `email_service.py` 已发 multipart/alternative

---

## 7. 实施路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 | `shared/design-tokens.css` + 邮件模板重写 | 本次 |
| P1 | Home `index.css` 顶部 import tokens，清理紫色残留 | 下一步 |
| P2 | Admin `index.css` 对齐 tokens | 下一步 |
| P3 | 广场/弹框组件类名统一为 `bh-*` 前缀 | 下一步 |

---

## 8. 文件索引

| 文件 | 说明 |
|------|------|
| `shared/design-tokens.css` | CSS 变量源 |
| `shared/brand.ts` | 品牌文案 |
| `backend/app/templates/email/publish_delivery.html` | 生产邮件模板 |
| `docs/email-preview/publish_delivery.html` | 本地预览（填好示例数据） |

---

*积木仓 BlockHub · 设计规范 v1.0 · 2026-07*
