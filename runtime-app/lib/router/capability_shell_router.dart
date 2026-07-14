import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/app_branding.dart';
import '../config/modular_capabilities.g.dart';
import '../models/tenant_config.dart';
import '../pages/capability_page_registry.dart';
import 'capability_routes.dart';

/// M11：manifest menu → go_router Shell + /cap/:key 深链
GoRouter createCapabilityShellRouter({
  required TenantConfig config,
  required AppBranding branding,
  required VoidCallback onLogout,
}) {
  final menu = _visibleMenu(config, branding);
  final menuKeys = menu.map((m) => m.key).toList();
  final initialKey = pickInitialCapabilityKey(
        manifestKeys: config.resolvedCapabilityKeys,
        menuKeys: menuKeys,
        buildKeys: branding.capabilityKeys,
      ) ??
      (menuKeys.isNotEmpty ? menuKeys.first : null);

  final capRoutes = <RouteBase>[
    for (final item in menu)
      GoRoute(
        path: '/cap/${item.key}',
        name: item.key,
        builder: (_, __) => buildCapabilityPage(key: item.key, branding: branding),
      ),
  ];

  if (capRoutes.isEmpty) {
    capRoutes.add(
      GoRoute(
        path: '/',
        builder: (_, __) => const Center(child: Text('暂无页面')),
      ),
    );
  }

  return GoRouter(
    initialLocation: initialKey != null
        ? CapabilityRoutes.pathFor(initialKey)
        : (menuKeys.isNotEmpty ? CapabilityRoutes.pathFor(menuKeys.first) : '/'),
    routes: [
      ShellRoute(
        builder: (context, state, child) => CapabilityShellScaffold(
          config: config,
          branding: branding,
          menu: menu,
          selectedKey: _keyFromLocation(state.uri.path, menuKeys),
          onLogout: onLogout,
          onSelectKey: (key) => context.go(CapabilityRoutes.pathFor(key)),
          child: child,
        ),
        routes: capRoutes,
      ),
    ],
  );
}

List<MenuItem> _visibleMenu(TenantConfig config, AppBranding branding) {
  final menu = config.menu;
  final buildKeys = branding.capabilityKeys;
  final manifestKeys = config.resolvedCapabilityKeys;
  final allowed = buildKeys.isNotEmpty
      ? buildKeys.toSet()
      : (manifestKeys.isNotEmpty ? manifestKeys.toSet() : <String>{});
  if (allowed.isEmpty) return menu;
  final filtered = menu.where((m) => allowed.contains(m.key)).toList();
  return filtered.isNotEmpty ? filtered : menu;
}

String? _keyFromLocation(String path, List<String> menuKeys) {
  final fromRoute = CapabilityRoutes.keyFromPath(path);
  if (fromRoute != null && menuKeys.contains(fromRoute)) return fromRoute;
  return menuKeys.isNotEmpty ? menuKeys.first : null;
}

class CapabilityShellScaffold extends StatelessWidget {
  const CapabilityShellScaffold({
    super.key,
    required this.config,
    required this.branding,
    required this.menu,
    required this.selectedKey,
    required this.onLogout,
    required this.onSelectKey,
    required this.child,
  });

  final TenantConfig config;
  final AppBranding branding;
  final List<MenuItem> menu;
  final String? selectedKey;
  final VoidCallback onLogout;
  final void Function(String key) onSelectKey;
  final Widget child;

  String _menuSubtitle() {
    final base = config.tenantName;
    final buildKeys = branding.capabilityKeys;
    if (buildKeys.isNotEmpty) {
      return '$base · 已裁剪 ${buildKeys.length} 项能力';
    }
    if (modularCapabilityKeys.isNotEmpty) {
      return '$base · 模块化 ${modularCapabilityKeys.length} 项';
    }
    return base;
  }

  @override
  Widget build(BuildContext context) {
    final useDrawer = branding.appUiId == 'drawer_nav';
    if (useDrawer) {
      return Scaffold(
        appBar: AppBar(
          title: Text(config.appName),
          actions: [
            IconButton(icon: const Icon(Icons.logout), onPressed: onLogout, tooltip: '退出登录'),
          ],
        ),
        drawer: Drawer(
          child: ListView(
            children: [
              DrawerHeader(
                decoration: BoxDecoration(color: Color(branding.primaryColorValue).withOpacity(0.15)),
                child: Align(
                  alignment: Alignment.bottomLeft,
                  child: Text(config.appName, style: Theme.of(context).textTheme.titleLarge),
                ),
              ),
              for (final item in menu)
                ListTile(
                  selected: selectedKey == item.key,
                  title: Text(item.label),
                  onTap: () {
                    Navigator.of(context).pop();
                    onSelectKey(item.key);
                  },
                ),
            ],
          ),
        ),
        body: child,
      );
    }

    return Column(
      children: [
        ListTile(
          leading: CircleAvatar(
            backgroundColor: Color(branding.primaryColorValue),
            child: Text(config.appName.characters.first),
          ),
          title: Text(config.appName, style: Theme.of(context).textTheme.titleLarge),
          subtitle: Text(_menuSubtitle()),
          trailing: IconButton(
            icon: const Icon(Icons.logout),
            tooltip: '退出登录',
            onPressed: onLogout,
          ),
        ),
        const SizedBox(height: 12),
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
                    selected: selectedKey == item.key,
                    onSelected: (_) => onSelectKey(item.key),
                  ),
                ),
            ],
          ),
        ),
        const Divider(height: 24),
        Expanded(child: child),
      ],
    );
  }
}
