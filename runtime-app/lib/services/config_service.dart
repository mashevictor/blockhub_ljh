import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_branding.dart';
import '../models/tenant_config.dart';

class RuntimeContract {
  const RuntimeContract({
    required this.publicId,
    this.pageSchema,
    this.buildManifest,
  });

  final String publicId;
  final PageSchema? pageSchema;
  final BuildManifest? buildManifest;
}

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
          final json = jsonDecode(cached) as Map<String, dynamic>;
          return TenantConfig.fromJson(json);
        } catch (_) {}
      }
    }

    final query = <String, dynamic>{'tenant': _branding.tenantSlug};
    final runtimePublicId = _branding.appPublicId;
    if (runtimePublicId.isNotEmpty) {
      query['app_id'] = runtimePublicId;
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '${_branding.apiBaseUrl}/tenant/config',
      queryParameters: query,
    );

    final data = response.data;
    if (data == null) {
      throw StateError('Empty tenant config response');
    }

    var config = TenantConfig.fromJson(data);

    // W5: 从 runtime API 拉 schema + manifest（与 runtime-web 同一契约）
    final runtimeId = runtimePublicId.isNotEmpty
        ? runtimePublicId
        : (config.app?.id ?? (query['app_id'] as String?));
    if (runtimeId != null && runtimeId.isNotEmpty && runtimeId != 'com.trackchat.runtime') {
      final contract = await fetchRuntimeContract(runtimeId);
      config = TenantConfig(
        tenantSlug: config.tenantSlug,
        tenantName: config.tenantName,
        appName: config.appName,
        appIconUrl: config.appIconUrl,
        primaryColor: config.primaryColor,
        theme: config.theme,
        apiBaseUrl: config.apiBaseUrl,
        menu: contract.pageSchema?.menu.isNotEmpty == true
            ? contract.pageSchema!.menu
            : config.menu,
        features: config.features,
        app: config.app,
        pageSchema: contract.pageSchema ?? config.pageSchema,
        buildManifest: contract.buildManifest ?? config.buildManifest,
      );
    }

    await prefs.setString(_cacheKey, jsonEncode(data));
    return config;
  }

  /// 拉取 runtime schema + manifest。
  Future<RuntimeContract> fetchRuntimeContract(String publicId) async {
    final schemaResp = await _dio.get<Map<String, dynamic>>(
      '${_branding.apiBaseUrl}/runtime/$publicId/schema',
    );
    final manifestResp = await _dio.get<Map<String, dynamic>>(
      '${_branding.apiBaseUrl}/runtime/$publicId/manifest',
    );

    PageSchema? pageSchema;
    final schemaRaw = schemaResp.data?['page_schema'] as Map<String, dynamic>?;
    if (schemaRaw != null) {
      pageSchema = PageSchema.fromJson(schemaRaw);
    }

    BuildManifest? buildManifest;
    final manifestRaw = manifestResp.data?['build_manifest'] as Map<String, dynamic>?;
    if (manifestRaw != null) {
      buildManifest = BuildManifest.fromJson(manifestRaw);
    }

    return RuntimeContract(
      publicId: publicId,
      pageSchema: pageSchema,
      buildManifest: buildManifest,
    );
  }
}
