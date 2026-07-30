import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

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

  String _cat(String raw) => bhTf('cap.leave_request.cat.$raw', raw);
  String _status(String raw) => bhTf('cap.leave_request.status.$raw', raw);

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
    BhL10n.instance.addListener(_onL10n);
    _load();
  }

  @override
  void dispose() {
    BhL10n.instance.removeListener(_onL10n);
    super.dispose();
  }

  void _onL10n() {
    if (mounted) setState(() {});
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
          title: bhTf('cap.leave_request.title.leave', '我要请假'),
          flowHint: bhTf('cap.leave_request.flow.leave', '假种 → 起止日期 → 交主管审'),
          accent: color,
          steps: [
            GtgtStep(
              key: 'category',
              label: bhTf('cap.leave_request.field.category', '假种'),
              choices: [
                (value: 'annual', label: bhTf('cap.leave_request.cat.annual', '年假')),
                (value: 'sick', label: bhTf('cap.leave_request.cat.sick', '病假')),
                (value: 'personal', label: bhTf('cap.leave_request.cat.personal', '事假')),
              ],
            ),
            GtgtStep(
              key: 'start_at',
              label: bhTf('cap.leave_request.field.start_date', '开始日期'),
              placeholder: '2026-07-20',
            ),
            GtgtStep(
              key: 'end_at',
              label: bhTf('cap.leave_request.field.end_date', '结束日期'),
              placeholder: '2026-07-22',
            ),
            GtgtStep(
              key: 'note',
              label: bhTf('cap.leave_request.field.note', '事由（可空）'),
              optional: true,
              multiline: true,
            ),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: bhTf('cap.leave_request.submit.leave', '提交请假'),
        ),
        const SizedBox(height: 16),
        Text(
          _pending.isEmpty
              ? bhTf('cap.leave_request.inbox.pending', '待我审')
              : '${bhTf('cap.leave_request.inbox.pending', '待我审')} · ${_pending.length}',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_pending.isEmpty)
          Text(bhTf('cap.leave_request.inbox.empty', '暂无待审批记录'))
        else
          ..._pending.map((t) {
            final id = '${t['id']}';
            final cat = _cat('${t['category']}');
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${t['applicant'] ?? t['reporter_name'] ?? bhTf('cap.leave_request.colleague', '同事')} · $cat',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text('${t['start_at']} → ${t['end_at']}'),
                    if ('${t['note'] ?? ''}'.isNotEmpty) Text('${t['note']}'),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: color),
                          onPressed: () => _advance(id, 'approved'),
                          child: Text(bhTf('cap.leave_request.action.approve', '通过')),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () => _advance(id, 'rejected'),
                          child: Text(bhTf('cap.leave_request.action.reject', '驳回')),
                        ),
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
            child: Text(
              _showDone
                  ? bhTf('cap.leave_request.done.hide', '收起已处理')
                  : bhTf('cap.leave_request.done.show', '已处理 {{n}}', {'n': _done.length}),
            ),
          ),
          if (_showDone)
            ..._done.map((t) {
              final id = '${t['id']}';
              return Card(
                child: ListTile(
                  title: Text(
                    '${t['applicant'] ?? bhTf('cap.leave_request.colleague', '同事')} · ${_cat('${t['category']}')}',
                  ),
                  subtitle: Text(
                    '${_status('${t['status']}')} · ${t['start_at']} → ${t['end_at']}',
                  ),
                  trailing: '${t['status']}' == 'approved'
                      ? TextButton(
                          onPressed: () => _advance(id, 'done'),
                          child: Text(bhTf('cap.leave_request.action.archive', '归档')),
                        )
                      : null,
                ),
              );
            }),
        ],
      ],
    );
  }
}
