/// Build-time branding from --dart-define (CI / local scripts).
class AppBranding {
  const AppBranding({
    required this.appName,
    required this.appId,
    required this.tenantSlug,
    required this.apiBaseUrl,
    required this.primaryColorHex,
    this.appPublicId = '',
    this.voiceDemoMode = false,
  });

  final String appName;
  final String appId;
  final String tenantSlug;
  final String apiBaseUrl;
  final String primaryColorHex;
  /// Runtime app public_id from publish (8-char hex), not Android package name.
  final String appPublicId;
  /// 为 true 时跳过登录，直接进入上海话语音页（测试 APK 用）
  final bool voiceDemoMode;

  static const AppBranding defaults = AppBranding(
    appName: 'TrackChat',
    appId: 'com.trackchat.runtime',
    tenantSlug: 'demo',
    apiBaseUrl: 'http://101.32.209.251/api/v1',
    primaryColorHex: '#4338CA',
  );

  factory AppBranding.fromEnvironment() {
    String env(String key, String fallback) {
      const empty = String.fromEnvironment('');
      final v = String.fromEnvironment(key, defaultValue: empty);
      return v.isEmpty ? fallback : v;
    }

    final appName = env('APP_NAME', defaults.appName);
    final appId = env('APP_ID', defaults.appId);
    final voiceDemoRaw = env('VOICE_DEMO', '');
    final voiceDemo = voiceDemoRaw == '1' ||
        voiceDemoRaw.toLowerCase() == 'true' ||
        appId == 'com.blockhub.shanghai.voice' ||
        appName.contains('上海话');

    return AppBranding(
      appName: appName,
      appId: appId,
      tenantSlug: env('TENANT_SLUG', defaults.tenantSlug),
      apiBaseUrl: env('API_BASE_URL', defaults.apiBaseUrl),
      primaryColorHex: env('PRIMARY_COLOR', defaults.primaryColorHex),
      appPublicId: env('APP_PUBLIC_ID', defaults.appPublicId),
      voiceDemoMode: voiceDemo,
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
