import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'config/app_branding.dart';
import 'data/capability_manifest.dart';
import 'models/tenant_config.dart';
import 'pages/capability_pages.dart';
import 'pages/login_page.dart';
import 'pages/shanghai_voice_page.dart';
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
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: primary),
        useMaterial3: true,
      ),
      home: Scaffold(
        appBar: AppBar(
          title: Text(widget.branding.appName),
          bottom: widget.branding.voiceDemoMode
              ? PreferredSize(
                  preferredSize: const Size.fromHeight(28),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Text(
                        _appVersionLabel.isEmpty
                            ? '点例句或按住说话 · 文字+上海话播报'
                            : '点例句或按住说话 · $_appVersionLabel',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ),
                )
              : null,
        ),
        body: widget.branding.voiceDemoMode
            ? ShanghaiVoicePage(branding: widget.branding)
            : !_authChecked
            ? const Center(child: CircularProgressIndicator())
            : !_authService.isLoggedIn
                ? LoginPage(branding: widget.branding, onLoggedIn: _onLoggedIn)
                : _error != null
                    ? Center(child: Text('加载失败: $_error'))
                    : _config == null
                        ? const Center(child: CircularProgressIndicator())
                        : _HomeBody(
                            config: _config!,
                            branding: widget.branding,
                            onLogout: _logout,
                          ),
      ),
    );
  }
}

class _HomeBody extends StatefulWidget {
  const _HomeBody({required this.config, required this.branding, required this.onLogout});

  final TenantConfig config;
  final AppBranding branding;
  final VoidCallback onLogout;

  @override
  State<_HomeBody> createState() => _HomeBodyState();
}

class _HomeBodyState extends State<_HomeBody> {
  late String? _selectedKey;

  List<MenuItem> get _visibleMenu {
    final menu = widget.config.menu;
    final buildKeys = widget.branding.capabilityKeys;
    if (buildKeys.isEmpty) return menu;
    final allowed = buildKeys.toSet();
    final filtered = menu.where((m) => allowed.contains(m.key)).toList();
    return filtered.isNotEmpty ? filtered : menu;
  }

  @override
  void initState() {
    super.initState();
    final menu = _visibleMenu;
    final keys = menu.map((m) => m.key).toList();
    final manifestKeys = widget.config.resolvedCapabilityKeys;
    final buildKeys = widget.branding.capabilityKeys;
    final effectiveKeys = buildKeys.isEmpty
        ? manifestKeys
        : manifestKeys.where((k) => buildKeys.contains(k)).toList();
    _selectedKey = effectiveKeys.isNotEmpty
        ? effectiveKeys.first
        : (keys.isNotEmpty ? keys.first : null);
  }

  Widget _buildPage(String key) {
    final builder = capabilityPages[key];
    if (builder != null) {
      return builder(widget.branding);
    }
    // 回退占位：优先用 codegen 生成的契约名（capability_manifest.dart），
    // 再退化到菜单 label，保证「建设中」提示始终有可读中文名。
    final label = capabilityManifestByKey[key]?.name ??
        widget.config.menu
            .firstWhere((m) => m.key == key, orElse: () => MenuItem(key: key, label: key, icon: ''))
            .label;
    return Center(
      child: Text('「$label」页面建设中', style: Theme.of(context).textTheme.titleMedium),
    );
  }

  @override
  Widget build(BuildContext context) {
    final menu = _visibleMenu;
    return Column(
      children: [
        ListTile(
          leading: CircleAvatar(
            backgroundColor: Color(widget.branding.primaryColorValue),
            child: Text(widget.config.appName.characters.first),
          ),
          title: Text(widget.config.appName, style: Theme.of(context).textTheme.titleLarge),
          subtitle: Text(widget.config.tenantName),
          trailing: IconButton(
            icon: const Icon(Icons.logout),
            tooltip: '退出登录',
            onPressed: widget.onLogout,
          ),
        ),
        const SizedBox(height: 12),
        // 顶部导航：菜单项可点，选中即在「主区」就地切换页面（不再单独 push 一个页面）
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              for (final item in menu)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(item.label),
                    selected: _selectedKey == item.key,
                    onSelected: (_) => setState(() => _selectedKey = item.key),
                  ),
                ),
            ],
          ),
        ),
        const Divider(height: 24),
        Expanded(
          child: _selectedKey == null
              ? const Center(child: Text('暂无页面'))
              : _buildPage(_selectedKey!),
        ),
      ],
    );
  }
}
