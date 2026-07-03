import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_branding.dart';
import '../models/tenant_config.dart';

class ConfigService {
  ConfigService({AppBranding? branding})
      : _branding = branding ?? AppBranding.fromEnvironment(),
        _dio = Dio(
          BaseOptions(
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
          ),
        );

  final AppBranding _branding;
  final Dio _dio;
  static const _cacheKey = 'tenant_config_v1';

  String get apiBaseUrl => _branding.apiBaseUrl;

  Future<TenantConfig> load({String? appPublicId, bool forceRefresh = false}) async {
    final prefs = await SharedPreferences.getInstance();
    if (!forceRefresh) {
      final cached = prefs.getString(_cacheKey);
      if (cached != null && cached.isNotEmpty) {
        try {
          // lightweight cache — full JSON parse deferred to W5 offline mode
        } catch (_) {}
      }
    }

    final query = <String, dynamic>{'tenant': _branding.tenantSlug};
    if (appPublicId != null && appPublicId.isNotEmpty) {
      query['app_id'] = appPublicId;
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '${_branding.apiBaseUrl}/tenant/config',
      queryParameters: query,
    );

    final data = response.data;
    if (data == null) {
      throw StateError('Empty tenant config response');
    }

    final config = TenantConfig.fromJson(data);
    await prefs.setString(_cacheKey, config.appName);
    return config;
  }
}
