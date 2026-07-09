class BuildManifest {
  const BuildManifest({
    required this.capabilityKeys,
    required this.flutterPkgs,
    required this.webPkgs,
    required this.routes,
    required this.deliver,
  });

  final List<String> capabilityKeys;
  final List<String> flutterPkgs;
  final List<String> webPkgs;
  final List<String> routes;
  final String deliver;

  factory BuildManifest.fromJson(Map<String, dynamic> json) => BuildManifest(
        capabilityKeys: (json['capability_keys'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList(),
        flutterPkgs: (json['flutter_pkgs'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList(),
        webPkgs: (json['web_pkgs'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList(),
        routes: (json['routes'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList(),
        deliver: json['deliver'] as String? ?? 'both',
      );
}

class PageSchema {
  const PageSchema({
    required this.version,
    required this.menu,
    required this.capabilityKeys,
    this.root,
  });

  final String version;
  final List<MenuItem> menu;
  final List<String> capabilityKeys;
  final Map<String, dynamic>? root;

  factory PageSchema.fromJson(Map<String, dynamic> json) {
    final menuRaw = json['menu'] as List<dynamic>? ?? [];
    final keysRaw = json['capability_keys'] as List<dynamic>? ?? [];
    return PageSchema(
      version: json['version'] as String? ?? '1',
      menu: menuRaw
          .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      capabilityKeys: keysRaw.map((e) => e.toString()).toList(),
      root: json['root'] as Map<String, dynamic>?,
    );
  }
}

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
    this.pageSchema,
    this.buildManifest,
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
  final PageSchema? pageSchema;
  final BuildManifest? buildManifest;

  /// 契约驱动的 capability_key 列表（优先 manifest，其次 page_schema，最后 app）。
  List<String> get resolvedCapabilityKeys {
    if (buildManifest != null && buildManifest!.capabilityKeys.isNotEmpty) {
      return buildManifest!.capabilityKeys;
    }
    if (pageSchema != null && pageSchema!.capabilityKeys.isNotEmpty) {
      return pageSchema!.capabilityKeys;
    }
    return app?.capabilityKeys ?? [];
  }

  factory TenantConfig.fromJson(Map<String, dynamic> json) {
    final menuRaw = json['menu'] as List<dynamic>? ?? [];
    PageSchema? pageSchema;
    BuildManifest? buildManifest;

    final appJson = json['app'] as Map<String, dynamic>?;
    if (appJson != null) {
      final schemaRaw = appJson['page_schema'] as Map<String, dynamic>?;
      if (schemaRaw != null) {
        pageSchema = PageSchema.fromJson(schemaRaw);
      }
      final manifestRaw = appJson['build_manifest'] as Map<String, dynamic>?;
      if (manifestRaw != null) {
        buildManifest = BuildManifest.fromJson(manifestRaw);
      }
    }

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
      app: appJson != null ? AppInfo.fromJson(appJson) : null,
      pageSchema: pageSchema,
      buildManifest: buildManifest,
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
