import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class GameSupportPage extends StatefulWidget {
  const GameSupportPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<GameSupportPage> createState() => _GameSupportPageState();
}

class _GameSupportPageState extends State<GameSupportPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'ticket'};

  String get _base => '${widget.branding.apiBaseUrl}/game-support';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final q = _appId.isNotEmpty ? '?app_id=${Uri.encodeQueryComponent(_appId)}' : '';
      final resp = await dio.get<Map<String, dynamic>>('$_base/records$q');
      _items = resp.data?['items'] as List<dynamic>? ?? [];
    } catch (_) {
      _items = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if ((_values['title'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': _values['category'] ?? 'ticket',
        'title': (_values['title'] ?? '').trim(),
        'content': (_values['content'] ?? '').trim(),
        'player_name': (_values['player_name'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['category'] = 'ticket';
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _close(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/close');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '玩家 FAQ / 工单',
          flowHint: '类型 → 昵称 → 标题 → 内容',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '类型',
              choices: [
                (value: 'faq', label: 'FAQ/攻略'),
                (value: 'ticket', label: '客服工单'),
              ],
            ),
            GtgtStep(key: 'player_name', label: '玩家昵称', optional: true),
            GtgtStep(key: 'title', label: '标题', placeholder: '活动规则 / 掉线反馈…'),
            GtgtStep(key: 'content', label: '详细内容', optional: true, multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交',
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            final id = '${t['id']}';
            return Card(
              child: ListTile(
                title: Text('${t['record_no']} · ${t['title']}'),
                subtitle: Text('${t['category']} · ${t['player_name']} · ${t['status']}'),
                trailing: t['status'] == 'open'
                    ? TextButton(onPressed: () => _close(id), child: const Text('关闭'))
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
