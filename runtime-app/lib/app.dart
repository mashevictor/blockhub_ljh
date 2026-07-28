import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';

import 'models/tenant_config.dart';
import 'pages/capability_page_registry.dart';
import 'pages/login_page.dart';
import 'pages/shanghai_voice_page.dart';
import 'router/capability_shell_router.dart';
import 'services/auth_service.dart';
import 'services/config_service.dart';

class RuntimeApp extends StatefulWidget {
  const RuntimeApp({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<RuntimeApp> createState() => _RuntimeAppState();
}

class _RuntimeAppState extends State<RuntimeApp> {
  late final ConfigService _configService;
  late final AuthService _authService;
  TenantConfig? _config;
  String? _error;
  bool _authChecked = false;
  String _appVersionLabel = '';

  @override
  void initState() {
    super.initState();
    _configService = ConfigService(branding: widget.branding);
    _authService = AuthService(apiBaseUrl: widget.branding.apiBaseUrl);
    authService = _authService;
    runtimeAuthToken = () => _authService.token;
    runtimeAuthedDio = () => _authService.authedDio();
    PackageInfo.fromPlatform().then((info) {
      if (!mounted) return;
      setState(() {
        _appVersionLabel = 'v${info.version}+${info.buildNumber}';
      });
    });
    _initAuth();
  }

  Future<void> _initAuth() async {
    await _authService.loadCached();
    if (!mounted) return;
    setState(() => _authChecked = true);
    if (_authService.isLoggedIn) {
      _load();
    }
  }

  Future<void> _load() async {
    try {
      final config = await _configService.load();
      if (!mounted) return;
      setState(() {
        _config = config;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _onLoggedIn() async {
    await _load();
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    setState(() {
      _config = null;
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final primary = Color(widget.branding.primaryColorValue);

    return MaterialApp(
      title: widget.branding.appName,
      locale: BhL10n.instance.flutterLocale,
      supportedLocales: BhL10n.supportedLocales,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: primary),
        useMaterial3: true,
      ),
      home: Scaffold(
        appBar: AppBar(
          title: Text(widget.branding.appName),
          actions: [
            TextButton(
              onPressed: () {
                final next = BhL10n.instance.locale == BhL10n.enUS ? BhL10n.zhCN : BhL10n.enUS;
                BhL10n.instance.setLocale(next);
                setState(() {});
              },
              child: Text(BhL10n.instance.locale == BhL10n.enUS ? '中文' : 'EN'),
            ),
          ],
          bottom: widget.branding.voiceDemoMode
              ? PreferredSize(
                  preferredSize: const Size.fromHeight(28),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Text(
                        _appVersionLabel.isEmpty
                            ? '文字对话 · 按住说话 · 上海话 TTS'
                            : '文字对话 · 按住说话 · $_appVersionLabel',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ),
                )
              : null,
        ),
        body: _buildBody(primary),
      ),
    );
  }

  Widget _buildBody(Color primary) {
    final manifestKeys = _config?.resolvedCapabilityKeys ?? [];
    if (shouldUseVoiceDemoShell(widget.branding, manifestKeys)) {
      return ShanghaiVoicePage(branding: widget.branding);
    }
    if (!_authChecked) {
      return const Center(child: CircularProgressIndicator());
    }
    if (!_authService.isLoggedIn) {
      return LoginPage(branding: widget.branding, onLoggedIn: _onLoggedIn);
    }
    if (_error != null) {
      return Center(child: Text('加载失败: $_error'));
    }
    if (_config == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return _CapabilityRouterHost(
      config: _config!,
      branding: widget.branding,
      onLogout: _logout,
    );
  }
}

/// M11：manifest menu → go_router Shell（/cap/:key 深链）
class _CapabilityRouterHost extends StatefulWidget {
  const _CapabilityRouterHost({
    required this.config,
    required this.branding,
    required this.onLogout,
  });

  final TenantConfig config;
  final AppBranding branding;
  final VoidCallback onLogout;

  @override
  State<_CapabilityRouterHost> createState() => _CapabilityRouterHostState();
}

class _CapabilityRouterHostState extends State<_CapabilityRouterHost> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = createCapabilityShellRouter(
      config: widget.config,
      branding: widget.branding,
      onLogout: widget.onLogout,
    );
  }

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Router.withConfig(config: _router);
  }
}
