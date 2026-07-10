import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

/// staging 使用自签证书，放行以便 HTTPS 跑通；生产应改为正规证书校验。
Dio createDio({
  String? baseUrl,
  Duration connectTimeout = const Duration(seconds: 15),
  Duration receiveTimeout = const Duration(seconds: 15),
  Map<String, dynamic>? headers,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl ?? '',
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

HttpClient _insecureHttpClient() =>
    HttpClient()..badCertificateCallback = (_, __, ___) => true;

/// WebSocket 连接（staging 自签证书放行）。
Future<WebSocketChannel> connectWebSocket(Uri uri) async {
  final socket = await WebSocket.connect(
    uri.toString(),
    customClient: _insecureHttpClient(),
  );
  return IOWebSocketChannel(socket);
}

/// 让 WS 地址与 API base 的 scheme/host 一致，避免 nginx 返回 wss 但客户端走 http。
Uri normalizeWsUri(String wsUrl, String apiBaseUrl) {
  final ws = Uri.parse(wsUrl);
  final api = Uri.parse(apiBaseUrl);
  final useTls = api.scheme == 'https';
  var normalized = ws.replace(
    scheme: useTls ? 'wss' : 'ws',
    host: api.host.isNotEmpty ? api.host : ws.host,
  );
  if (api.hasPort) {
    normalized = normalized.replace(port: api.port);
  }
  return normalized;
}
