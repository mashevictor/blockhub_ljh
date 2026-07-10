import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';

/// staging 使用自签证书，放行以便 HTTPS 跑通；生产应改为正规证书校验。
Dio createDio({
  String? baseUrl,
  Duration connectTimeout = const Duration(seconds: 15),
  Duration receiveTimeout = const Duration(seconds: 15),
  Map<String, dynamic>? headers,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: connectTimeout,
      receiveTimeout: receiveTimeout,
      headers: headers ?? const {'Accept': 'application/json'},
    ),
  );
  dio.httpClientAdapter = IOHttpClientAdapter(
    createHttpClient: () => HttpClient()..badCertificateCallback = (_, __, ___) => true,
  );
  return dio;
}
