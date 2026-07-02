# DESIGN.md

## 品牌与视觉方向
- 产品名：TrackChat PaaS
- 定位：企业级智能办公 PaaS 平台，7 Agent 驱动 114 场景
- 气质：专业、克制、高效，类似 Linear/Vercel 的深色侧边栏 + 明亮内容区

## Design Tokens

### 色彩
- 主色：Indigo 色系 (#4338ca / #6366f1)
- 侧边栏：深色渐变 (#0f172a → #1e1b4b)
- 内容区背景：Slate-50 (#f8fafc)
- 卡片：纯白 + 细边框
- Agent 色彩标识：每个 Agent 有独立品牌色

### 字体
- 中文：PingFang SC / Microsoft YaHei
- 英文：Inter / system-ui

### 间距与圆角
- 卡片圆角：12px
- 按钮圆角：8px
- 内容区间距：24px

## 布局
- 左侧固定侧边栏（260px）：Logo + 导航菜单
- 右侧内容区：顶部面包屑 + 主内容
- 响应式：移动端侧边栏收起为抽屉

## 交互
- 侧边栏导航高亮当前页
- 卡片悬停微动效
- 流式对话打字机效果
