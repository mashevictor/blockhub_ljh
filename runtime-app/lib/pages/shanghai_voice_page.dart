import 'package:flutter/material.dart';

import '../config/app_branding.dart';
import '../services/shanghai_voice_service.dart';

class ShanghaiVoicePage extends StatefulWidget {
  const ShanghaiVoicePage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<ShanghaiVoicePage> createState() => _ShanghaiVoicePageState();
}

class _ShanghaiVoicePageState extends State<ShanghaiVoicePage> {
  late final ShanghaiVoiceService _service;
  late final String _sessionId;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _service = ShanghaiVoiceService(branding: widget.branding);
    _sessionId = 'flutter-${DateTime.now().millisecondsSinceEpoch}';
    _service.stateStream.listen((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _service.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() => _started = true);
    await _service.connect(sessionId: _sessionId);
    await _service.startMic();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('上海话语音 Agent')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('状态：${_service.state}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (_service.partialText.isNotEmpty)
              Text('识别中：${_service.partialText}'),
            if (_service.error != null)
              Text(_service.error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: _service.messages.length,
                itemBuilder: (context, index) {
                  final item = _service.messages[index];
                  final isUser = item['role'] == 'user';
                  return ListTile(
                    title: Text(isUser ? '你' : '助手'),
                    subtitle: Text(item['text'] ?? ''),
                  );
                },
              ),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (!_started)
                  FilledButton(onPressed: () => _start(), child: const Text('开始说话'))
                else ...[
                  FilledButton(
                    onPressed: _service.state == 'listening' ? () => _service.stopMic() : () => _service.startMic(),
                    child: Text(_service.state == 'listening' ? '结束本句' : '继续说话'),
                  ),
                  OutlinedButton(onPressed: () => _service.bargeIn(), child: const Text('打断')),
                  TextButton(onPressed: () => _service.disconnect(), child: const Text('断开')),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
