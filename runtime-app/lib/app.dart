import 'package:flutter/material.dart';

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

  @override
  void initState() {
    super.initState();
    _configService = ConfigService(branding: widget.branding);
    _authService = AuthService(apiBaseUrl: widget.branding.apiBaseUrl);
    authService = _authService;
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
              ? const PreferredSize(
                  preferredSize: Size.fromHeight(28),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Text('按住下方按钮说上海话', style: TextStyle(fontSize: 13)),
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

  @override
  void initState() {
    super.initState();
    final keys = widget.config.menu.map((m) => m.key).toList();
    // 契约 manifest 优先；否则菜单驱动（W5 与 runtime-web 对齐）
    final manifestKeys = widget.config.resolvedCapabilityKeys;
    final preferred = manifestKeys.contains('shanghai_voice')
        ? 'shanghai_voice'
        : (keys.contains('shanghai_voice')
            ? 'shanghai_voice'
            : (manifestKeys.isNotEmpty ? manifestKeys.first : keys.firstOrNull));
    _selectedKey = preferred;
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
    final menu = widget.config.menu;
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
