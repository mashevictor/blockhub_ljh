class TenantConfig {
  const TenantConfig({
    required this.tenantSlug,
    required this.tenantName,
    required this.appName,
    required this.primaryColor,
    required this.theme,
    required this.apiBaseUrl,
    required this.menu,
    this.appIconUrl,
    this.features = const {},
    this.app,
  });

  final String tenantSlug;
  final String tenantName;
  final String appName;
  final String? appIconUrl;
  final String primaryColor;
  final String theme;
  final String apiBaseUrl;
  final List<MenuItem> menu;
  final Map<String, bool> features;
  final AppInfo? app;

  factory TenantConfig.fromJson(Map<String, dynamic> json) {
    final menuRaw = json['menu'] as List<dynamic>? ?? [];
    return TenantConfig(
      tenantSlug: json['tenant_slug'] as String? ?? 'demo',
      tenantName: json['tenant_name'] as String? ?? '',
      appName: json['app_name'] as String? ?? 'TrackChat',
      appIconUrl: json['app_icon_url'] as String?,
      primaryColor: json['primary_color'] as String? ?? '#4338CA',
      theme: json['theme'] as String? ?? 'light',
      apiBaseUrl: json['api_base_url'] as String? ?? '',
      menu: menuRaw
          .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      features: (json['features'] as Map<String, dynamic>? ?? {})
          .map((k, v) => MapEntry(k, v == true)),
      app: json['app'] != null
          ? AppInfo.fromJson(json['app'] as Map<String, dynamic>)
          : null,
    );
  }
}

class MenuItem {
  const MenuItem({required this.key, required this.label, required this.icon});

  final String key;
  final String label;
  final String icon;

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        key: json['key'] as String? ?? '',
        label: json['label'] as String? ?? '',
        icon: json['icon'] as String? ?? '',
      );
}

class AppInfo {
  const AppInfo({
    required this.id,
    required this.name,
    required this.schemaUrl,
    required this.modules,
    required this.capabilityKeys,
  });

  final String id;
  final String name;
  final String schemaUrl;
  final List<dynamic> modules;
  final List<String> capabilityKeys;

  factory AppInfo.fromJson(Map<String, dynamic> json) => AppInfo(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        schemaUrl: json['schema_url'] as String? ?? '',
        modules: json['modules'] as List<dynamic>? ?? [],
        capabilityKeys: (json['capability_keys'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList(),
      );
}
