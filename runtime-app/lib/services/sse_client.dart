import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

/// SSE 流式客户端：POST 到 /chat/completions/stream，按行解析 `data: {json}` 帧。
///
/// staging 自签证书放行。生产应改为正规证书校验。
class SseClient {
  SseClient({required this.apiBaseUrl, required this.token});

  final String apiBaseUrl;
  final String token;

  http.Client _client() {
    final httpClient = HttpClient()..badCertificateCallback = (_, __, ___) => true;
    return http.IOClient(httpClient);
  }

  /// 返回逐片 content 的流（已拼接为完整增量文本）。
  Stream<String> streamChat({
    required String message,
    String sessionId = 'default',
    String model = 'doubao-seed-2-0-mini',
    bool useRag = true,
  }) async* {
    final client = _client();
    try {
      final request = http.Request(
        'POST',
        Uri.parse('$apiBaseUrl/chat/completions/stream'),
      )
        ..headers['Content-Type'] = 'application/json'
        ..headers['Authorization'] = 'Bearer $token'
        ..body = jsonEncode({
          'message': message,
          'session_id': sessionId,
          'model': model,
          'use_rag': useRag,
        });

      final response = await client.send(request);
      final lines = response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter());
      await for (final line in lines) {
        if (!line.startsWith('data:')) continue;
        final payload = line.substring(5).trim();
        if (payload.isEmpty || payload == '[DONE]') continue;
        try {
          final json = jsonDecode(payload) as Map<String, dynamic>;
          final content = json['content'];
          if (content is String && content.isNotEmpty) {
            yield content;
          }
        } catch (_) {
          // 忽略非 JSON 行
        }
      }
    } finally {
      client.close();
    }
  }
}
