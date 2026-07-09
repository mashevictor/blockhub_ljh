import 'package:flutter/material.dart';

import 'config/app_branding.dart';
import 'models/tenant_config.dart';
import 'pages/capability_pages.dart';
import 'services/config_service.dart';

class RuntimeApp extends StatefulWidget {
  const RuntimeApp({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<RuntimeApp> createState() => _RuntimeAppState();
}

class _RuntimeAppState extends State<RuntimeApp> {
  late final ConfigService _configService;
  TenantConfig? _config;
  String? _error;

  @override
  void initState() {
    super.initState();
    _configService = ConfigService(branding: widget.branding);
    _load();
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
        appBar: AppBar(title: Text(widget.branding.appName)),
        body: _error != null
            ? Center(child: Text('加载失败: $_error'))
            : _config == null
                ? const Center(child: CircularProgressIndicator())
                : _HomeBody(config: _config!, branding: widget.branding),
      ),
    );
  }
}

class _HomeBody extends StatefulWidget {
  const _HomeBody({required this.config, required this.branding});

  final TenantConfig config;
  final AppBranding branding;

  @override
  State<_HomeBody> createState() => _HomeBodyState();
}

class _HomeBodyState extends State<_HomeBody> {
  late String? _selectedKey;

  @override
  void initState() {
    super.initState();
    final keys = widget.config.menu.map((m) => m.key).toList();
    // 默认选中上海话语音（若存在），与「框架页面」一致：菜单驱动、就地切换
    _selectedKey = keys.contains('shanghai_voice')
        ? 'shanghai_voice'
        : keys.firstOrNull;
  }

  Widget _buildPage(String key) {
    final builder = capabilityPages[key];
    if (builder != null) {
      return builder(widget.branding);
    }
    final label = widget.config.menu
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
