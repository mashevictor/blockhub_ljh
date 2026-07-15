import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class NurseShiftPage extends StatefulWidget {
  const NurseShiftPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<NurseShiftPage> createState() => _NurseShiftPageState();
}

class _NurseShiftPageState extends State<NurseShiftPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {
    'from_shift': '白班',
    'to_shift': '夜班',
  };

  String get _base => '${widget.branding.apiBaseUrl}/nurse-shift';
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
    if ((_values['shift_date'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'nurse_name': (_values['nurse_name'] ?? '').trim(),
        'shift_date': (_values['shift_date'] ?? '').trim(),
        'from_shift': (_values['from_shift'] ?? '').trim(),
        'to_shift': (_values['to_shift'] ?? '').trim(),
        'reason': (_values['reason'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..addAll({'from_shift': '白班', 'to_shift': '夜班'});
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _decide(String id, bool approve) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/${approve ? 'approve' : 'reject'}');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '护士排班',
          flowHint: '姓名 → 日期 → 原班次 → 目标班次',
          accent: color,
          steps: const [
            GtgtStep(key: 'nurse_name', label: '护士姓名', optional: true),
            GtgtStep(key: 'shift_date', label: '值班日期', placeholder: 'YYYY-MM-DD'),
            GtgtStep(key: 'from_shift', label: '原班次', placeholder: '白班 / 小夜 / 大夜'),
            GtgtStep(key: 'to_shift', label: '目标班次', placeholder: '希望调至'),
            GtgtStep(key: 'reason', label: '调班原因', optional: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交调班',
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
                title: Text('${t['record_no']} · ${t['nurse_name']}'),
                subtitle: Text('${t['shift_date']} ${t['from_shift']}→${t['to_shift']} · ${t['status']}'),
                trailing: t['status'] == 'pending'
                    ? Wrap(spacing: 4, children: [
                        TextButton(onPressed: () => _decide(id, true), child: const Text('通过')),
                        TextButton(onPressed: () => _decide(id, false), child: const Text('驳回')),
                      ])
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
