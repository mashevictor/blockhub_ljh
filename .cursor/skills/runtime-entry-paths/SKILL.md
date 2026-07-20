---
name: runtime-entry-paths
description: >-
  CapShip Runtime 入口分流：独立站模板皮肤 vs 弹幕/模块工作台壳。
  当用户提到独立站进 Runtime、microsite、页面模板皮肤、弹幕进 Runtime、
  entry_source、industry_site、capship_workbench 时使用。
---

# Runtime 入口分流（必须分清）

## 两条入口 · 两套壳

| 入口 | 典型路径 | `entry_source` / `source` | Runtime 表现 |
|------|----------|---------------------------|--------------|
| **A. 独立站 / 行业向导** | `/industry/{pack}` → 选模板 → 编排/发布 → `/r/{id}` 或 `/preview/industry-runtime/{pack}?microsite=` | `industry_site` / `industry` / `industry_site` | **按 microsite 重排结构**（`layout` + `nav`）+ 色板；标题首页，非整页 HTML 复刻 |
| **B. 弹幕 / 选模块 / 描述需求** | Hero 弹幕、ModuleView、PromptView → 发布 → `/r/{id}` | `capship_workbench` / `prompt` / `module` | **标准 CapShip 工作台壳**（Tabs/侧栏），**无**独立站皮肤 |

禁止混用：弹幕生成的应用不要套 Helios 等营销站皮肤；独立站选了 Helios 的发布结果不要静默改成默认紫蓝 Tabs。

## 数据契约

发布时写入 `page_schema`：

```json
{
  "meta": {
    "entry_source": "industry_site",
    "publish_source": "industry_site",
    "microsite_id": "law-firm",
    "web_template_id": "landing_single"
  },
  "theme": {
    "primaryColor": "#1e3a5f",
    "templateId": "landing_single",
    "micrositeId": "law-firm"
  }
}
```

工作台入口则：

```json
{
  "meta": {
    "entry_source": "capship_workbench",
    "publish_source": "prompt"
  }
}
```

## 实现位置

- 皮肤表：`home/src/data/micrositeRuntimeSkin.ts` ↔ `runtime-web/src/micrositeRuntimeSkin.ts`
- 发布：`IndustryView` 传 `micrositeId` + `entrySource: industry_site`；`PromptView`/`ModuleView` 传 `capship_workbench`
- 后端：`schema_generator.generate_page_schema(..., microsite_id=, entry_source=, publish_source=)`
- Runtime 壳：`runtime-web/src/App.tsx` + `styles-microsite-skins.css`
- 独立站预览页：`/preview/industry-runtime/:pack?microsite=`

## 独立站 Runtime 体验（强制）

1. **标题首页**（`/`）：**行业大字封面**（`meta.industry_name`）+ STEP1/2/3 引导 + 场景→能力串联路径；禁止能力/场景 Tab 墙
2. **导航**：固定左侧 **父子折叠树**（按 category）；禁止顶栏/底栏密密场景按钮
3. **模板换皮**：右侧/下方小芯片，只改色板气质，不改导航结构
4. 发布写入 `meta.industry_key` / `meta.industry_name`

弹幕/模块入口仍为 Tabs 工作台，互不污染。