import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class SchoolNoticePage extends StatefulWidget {
  const SchoolNoticePage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<SchoolNoticePage> createState() => _SchoolNoticePageState();
}

class _SchoolNoticePageState extends State<SchoolNoticePage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {
    'category': 'notice',
    'audience': '全班家长',
  };

  String get _base => '${widget.branding.apiBaseUrl}/school-notice';
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
        'category': _values['category'] ?? 'notice',
        'audience': (_values['audience'] ?? '').trim(),
        'title': (_values['title'] ?? '').trim(),
        'content': (_values['content'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..addAll({'category': 'notice', 'audience': '全班家长'});
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _ack(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/ack');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '家校通知',
          flowHint: '类型 → 受众 → 标题 → 正文',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '类型',
              choices: [
                (value: 'notice', label: '通知'),
                (value: 'signup', label: '报名'),
                (value: 'message', label: '留言'),
              ],
            ),
            GtgtStep(key: 'audience', label: '受众', placeholder: '三年二班家长'),
            GtgtStep(key: 'title', label: '标题', placeholder: '春季运动会报名'),
            GtgtStep(key: 'content', label: '正文', optional: true, multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '发布',
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
                subtitle: Text('${t['audience']} · ${t['category']} · ${t['status']}'),
                trailing: t['status'] == 'published'
                    ? TextButton(onPressed: () => _ack(id), child: const Text('回执'))
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
