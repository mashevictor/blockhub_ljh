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
    this.capabilityKeys = const [],
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
  /// 构建时注入的 capability_key 列表；非空时裁剪底部/顶部 Tab。
  final List<String> capabilityKeys;

  static const AppBranding defaults = AppBranding(
    appName: 'TrackChat',
    appId: 'com.trackchat.runtime',
    tenantSlug: 'demo',
    apiBaseUrl: 'http://101.32.209.251/api/v1',
    primaryColorHex: '#4338CA',
  );

  /// fromEnvironment 的 key 必须是编译期字面量，不能用变量传 key（否则 dart-define 全部失效）。
  factory AppBranding.fromEnvironment() {
    const empty = '';
    const appNameRaw = String.fromEnvironment('APP_NAME', defaultValue: empty);
    const appIdRaw = String.fromEnvironment('APP_ID', defaultValue: empty);
    const tenantSlugRaw = String.fromEnvironment('TENANT_SLUG', defaultValue: empty);
    const apiBaseUrlRaw = String.fromEnvironment('API_BASE_URL', defaultValue: empty);
    const primaryColorRaw = String.fromEnvironment('PRIMARY_COLOR', defaultValue: empty);
    const appPublicIdRaw = String.fromEnvironment('APP_PUBLIC_ID', defaultValue: empty);
    const voiceDemoRaw = String.fromEnvironment('VOICE_DEMO', defaultValue: empty);
    const capabilityKeysRaw = String.fromEnvironment('CAPABILITY_KEYS', defaultValue: empty);

    final appName = appNameRaw.isEmpty ? defaults.appName : appNameRaw;
    final appId = appIdRaw.isEmpty ? defaults.appId : appIdRaw;
    final voiceDemo = voiceDemoRaw == '1' ||
        voiceDemoRaw.toLowerCase() == 'true' ||
        appId == 'com.blockhub.shanghai.voice' ||
        appName.contains('上海话');
    final capabilityKeys = capabilityKeysRaw.isEmpty
        ? const <String>[]
        : capabilityKeysRaw
            .split(',')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList();

    return AppBranding(
      appName: appName,
      appId: appId,
      tenantSlug: tenantSlugRaw.isEmpty ? defaults.tenantSlug : tenantSlugRaw,
      apiBaseUrl: apiBaseUrlRaw.isEmpty ? defaults.apiBaseUrl : apiBaseUrlRaw,
      primaryColorHex: primaryColorRaw.isEmpty ? defaults.primaryColorHex : primaryColorRaw,
      appPublicId: appPublicIdRaw.isEmpty ? defaults.appPublicId : appPublicIdRaw,
      voiceDemoMode: voiceDemo,
      capabilityKeys: capabilityKeys,
    );
  }

  int get primaryColorValue {
    final hex = primaryColorHex.replaceAll('#', '');
    if (hex.length == 6) {
      return int.parse('FF$hex', radix: 16);
    }
    return 0xFF4338CA;
  }

  /// 运行时按 Android 包名兜底（比 libapp.so strings 更可靠）。
  AppBranding applyAndroidPackage(String packageName) {
    if (packageName != 'com.blockhub.shanghai.voice') {
      return this;
    }
    final resolvedName =
        appName == defaults.appName || appName == 'TrackChat' ? '上海话语音助手' : appName;
    return AppBranding(
      appName: resolvedName,
      appId: packageName,
      tenantSlug: tenantSlug,
      apiBaseUrl: apiBaseUrl,
      primaryColorHex: primaryColorHex,
      appPublicId: appPublicId,
      voiceDemoMode: true,
      capabilityKeys: capabilityKeys,
    );
  }
}
