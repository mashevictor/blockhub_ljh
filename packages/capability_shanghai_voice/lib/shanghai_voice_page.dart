import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'shanghai_voice_service.dart';

/// 上海话语音助手 App 主界面：对话气泡 + 文字发送 + 按住说话 + 例句 / 关于
class ShanghaiVoicePage extends StatefulWidget {
  const ShanghaiVoicePage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<ShanghaiVoicePage> createState() => _ShanghaiVoicePageState();
}

class _ShanghaiVoicePageState extends State<ShanghaiVoicePage>
    with SingleTickerProviderStateMixin {
  late final ShanghaiVoiceService _service;
  late final String _sessionId;
  late final ScrollController _scrollController;
  late final TextEditingController _textController;
  late final TabController _tabController;

  bool? _voiceConfigured;
  bool _connecting = false;
  bool _holding = false;
  bool _sending = false;
  String? _bootError;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _textController = TextEditingController();
    _tabController = TabController(length: 3, vsync: this);
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
      return '语音服务暂时不可用（502）。请确认服务器 blockhub-api 已启动。';
    }
    if (msg.contains('503') || msg.contains('504')) {
      return '语音服务网关超时，请稍后重试。';
    }
    if (msg.contains('Connection refused') ||
        msg.contains('Failed host lookup') ||
        msg.contains('Network is unreachable')) {
      return '无法连接服务器，请检查手机网络与 API 地址。';
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
    await HapticFeedback.lightImpact();
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
      _tabController.animateTo(0);
    } catch (e) {
      if (mounted) setState(() => _bootError = e.toString());
    }
  }

  Future<void> _sendText() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _sending || _voiceConfigured != true) return;
    setState(() {
      _sending = true;
      _bootError = null;
    });
    try {
      await _connect();
      await _service.sendTextUtterance(text);
      _textController.clear();
      _tabController.animateTo(0);
      await HapticFeedback.selectionClick();
    } catch (e) {
      if (mounted) setState(() => _bootError = e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
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
    _textController.dispose();
    _tabController.dispose();
    _service.dispose();
    super.dispose();
  }

  Color get _primary => Color(widget.branding.primaryColorValue);

  String get _statusLabel {
    if (_connecting || _service.state == 'connecting') return '连接中…';
    if (_holding || _service.isMicActive) return '正在听…';
    if (_service.state == 'thinking') return '思考中…';
    if (_service.state == 'speaking') return '上海话播报中…';
    if (_service.isConnected) return '已连接 · 可说可打字';
    return '未连接';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListenableBuilder(
      listenable: _tabController,
      builder: (context, _) {
        return Column(
          children: [
            _buildStatusBar(theme),
            Material(
              color: theme.colorScheme.surface,
              child: TabBar(
                controller: _tabController,
                labelColor: _primary,
                unselectedLabelColor: theme.colorScheme.onSurfaceVariant,
                indicatorColor: _primary,
                tabs: const [
                  Tab(text: '对话'),
                  Tab(text: '快捷语'),
                  Tab(text: '关于'),
                ],
              ),
            ),
            if (_bootError != null || _service.error != null)
              _buildErrorBanner(theme),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildChatTab(theme),
                  _buildSamplesTab(theme),
                  _buildAboutTab(theme),
                ],
              ),
            ),
            if (_tabController.index != 2) _buildComposer(theme),
          ],
        );
      },
    );
  }

  Widget _buildStatusBar(ThemeData theme) {
    final ok = _service.isConnected;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.55),
        border: Border(bottom: BorderSide(color: theme.dividerColor.withOpacity(0.4))),
      ),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: ok ? const Color(0xFF22C55E) : (_connecting ? Colors.orange : Colors.grey),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _statusLabel,
              style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          if (_service.state == 'speaking')
            TextButton.icon(
              onPressed: () => _service.bargeIn(),
              icon: const Icon(Icons.stop_circle_outlined, size: 18),
              label: const Text('打断'),
              style: TextButton.styleFrom(foregroundColor: _primary),
            ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner(ThemeData theme) {
    return Material(
      color: theme.colorScheme.errorContainer.withOpacity(0.55),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Row(
          children: [
            Icon(Icons.error_outline, size: 18, color: theme.colorScheme.error),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _bootError ?? _service.error ?? '',
                style: TextStyle(color: theme.colorScheme.error, fontSize: 12, height: 1.35),
              ),
            ),
            TextButton(onPressed: _retryBootstrap, child: const Text('重试')),
          ],
        ),
      ),
    );
  }

  Widget _buildChatTab(ThemeData theme) {
    if (_voiceConfigured == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_voiceConfigured == false) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.mic_off, size: 40, color: theme.colorScheme.outline),
              const SizedBox(height: 12),
              Text(
                _bootError ?? '语音服务未配置',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              FilledButton(onPressed: _retryBootstrap, child: const Text('重新连接')),
            ],
          ),
        ),
      );
    }

    final showPartial = _service.partialText.isNotEmpty;
    final itemCount = _service.messages.length + (showPartial ? 1 : 0);

    if (itemCount == 0) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.forum_outlined, size: 48, color: _primary.withOpacity(0.7)),
              const SizedBox(height: 14),
              Text('侬好，阿拉可以讲上海话', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(
                '下方输入文字，或按住说话。回复会用上海话播报。',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
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

  Widget _buildSamplesTab(ThemeData theme) {
    final samples = _service.demoSamples;
    final disabled = _voiceConfigured != true;
    if (samples.isEmpty) {
      return Center(child: Text('暂无快捷语', style: theme.textTheme.bodyMedium));
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('点一条即走真实对话 + TTS', style: theme.textTheme.labelLarge),
        const SizedBox(height: 12),
        for (final sample in samples) ...[
          Card(
            elevation: 0,
            color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.55),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: _primary.withOpacity(0.15),
                child: Icon(Icons.chat_bubble_outline, color: _primary, size: 18),
              ),
              title: Text(sample.label, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(sample.utterance, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: const Icon(Icons.play_arrow_rounded),
              onTap: disabled ? null : () => _runDemo(sample),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _buildAboutTab(ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(
            backgroundColor: _primary.withOpacity(0.15),
            child: Icon(Icons.record_voice_over, color: _primary),
          ),
          title: Text(widget.branding.appName, style: const TextStyle(fontWeight: FontWeight.w800)),
          subtitle: const Text('上海话实时语音 · ASR / LLM / TTS 真链路'),
        ),
        const Divider(height: 28),
        _AboutRow(label: '语音配置', value: _voiceConfigured == true ? '已就绪' : (_voiceConfigured == false ? '未配置' : '检查中')),
        _AboutRow(label: '会话状态', value: _statusLabel),
        _AboutRow(label: 'API', value: widget.branding.apiBaseUrl),
        const SizedBox(height: 20),
        Text(
          '使用说明\n'
          '· 对话：文字发送，走 DeepSeek + 电信上海话 TTS\n'
          '· 按住说话：真实麦克风 ASR（需授权）\n'
          '· 播报中可点「打断」\n'
          '· 快捷语：一键例句验收',
          style: theme.textTheme.bodyMedium?.copyWith(height: 1.55),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: _retryBootstrap,
          icon: const Icon(Icons.refresh),
          label: const Text('重新连接语音服务'),
        ),
      ],
    );
  }

  Widget _buildComposer(ThemeData theme) {
    final disabled = _voiceConfigured != true;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(top: BorderSide(color: theme.dividerColor)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    enabled: !disabled && !_sending,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendText(),
                    decoration: InputDecoration(
                      hintText: disabled ? '连接中…' : '输入一句话…',
                      filled: true,
                      fillColor: theme.colorScheme.surfaceContainerHighest.withOpacity(0.45),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(22),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: disabled || _sending ? null : _sendText,
                  style: IconButton.styleFrom(backgroundColor: _primary),
                  icon: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.send_rounded, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Listener(
              behavior: HitTestBehavior.opaque,
              onPointerDown: disabled ? null : (_) => _onHoldStart(),
              onPointerUp: disabled ? null : (_) => _onHoldEnd(),
              onPointerCancel: disabled ? null : (_) => _onHoldEnd(),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 120),
                height: 52,
                width: double.infinity,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: disabled
                      ? Colors.grey.shade400
                      : (_holding ? _primary.withOpacity(0.78) : _primary),
                  borderRadius: BorderRadius.circular(26),
                  boxShadow: _holding
                      ? [BoxShadow(color: _primary.withOpacity(0.35), blurRadius: 14)]
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _holding ? Icons.mic : Icons.mic_none,
                      color: Colors.white,
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      disabled
                          ? '连接中…'
                          : (_holding ? '松开结束 · 发送语音' : '按住说上海话'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AboutRow extends StatelessWidget {
  const _AboutRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(label, style: Theme.of(context).textTheme.labelLarge),
          ),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyMedium)),
        ],
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
