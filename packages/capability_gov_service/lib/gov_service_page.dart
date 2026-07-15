import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class GovServicePage extends StatefulWidget {
  const GovServicePage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<GovServicePage> createState() => _GovServicePageState();
}

class _GovServicePageState extends State<GovServicePage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'guide'};

  String get _base => '${widget.branding.apiBaseUrl}/gov-service';
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
        'category': (_values['category'] ?? '').trim(),
        'title': (_values['title'] ?? '').trim(),
        'dept': (_values['dept'] ?? '').trim(),
        'ticket_no': (_values['ticket_no'] ?? '').trim(),
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['category'] = 'guide';
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _advance(String id, String action) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/$action');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '政务办事',
          flowHint: '登记 → 状态闭环',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '类型',
              choices: [
                (value: 'guide', label: '指南'),
                (value: 'appeal', label: '诉求'),
                (value: 'progress', label: '进度'),
              ],
            ),
            GtgtStep(key: 'title', label: '事项标题', placeholder: '事项标题'),
            GtgtStep(key: 'dept', label: '部门/窗口', placeholder: '部门/窗口', optional: true),
            GtgtStep(key: 'ticket_no', label: '受理号', placeholder: '受理号', optional: true),
            GtgtStep(key: 'note', label: '备注', placeholder: '备注', optional: true, multiline: true),
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
                title: Text('${t['record_no']} · ${t['title'] ?? t['category']}'),
                subtitle: Text('${t['category']} · ${t['status']}'),
                trailing: Wrap(
                  children: [
                    if (t['status'] != 'processing' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'processing'), child: const Text('办理中')),
                    if (t['status'] != 'done' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'done'), child: const Text('办结')),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
