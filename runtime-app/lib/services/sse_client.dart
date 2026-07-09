import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// SSE 流式客户端：POST 到 /chat/completions/stream，按行解析 `data: {json}` 帧。
///
/// staging 自签证书放行。生产应改为正规证书校验。
class SseClient {
  SseClient({required this.apiBaseUrl, required this.token});

  final String apiBaseUrl;
  final String token;

  /// 返回逐片 content 的流（完整增量文本）。
  Stream<String> streamChat({
    required String message,
    String sessionId = 'default',
    String model = 'doubao-seed-2-0-mini',
    bool useRag = true,
  }) async* {
    final client = HttpClient()..badCertificateCallback = (_, __, ___) => true;
    try {
      final req = await client.postUrl(Uri.parse('$apiBaseUrl/chat/completions/stream'));
      req.headers.set('Content-Type', 'application/json');
      req.headers.set('Authorization', 'Bearer $token');
      req.write(jsonEncode({
        'message': message,
        'session_id': sessionId,
        'model': model,
        'use_rag': useRag,
      }));
      final resp = await req.close();
      await for (final line in resp
          .transform(utf8.decoder)
          .transform(const LineSplitter())) {
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
      client.close(force: true);
    }
  }
}
