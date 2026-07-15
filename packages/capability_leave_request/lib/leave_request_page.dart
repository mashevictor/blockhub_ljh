import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _catLabel = {'annual': '年假', 'sick': '病假', 'personal': '事假'};
const _statusLabel = {
  'open': '待审批',
  'approved': '已通过',
  'rejected': '已驳回',
  'done': '已归档',
};

class LeaveRequestPage extends StatefulWidget {
  const LeaveRequestPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<LeaveRequestPage> createState() => _LeaveRequestPageState();
}

class _LeaveRequestPageState extends State<LeaveRequestPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  bool _showDone = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'annual'};

  String get _base => '${widget.branding.apiBaseUrl}/leave-request';
  String get _appId => widget.branding.appPublicId.trim();

  List<Map<String, dynamic>> get _pending => _items
      .map((e) => Map<String, dynamic>.from(e as Map))
      .where((t) => '${t['status']}' == 'open')
      .toList();

  List<Map<String, dynamic>> get _done => _items
      .map((e) => Map<String, dynamic>.from(e as Map))
      .where((t) => '${t['status']}' != 'open')
      .toList();

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
    if ((_values['start_at'] ?? '').trim().isEmpty || (_values['end_at'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': _values['category'] ?? 'annual',
        'applicant': '',
        'start_at': (_values['start_at'] ?? '').trim(),
        'end_at': (_values['end_at'] ?? '').trim(),
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['category'] = 'annual';
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
          title: '我要请假',
          flowHint: '假种 → 起止日期 → 交主管审',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '假种',
              choices: [
                (value: 'annual', label: '年假'),
                (value: 'sick', label: '病假'),
                (value: 'personal', label: '事假'),
              ],
            ),
            GtgtStep(key: 'start_at', label: '开始日期', placeholder: '2026-07-20'),
            GtgtStep(key: 'end_at', label: '结束日期', placeholder: '2026-07-22'),
            GtgtStep(key: 'note', label: '事由（可空）', optional: true, multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交请假',
        ),
        const SizedBox(height: 16),
        Text('待我审${_pending.isEmpty ? '' : ' · ${_pending.length}'}',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_pending.isEmpty)
          const Text('暂无待审批请假')
        else
          ..._pending.map((t) {
            final id = '${t['id']}';
            final cat = _catLabel['${t['category']}'] ?? '${t['category']}';
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${t['applicant'] ?? t['reporter_name'] ?? '同事'} · $cat',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('${t['start_at']} → ${t['end_at']}'),
                    if ('${t['note'] ?? ''}'.isNotEmpty) Text('${t['note']}'),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: color),
                          onPressed: () => _advance(id, 'approved'),
                          child: const Text('通过'),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(onPressed: () => _advance(id, 'rejected'), child: const Text('驳回')),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
        if (_done.isNotEmpty) ...[
          TextButton(
            onPressed: () => setState(() => _showDone = !_showDone),
            child: Text(_showDone ? '收起已处理' : '已处理 ${_done.length}'),
          ),
          if (_showDone)
            ..._done.map((t) {
              final id = '${t['id']}';
              return Card(
                child: ListTile(
                  title: Text('${t['applicant'] ?? '同事'} · ${_catLabel['${t['category']}'] ?? t['category']}'),
                  subtitle: Text('${_statusLabel['${t['status']}'] ?? t['status']} · ${t['start_at']} → ${t['end_at']}'),
                  trailing: '${t['status']}' == 'approved'
                      ? TextButton(onPressed: () => _advance(id, 'done'), child: const Text('归档'))
                      : null,
                ),
              );
            }),
        ],
      ],
    );
  }
}
