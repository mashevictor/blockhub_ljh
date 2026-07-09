/// Build-time branding from --dart-define (CI / local scripts).
class AppBranding {
  const AppBranding({
    required this.appName,
    required this.appId,
    required this.tenantSlug,
    required this.apiBaseUrl,
    required this.primaryColorHex,
  });

  final String appName;
  final String appId;
  final String tenantSlug;
  final String apiBaseUrl;
  final String primaryColorHex;

  static const AppBranding defaults = AppBranding(
    appName: 'TrackChat',
    appId: 'com.trackchat.runtime',
    tenantSlug: 'demo',
    apiBaseUrl: 'https://101.32.209.251/api/v1',
    primaryColorHex: '#4338CA',
  );

  factory AppBranding.fromEnvironment() {
    String env(String key, String fallback) {
      const empty = String.fromEnvironment('');
      final v = String.fromEnvironment(key, defaultValue: empty);
      return v.isEmpty ? fallback : v;
    }

    return AppBranding(
      appName: env('APP_NAME', defaults.appName),
      appId: env('APP_ID', defaults.appId),
      tenantSlug: env('TENANT_SLUG', defaults.tenantSlug),
      apiBaseUrl: env('API_BASE_URL', defaults.apiBaseUrl),
      primaryColorHex: env('PRIMARY_COLOR', defaults.primaryColorHex),
    );
  }

  int get primaryColorValue {
    final hex = primaryColorHex.replaceAll('#', '');
    if (hex.length == 6) {
      return int.parse('FF$hex', radix: 16);
    }
    return 0xFF4338CA;
  }
}
