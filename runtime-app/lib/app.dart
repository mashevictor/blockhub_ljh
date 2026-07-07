import 'package:flutter/material.dart';

import 'config/app_branding.dart';
import 'models/tenant_config.dart';
import 'pages/shanghai_voice_page.dart';
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

class _HomeBody extends StatelessWidget {
  const _HomeBody({required this.config, required this.branding});

  final TenantConfig config;
  final AppBranding branding;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        ListTile(
          leading: CircleAvatar(
            backgroundColor: Color(branding.primaryColorValue),
            child: Text(config.appName.characters.first),
          ),
          title: Text(config.appName, style: Theme.of(context).textTheme.titleLarge),
          subtitle: Text(config.tenantName),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final item in config.menu)
              Chip(label: Text(item.label)),
          ],
        ),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => ShanghaiVoicePage(branding: branding),
              ),
            );
          },
          icon: const Icon(Icons.mic),
          label: const Text('上海话语音 Agent'),
        ),
        const SizedBox(height: 24),
        Text(
          'Flutter runtime D6 骨架 — ConfigService + GET /tenant/config',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
        ),
      ],
    );
  }
}
