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
    this.appUiId = 'bottom_tabs',
    this.capabilityKeys = const [],
  });

  final String appName;
  final String appId;
  final String tenantSlug;
  final String apiBaseUrl;
  final String primaryColorHex;
  final String appPublicId;
  final bool voiceDemoMode;
  /// bottom_tabs | drawer_nav | immersive_chat
  final String appUiId;
  final List<String> capabilityKeys;

  static const AppBranding defaults = AppBranding(
    appName: 'TrackChat',
    appId: 'com.trackchat.runtime',
    tenantSlug: 'demo',
    apiBaseUrl: 'http://101.32.209.251/api/v1',
    primaryColorHex: '#4338CA',
  );

  factory AppBranding.fromEnvironment() {
    const empty = '';
    const appNameRaw = String.fromEnvironment('APP_NAME', defaultValue: empty);
    const appIdRaw = String.fromEnvironment('APP_ID', defaultValue: empty);
    const tenantSlugRaw = String.fromEnvironment('TENANT_SLUG', defaultValue: empty);
    const apiBaseUrlRaw = String.fromEnvironment('API_BASE_URL', defaultValue: empty);
    const primaryColorRaw = String.fromEnvironment('PRIMARY_COLOR', defaultValue: empty);
    const appPublicIdRaw = String.fromEnvironment('APP_PUBLIC_ID', defaultValue: empty);
    const voiceDemoRaw = String.fromEnvironment('VOICE_DEMO', defaultValue: empty);
    const appUiRaw = String.fromEnvironment('APP_UI_ID', defaultValue: empty);
    const capabilityKeysRaw = String.fromEnvironment('CAPABILITY_KEYS', defaultValue: empty);

    final appName = appNameRaw.isEmpty ? defaults.appName : appNameRaw;
    final appId = appIdRaw.isEmpty ? defaults.appId : appIdRaw;
    final appUiId = _normalizeAppUi(appUiRaw.isEmpty ? 'bottom_tabs' : appUiRaw);
    // 仅以显式 APP_UI_ID / VOICE_DEMO 决定沉浸壳，弱化包名启发式
    final voiceDemo = appUiId == 'immersive_chat' ||
        voiceDemoRaw == '1' ||
        voiceDemoRaw.toLowerCase() == 'true';
    final capabilityKeys = capabilityKeysRaw.isEmpty
        ? const <String>[]
        : capabilityKeysRaw.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();

    return AppBranding(
      appName: appName,
      appId: appId,
      tenantSlug: tenantSlugRaw.isEmpty ? defaults.tenantSlug : tenantSlugRaw,
      apiBaseUrl: apiBaseUrlRaw.isEmpty ? defaults.apiBaseUrl : apiBaseUrlRaw,
      primaryColorHex: primaryColorRaw.isEmpty ? defaults.primaryColorHex : primaryColorRaw,
      appPublicId: appPublicIdRaw.isEmpty ? defaults.appPublicId : appPublicIdRaw,
      voiceDemoMode: voiceDemo,
      appUiId: appUiId,
      capabilityKeys: capabilityKeys,
    );
  }

  static String _normalizeAppUi(String raw) {
    const allowed = {'bottom_tabs', 'drawer_nav', 'immersive_chat'};
    return allowed.contains(raw) ? raw : 'bottom_tabs';
  }

  int get primaryColorValue {
    final hex = primaryColorHex.replaceAll('#', '');
    if (hex.length == 6) {
      return int.parse('FF$hex', radix: 16);
    }
    return 0xFF4338CA;
  }

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
      voiceDemoMode: appUiId == 'immersive_chat' || voiceDemoMode,
      appUiId: appUiId == 'bottom_tabs' ? 'immersive_chat' : appUiId,
      capabilityKeys: capabilityKeys,
    );
  }
}
