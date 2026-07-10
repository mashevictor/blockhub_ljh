import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'dio_factory.dart';

/// 运行端登录：拿到 JWT 并缓存，供 chat/approval/report 等需要鉴权的接口使用。
class AuthService {
  AuthService({required this.apiBaseUrl, this.tenantSlug = 'demo'});

  final String apiBaseUrl;
  final String tenantSlug;

  static const _tokenKey = 'auth_token_v1';

  String? _token;
  String? get token => _token;

  Dio _dio() {
    return createDio(receiveTimeout: const Duration(seconds: 30));
  }

  Future<void> loadCached() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
  }

  bool get isLoggedIn => _token != null && _token!.isNotEmpty;

  Future<void> login(String email, String password) async {
    final resp = await _dio().post<Map<String, dynamic>>(
      '$apiBaseUrl/auth/login',
      data: {'email': email, 'password': password},
    );
    final data = resp.data;
    if (data == null || data['access_token'] == null) {
      throw StateError('登录失败：未返回 token');
    }
    _token = data['access_token'] as String;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, _token!);
  }

  Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  /// 带鉴权头的 Dio（自签证书放行）。
  Dio authedDio() {
    final dio = _dio();
    if (_token != null && _token!.isNotEmpty) {
      dio.options.headers['Authorization'] = 'Bearer $_token';
    }
    return dio;
  }
}

/// 全局单例，由 app.dart 初始化。
late final AuthService authService;
