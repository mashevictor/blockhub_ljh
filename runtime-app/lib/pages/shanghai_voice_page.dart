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
  late final ScrollController _scrollController;

  bool? _voiceConfigured;
  bool _connecting = false;
  bool _holding = false;
  String? _bootError;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _service = ShanghaiVoiceService(branding: widget.branding);
    _sessionId = 'flutter-${DateTime.now().millisecondsSinceEpoch}';
    _service.stateStream.listen((_) {
      if (!mounted) return;
      setState(() {});
      _scrollToBottom();
    });
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      final cfg = await _service.loadConfig();
      if (!mounted) return;
      setState(() {
        _voiceConfigured = cfg.configured;
        _bootError = cfg.configured ? null : '语音服务未配置，请联系管理员设置 TELEAI_*';
      });
      if (cfg.configured) {
        await _connect();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _voiceConfigured = false;
        _bootError = _formatBootError(e);
      });
    }
  }

  String _formatBootError(Object e) {
    final msg = e.toString();
    if (msg.contains('502')) {
      return '语音服务暂时不可用（502 Bad Gateway）。\n'
          '通常是服务器 blockhub-api 未启动，请在服务器执行：\n'
          'sudo systemctl start blockhub-api';
    }
    if (msg.contains('503') || msg.contains('504')) {
      return '语音服务网关超时，请稍后重试或联系管理员检查 blockhub-api。';
    }
    if (msg.contains('Connection refused') ||
        msg.contains('Failed host lookup') ||
        msg.contains('Network is unreachable')) {
      return '无法连接服务器，请检查手机网络与 API 地址是否正确。';
    }
    return '无法连接语音服务，请稍后重试。';
  }

  Future<void> _retryBootstrap() async {
    setState(() {
      _voiceConfigured = null;
      _bootError = null;
    });
    await _bootstrap();
  }

  Future<void> _connect() async {
    if (_connecting || _service.isConnected) return;
    setState(() {
      _connecting = true;
      _bootError = null;
    });
    try {
      await _service.ensureConnected(sessionId: _sessionId);
    } catch (e) {
      if (mounted) setState(() => _bootError = e.toString());
    } finally {
      if (mounted) setState(() => _connecting = false);
    }
  }

  Future<void> _onHoldStart() async {
    if (_voiceConfigured != true || _holding) return;
    setState(() {
      _holding = true;
      _bootError = null;
    });
    try {
      await _service.holdTalkStart();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _holding = false;
        _bootError = e.toString();
      });
    }
  }

  Future<void> _onHoldEnd() async {
    if (!_holding) return;
    setState(() => _holding = false);
    try {
      await _service.holdTalkEnd();
    } catch (e) {
      if (mounted) setState(() => _bootError = e.toString());
    }
  }

  Future<void> _runDemo(VoiceDemoSample sample) async {
    setState(() => _bootError = null);
    try {
      await _connect();
      await _service.simulateUtterance(sample.utterance);
    } catch (e) {
      if (mounted) setState(() => _bootError = e.toString());
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _service.dispose();
    super.dispose();
  }

  Color get _primary => Color(widget.branding.primaryColorValue);

  String get _statusLabel {
    if (_connecting || _service.state == 'connecting') return '连接中…';
    if (_holding || _service.isMicActive) return '正在听…';
    if (_service.state == 'thinking') return '思考中…';
    if (_service.state == 'speaking') return '播报中…';
    if (_service.isConnected) return '已连接';
    return '未连接';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _buildStatusBar(),
        Expanded(child: _buildMessageList()),
        if (_bootError != null || _service.error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _bootError ?? _service.error ?? '',
                  style: const TextStyle(color: Colors.red, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
                if (_bootError != null)
                  TextButton(onPressed: _retryBootstrap, child: const Text('重试连接')),
              ],
            ),
          ),
        _buildInputBar(),
      ],
    );
  }

  Widget _buildStatusBar() {
    final ok = _service.isConnected;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.5),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: ok ? Colors.green : (_connecting ? Colors.orange : Colors.grey),
            ),
          ),
          const SizedBox(width: 8),
          Text(_statusLabel, style: Theme.of(context).textTheme.bodySmall),
          const Spacer(),
          if (_service.state == 'speaking')
            TextButton(onPressed: () => _service.bargeIn(), child: const Text('打断')),
        ],
      ),
    );
  }

  Widget _buildMessageList() {
    if (_voiceConfigured == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_voiceConfigured == false) {
      final hint = _bootError ??
          '语音服务未配置，请联系管理员设置 TELEAI_*';
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(hint, textAlign: TextAlign.center),
        ),
      );
    }

    final showPartial = _service.partialText.isNotEmpty;
    final itemCount = _service.messages.length + (showPartial ? 1 : 0);

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        if (showPartial && index == itemCount - 1) {
          return _ChatBubble(
            text: _service.partialText,
            isUser: true,
            primary: _primary,
            pending: true,
          );
        }
        final item = _service.messages[index];
        return _ChatBubble(
          text: item['text'] ?? '',
          isUser: item['role'] == 'user',
          primary: _primary,
        );
      },
    );
  }

  Widget _buildInputBar() {
    final disabled = _voiceConfigured != true;
    final samples = _service.demoSamples;

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (samples.isNotEmpty)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final sample in samples)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ActionChip(
                          label: Text(sample.label),
                          onPressed: disabled ? null : () => _runDemo(sample),
                        ),
                      ),
                  ],
                ),
              ),
            if (samples.isNotEmpty) const SizedBox(height: 8),
            Listener(
              behavior: HitTestBehavior.opaque,
              onPointerDown: disabled ? null : (_) => _onHoldStart(),
              onPointerUp: disabled ? null : (_) => _onHoldEnd(),
              onPointerCancel: disabled ? null : (_) => _onHoldEnd(),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 120),
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: disabled
                      ? Colors.grey.shade400
                      : (_holding ? _primary.withOpacity(0.75) : _primary),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: _holding
                      ? [BoxShadow(color: _primary.withOpacity(0.35), blurRadius: 12)]
                      : null,
                ),
                child: Text(
                  disabled
                      ? '语音未就绪'
                      : (_holding ? '松开 发送' : '按住 说话'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({
    required this.text,
    required this.isUser,
    required this.primary,
    this.pending = false,
  });

  final String text;
  final bool isUser;
  final Color primary;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final bg = isUser
        ? (pending ? primary.withOpacity(0.55) : primary)
        : Theme.of(context).colorScheme.surfaceContainerHighest;
    final fg = isUser ? Colors.white : Theme.of(context).colorScheme.onSurface;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: primary.withOpacity(0.15),
              child: Icon(Icons.support_agent, size: 18, color: primary),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                border: pending ? Border.all(color: primary.withOpacity(0.4)) : null,
              ),
              child: Text(
                text,
                style: TextStyle(color: fg, fontSize: 15, height: 1.4),
              ),
            ),
          ),
          if (isUser) const SizedBox(width: 4),
        ],
      ),
    );
  }
}
