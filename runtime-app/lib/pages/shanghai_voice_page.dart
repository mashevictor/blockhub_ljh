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
  bool? _voiceConfigured;
  String? _bootError;

  @override
  void initState() {
    super.initState();
    _service = ShanghaiVoiceService(branding: widget.branding);
    _sessionId = 'flutter-${DateTime.now().millisecondsSinceEpoch}';
    _service.stateStream.listen((_) {
      if (mounted) setState(() {});
    });
    _service.loadConfig().then((cfg) {
      if (!mounted) return;
      setState(() => _voiceConfigured = cfg.configured);
    }).catchError((Object e) {
      if (!mounted) return;
      setState(() {
        _voiceConfigured = false;
        _bootError = '无法连接语音服务: $e';
      });
    });
  }

  @override
  void dispose() {
    _service.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _started = true;
      _bootError = null;
    });
    try {
      await _service.connect(sessionId: _sessionId);
      await _service.startMic();
    } catch (e) {
      setState(() {
        _started = false;
        _bootError = e.toString();
      });
    }
    if (mounted) setState(() {});
  }

  List<Widget> _buildActions() {
    if (_voiceConfigured == false) {
      return [
        const Text('服务器未配置 TELEAI_*，ASR/TTS 不可用', style: TextStyle(color: Colors.orange)),
      ];
    }
    if (!_started) {
      return [
        FilledButton(onPressed: _start, child: const Text('开始说话')),
      ];
    }
    return [
      FilledButton(
        onPressed: _service.state == 'listening'
            ? () => _service.stopMic()
            : () => _service.startMic(),
        child: Text(_service.state == 'listening' ? '结束本句' : '继续说话'),
      ),
      OutlinedButton(onPressed: () => _service.bargeIn(), child: const Text('打断')),
      TextButton(onPressed: () => _service.disconnect(), child: const Text('断开')),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.max,
        children: [
          Text(
            '上海话语音 · ASR + TTS',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text(
            _voiceConfigured == null
                ? '正在检查语音服务…'
                : _voiceConfigured == true
                    ? '语音服务已就绪 · ${widget.branding.apiBaseUrl}'
                    : '语音服务未配置 · ${widget.branding.apiBaseUrl}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 8),
          Text('状态：${_service.state}', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_service.partialText.isNotEmpty)
            Text('识别中：${_service.partialText}'),
          if (_bootError != null)
            Text(_bootError!, style: const TextStyle(color: Colors.red)),
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
            children: _buildActions(),
          ),
        ],
      ),
    );
  }
}
