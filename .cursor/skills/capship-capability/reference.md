# CapShip Skill · 速查

## SSOT

浏览器打开：`docs/opensource/capship.html`

## 路径选择

- **有 key / 要进生产** → 路径 A（注册表 + web-capability + capability_*）
- **暂时没有** → 路径 B（codegen 预览）→ 再转 A

## 命名

| 项 | 规则 |
|----|------|
| key | `snake_case` |
| Web 包目录 | `packages/web-capability-{slug}` |
| Flutter 包目录 | `packages/capability_{key}` |
| 默认 web_pkg | `@blockhub/web-capability-{slug}` |
| 默认 route | `/{slug}` |

## 壳

- Web: `tabs_portal` | `sidebar_admin` | `landing_single`
- App: `bottom_tabs` | `drawer_nav` | `immersive_chat`
