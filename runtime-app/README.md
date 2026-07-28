# TrackChat Flutter Runtime (D6)

员工端 App 骨架：启动时通过 `ConfigService` 拉取 `GET /tenant/config`，支持 CI 自定义应用名与图标。

## 本地开发

```bash
cd runtime-app
flutter pub get
flutter run \
  --dart-define=APP_NAME="演示应用" \
  --dart-define=TENANT_SLUG=demo \
  --dart-define=API_BASE_URL=http://124.222.177.43/api/v1
```

## 一键打包 APK

```bash
# 复制并编辑 branding.json
cp runtime-app/branding/branding.json.example runtime-app/branding/branding.json

bash scripts/flutter-build-apk.sh
```

环境变量：`APP_NAME`、`APP_ID`、`TENANT_SLUG`、`API_BASE_URL`、`PRIMARY_COLOR`、`ICON_URL`。

## CI/CD

GitHub Actions：`.github/workflows/flutter-apk.yml`

- `workflow_dispatch` 可填应用名、租户、API、主题色、图标 URL
- `main` 分支变更 `runtime-app/**` 时自动构建
- 产物：`app-release.apk` artifact

## 与发布流程联动

1. Home/Admin `POST /creation/publish` 写入 PG `apps` 表
2. Flutter 构建时传 `--dart-define=TENANT_SLUG=demo` 与可选 `app_id` query
3. `GET /tenant/config?tenant=demo&app_id={public_id}` 覆盖 `app_name` 等字段
