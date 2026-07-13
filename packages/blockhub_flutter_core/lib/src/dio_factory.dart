import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

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

Future<WebSocketChannel> connectWebSocket(Uri uri) async {
  final socket = await WebSocket.connect(
    uri.toString(),
    customClient: _insecureHttpClient(),
  );
  return IOWebSocketChannel(socket);
}

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
