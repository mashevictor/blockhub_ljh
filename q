[33mcommit 47ffd67fde15cb96be8b664733cb103df90199fe[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m)[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 17:30:14 2026 +0800

    Unify publish flow: auto-navigate to My Apps with APK build progress.
    
    After confirming generation from any entry point, save the app locally and jump to /plaza/my. Flutter APK delivery polls runtime status and shows async progress until the package is ready.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit df11a16c074a5d62b8b32b89d6945fb9b016c297[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 17:20:34 2026 +0800

    Fix my-apps persistence and restore publish-to-plaza flow.
    
    Sync localStorage via events, add View My Apps CTA after publish, harden appId saving, and add interaction tests.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 1c36652400dae9838c1008c4f8cdbba847785221[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 17:16:38 2026 +0800

    Fix Flutter APK build: require Java 17 and improve Gradle diagnostics.
    
    Align AGP/Kotlin with Flutter 8.7 template, add server setup script, and dump stacktrace on assembleRelease failure.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 67d302669ae49b65db76564f12fd3f418b917265[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 17:14:39 2026 +0800

    Restore full publish success flow with PublishModal.
    
    Show contact gate, loading overlay, then success modal on homepage instead of jumping straight to my apps.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit d78ba52d196c81e2b6cdb84b53d1825be7eee545[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 17:05:51 2026 +0800

    Fix create-app flows and Flutter APK Android bootstrap.
    
    Ensure module/danmaku generate opens contact gate reliably, keep create views mounted, add missing Android res for release builds, and harden the APK build script for root servers.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit c4dfa05db8aa31a1f8a8bfdef4868a6317b72606[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 16:23:42 2026 +0800

    Complete D5/D6 runtime delivery, branding UI, and publish email.
    
    Add Redis health checks, runtime-web at /r/{appId}, Flutter APK CI,
    tenant config API, app branding fields, dual deliver links, and QQ SMTP
    publish notifications with optional APK attachment.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit a58379c0a1b44546c3f3260914326870188bf082[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 14:45:10 2026 +0800

    Increase API timeout and clarify login connection errors for prod vs local.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 19581b8ad4cfffa93fd6cc1f28782bc17a34e486[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 14:39:46 2026 +0800

    Fix API startup: correct default_seal parameter order in contracts router.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 7e48affa3cdaae6e279f595d15c16678d1891140[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 14:36:27 2026 +0800

    Upgrade contract agent: structured labor template, form fill, DeepSeek generate.
    
    Add 12-clause labor contract with 22 form fields, template render and AI generate APIs, improved sim seal, and 4-step Admin wizard.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit fcc5da6defd3298e2ef2a94698a68b49f75088ad[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 14:27:15 2026 +0800

    Fix signed PDF download for Chinese titles; sync new catalog agents on seed.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 5d80b6a468dd1599bc1255dc7627c07c0e6f1718[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 14:24:54 2026 +0800

    Fix repair-db for migration 005; make contracts migration idempotent.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 123e15c60e4ac8df57ff7db248b4d392c6fb0453[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 14:22:24 2026 +0800

    Fix server deploy: check deploy.sh exists, add contract admin deploy script.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 05117ccee2ffaec1f7a021c2990f13193244c4f5[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 14:19:48 2026 +0800

    Add contract e-sign agent: editor, signature, seal, PDF, DeepSeek.
    
    PostgreSQL contracts tables with migration 005, reportlab PDF generation, Admin ContractPage with signature pad and seal upload, and catalog agent contract_esign with smoke tests.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit dd127dbf776ef49d2e692be933c1161aa98f164f[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 14:02:33 2026 +0800

    D2-D4: RBAC, LLM chat SSE, footer catalog, deploy scripts.
    
    Wire PlatformShowcaseFooter to catalog summary with agent_count; enforce 403 without token and admin-only seed. Add OpenAI-compatible LLM gateway with streaming chat, Admin ChatPage SSE, Home scroll-to-create, and server-update smoke script.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 546f8af536bda7e3e56bc94042022f0253f68705[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 13:45:20 2026 +0800

    Remove side vertical cube rails from hero first screen.
    
    Keep centered >> sign and integrated danmaku HUD only. v1.0.8.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit d59dcce34af06127263053c6ecd1b4f7421932a7[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 13:39:55 2026 +0800

    Redesign hero first screen with vertical cube rails and integrated >> danmaku.
    
    Copy: 用符号>>重新定义智能体. Cubes scroll vertically on left/right; sign and barrage HUD form one panel. v1.0.7.
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit e1a8dd1eeaf9dcf621097f17ec94d2fec0f64860[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 13:19:07 2026 +0800

    Redesign plaza: module data flow rails on app data with unified theme.
    
    Newsfeed uses published app data; barrage area shows editable per-app module pipeline for creators. My Apps gets flow editor. Remove dark rail theme, v1.0.6.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 196cbaa2f654f2f07a48e5332969b54eb1a1df18[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 13:10:26 2026 +0800

    Implement plaza scheme 02 barrage rails with visible data flow panel.
    
    Replace static feed with dual >> barrage tracks, click-to-expand cards, and a collapsible pipeline panel tracing localStorage through rails to Feed. Add five standalone design HTML files, hero >> badge above cube belt, v1.0.5.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 149360e7b945acdf7a04f396a8e8a96f81f70217[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 12:58:39 2026 +0800

    Enable Home login/register with OTP verification on /login and /register.
    
    Replace admin redirect with AuthPage; proxy dev API to demo server; bump home to 1.0.3.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit e25dee78769f6fa92ce366aae30386a7fe2d00d9[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 12:53:19 2026 +0800

    Add publish-to-plaza flow with @ audience scope picker on success card.
    
    Users choose @公开/org/dept/members; public posts appear in plaza feed (localStorage until W4 API). Bump home to 1.0.2.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit e55f001255e26a2f7bcea53d6bc40e4aae08b9cc[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 12:48:15 2026 +0800

    Unify My Apps navigation to /plaza/my and bump cache version to 1.0.1.
    
    Home header and plaza sidebar both route to the same my-apps page; hide feed sidebar on my-apps view.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit c5fde46f14f04c7b0e928a7a105c3b519a4f8ede[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 12:43:45 2026 +0800

    Redirect publish flow to plaza My Apps page instead of modals.
    
    Add /plaza/my with inline publish details; remove publish and my-apps overlays from Home.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 1cb752a3575b1c38633f605ccfa57b48e30b3a04[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 12:37:34 2026 +0800

    Add plaza Newsfeed page (scheme B) and sync docs.
    
    Wire Home /plaza with mock feed UI, header nav link, and design/doc updates for @ audience and W3/W4 schedule.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 521db07677d3c470fa10e50033d77086350cdcc4[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 12:28:46 2026 +0800

    Add interactive design mockups for @ audience and plaza newsfeed.
    
    Three UI schemes plus data model draft for review before W4 implementation.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 913f9ce37f8dcb9eb27d5c26c072030450878a30[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 12:21:11 2026 +0800

    Compact publish modal and stagger danmaku in >> chevron layout.
    
    Scrollable dialog with fixed footer; phone and QR side-by-side;弹幕起始按双 chevron 斜向错开。
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit ef6604752addc9640f2f624f0eb5729c09349524[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 12:13:32 2026 +0800

    Polish danmaku glow animations and guide users to My Apps after publish.
    
    Add gradient border, shimmer, float and pulse on hero barrage; highlight top-right My Apps with bubble hint post-publish.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit f9d4d2531e9a084746f7aff7a7f7633f57032ec8[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 11:28:37 2026 +0800

    Fix smoke-test OTP check: use unique email per run to avoid cooldown.
    
    Repeated runs reused 13800138000 and hit 429 within 60s; treat rate-limit as endpoint alive.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 057e23c84ba76c2d8995533cc75fb0f692ca288f[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 11:24:59 2026 +0800

    Add Home my-apps panel for guests and a quick DB smoke script.
    
    Save published apps in localStorage with a header button; smoke-db.sh checks PG via catalog, login, and publish.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 2f69c29bcabc585a891234a1ca7fa9bdb3b863b7[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 11:19:16 2026 +0800

    Default local Admin dev API proxy to demo server when PostgreSQL is absent.
    
    Avoid ECONNREFUSED on :8001; clarify login error hints for dev vs production.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 1072ce0be2940aed8fd6d46bf084be1a27624ce2[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 11:14:47 2026 +0800

    Unify brand logo to agent symbol JPG and route Home login to Admin.
    
    Each build emits a new cache-busting version label; Home /login redirects to /admin/login.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit f62f8a006ed103dc26e53d68378a979b78792b8b[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 11:04:05 2026 +0800

    Fix admin login UI: home-style logo, contrast, one-click demo login.
    
    Replace purple sidebar logo with white rounded BrandMark, improve stat card and login text contrast on monochrome-business theme, and let demo accounts log in on click.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 1e502fdf82ccf6edee2b6da9a894bce920c27de4[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 10:58:02 2026 +0800

    Deploy: atomic static swap and verify JS bundles are non-empty.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 21bb104783efb297e4b07f1ea56ccec70c1ce51a[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 10:47:34 2026 +0800

    Track frontend .env.local.example in git.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit ef3a3fdf6abff298f4dc06c6c86ffe8a6198cb53[m
Author: mashevictor <a8491087@163.com>
Date:   Fri Jul 3 10:47:17 2026 +0800

    Fix local admin login: remove logo, proxy API when PG down, clearer errors.
    
    Admin login hides logo; Vite loadEnv for VITE_API_PROXY; dev-admin.ps1 auto-targets demo server; DB errors return 503.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit dd01bf08b8bfbf4146114f101e33bfa691710c74[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 18:21:44 2026 +0800

    Fix admin login: reset demo user passwords on startup; brand >> logo.
    
    OTP registration could leave demo emails without password_hash; ensure_seed_data now upserts credentials. Add repair-auth.sh.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit d1a64cd1f543140f59eaf242c249a0cb2b1a9bab[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 18:16:38 2026 +0800

    Fix TS build: export DEMO_ACCOUNTS from brand re-exports.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit e9bf56f32fb1e930b6276b709f9c63d25b5cd291[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 18:14:06 2026 +0800

    Fix login logo path and show demo test accounts on password login.
    
    Add logo-mark.svg, resolve static assets with Vite BASE_URL for /admin/, default admin/home login to password mode with clickable demo credentials.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 2e835b89127ac1e09ad53eeb52efce35bd5f0800[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 18:03:44 2026 +0800

    Remove catalog memory fallbacks; add architecture HTML doc.
    
    Home catalog/hero/modules load from PG only with error+retry; creation/capabilities reads DB; publish no longer fakes URLs on failure.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 329701a68ce1faceba7d26e5aabe18a2c738da48[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 17:53:25 2026 +0800

    Add repair-db.sh to fix alembic/schema drift on legacy servers.
    
    Detect missing users.phone and catalog tables when alembic is stamped ahead, re-stamp and upgrade safely.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 8181f93bcddccf7a038f8b30f2e0370bfb2563b2[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 17:50:50 2026 +0800

    Fix API 502: systemd path templating, startup seed tolerance, health wait.
    
    Use BLOCKHUB_ROOT in service unit, wait for health after restart, add diagnose-api.sh, and log seed errors without blocking API boot.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 44fa99ef0c72fc755fb58a7acec76f3090c56a25[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 17:47:42 2026 +0800

    Fix deploy/smoke scripts for post-hero seed and safe migrations.
    
    Handle git lockfile conflicts on pull, stop stamping alembic head, accept total>=114 after hero extras, and add base_scenario_total to catalog summary.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 76f5e38bc939b0773c022a13ee8e16ad6011c71b[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 17:45:14 2026 +0800

    Extend seed with hero presets, chip templates, and PG-backed hero API.
    
    Seed 30 hero scenarios and 5 chip templates into PostgreSQL, sync extra scenario picks, expose /catalog/hero-presets, and load hero弹幕 from API with static fallback.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit fa90dc8649ad634b6707410f553566c538c8d77b[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 17:35:50 2026 +0800

    Complete D2 catalog PG + OTP auth loop, deploy and smoke test scripts.
    
    Add catalog tables and seed API, read catalog/agents/stats from PostgreSQL, OTP login, admin app cards with public URLs, and one-click deploy/smoke scripts.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 0f4da5a86180221d425ec794099a949e1c349d1a[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 17:05:45 2026 +0800

    Improve Home load performance: gzip nginx, lazy catalog, lite API, code split.
    
    Defer 114-scenario catalog fetch until scroll, add catalog lite endpoints, enable nginx gzip/sendfile, and uvicorn 2 workers.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 2989b122d3ee27f6f9d5266869f9ae1f7dab2f06[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 16:56:16 2026 +0800

    Add HTML cache versioning for Home and Admin builds.
    
    Inject date-time build version into index.html, emit version.json, clear stale JWT on deploy, and configure nginx to no-cache HTML with immutable hashed assets.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 013ea8c8b1ebc92f29aba2442d4c7ce6bd2f6a31[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 16:49:19 2026 +0800

    Fix generate loading overlay: portal to body with step progress.
    
    Loading was trapped inside page-enter stacking context and sat below other UI; now renders via portal at z-index 1100 with analyze/publish steps.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 8e3ff296778ba3f67ea957f972082f0a72813648[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 16:34:22 2026 +0800

    Fix nginx config for Admin SPA under /admin/ subpath
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit bdb30b29c6e9c70bdbd96bd8502294e719e8c5da[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 16:22:02 2026 +0800

    Complete D1: Alembic, JWT auth, login pages, creation PG persistence.
    
    Add auth API, protect admin modules, Admin/Home login with axios JWT interceptors, Alembic initial migration, and publish to PostgreSQL.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 4ada34a98d6fe6f8805844b8e0ea3e63b91a8802[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 16:04:59 2026 +0800

    Fix bcrypt compatibility on Python 3.12 by replacing passlib.
    
    Use bcrypt directly for password hashing to avoid passlib/bcrypt 4.1+ breakage during DB seed.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit d8ab20ef99339d6acb49fc29af22832fe7ccaca9[m
Author: mashevictor <a8491087@163.com>
Date:   Thu Jul 2 15:48:43 2026 +0800

    Initial commit: TrackChat/BlockHub MVP scaffold
    
    Home portal, Admin console, FastAPI backend with PostgreSQL config, capability registry, and 6-week project docs.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>
