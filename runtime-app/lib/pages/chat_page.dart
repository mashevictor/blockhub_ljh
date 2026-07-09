import 'package:flutter/material.dart';

import '../config/app_branding.dart';
import '../services/auth_service.dart';
import '../services/sse_client.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final List<_Msg> _messages = [];
  final TextEditingController _controller = TextEditingController();
  bool _streaming = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _streaming) return;
    _controller.clear();
    setState(() {
      _messages.add(_Msg(role: 'user', content: text));
      _streaming = true;
      _error = null;
      _messages.add(_Msg(role: 'assistant', content: ''));
    });

    final token = authService.token;
    if (token == null || token.isEmpty) {
      setState(() {
        _streaming = false;
        _error = '未登录，无法对话';
      });
      return;
    }

    final client = SseClient(apiBaseUrl: widget.branding.apiBaseUrl, token: token);
    try {
      final session = 'flutter-${DateTime.now().millisecondsSinceEpoch}';
      await for (final delta in client.streamChat(message: text, sessionId: session)) {
        if (!mounted) return;
        setState(() {
          final last = _messages.last;
          _messages[_messages.length - 1] = _Msg(role: 'assistant', content: last.content + delta);
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = '对话失败: $e');
    } finally {
      if (mounted) setState(() => _streaming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Color(widget.branding.primaryColorValue);
    return Column(
      children: [
        if (_error != null)
          Container(
            color: Colors.red.shade50,
            padding: const EdgeInsets.all(8),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: _messages.length,
            itemBuilder: (context, i) {
              final m = _messages[i];
              final isUser = m.role == 'user';
              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                  decoration: BoxDecoration(
                    color: isUser ? primary : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    m.content.isEmpty && !isUser && _streaming ? '思考中…' : m.content,
                    style: TextStyle(color: isUser ? Colors.white : Colors.black87),
                  ),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: const InputDecoration(
                    hintText: '输入消息，回车发送',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  onSubmitted: (_) => _send(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _streaming ? null : _send,
                icon: _streaming
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Msg {
  _Msg({required this.role, required this.content});
  final String role;
  final String content;
}
