import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _shifts = ['白班', '小夜', '大夜'];

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
  String? _msg;
  final Map<String, String> _values = {
    'from_shift': '白班',
    'to_shift': '小夜',
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
    } catch (e) {
      _items = [];
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if ((_values['shift_date'] ?? '').trim().isEmpty) return;
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'nurse_name': widget.branding.appName,
        'shift_date': (_values['shift_date'] ?? '').trim(),
        'from_shift': _values['from_shift'] ?? '白班',
        'to_shift': _values['to_shift'] ?? '小夜',
        'reason': (_values['reason'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..addAll({'from_shift': '白班', 'to_shift': '小夜'});
      _resetKey++;
      setState(() => _msg = '已提交调班');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
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
    final pending = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' == 'pending')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: GtgtStepComposer(
                title: '我要调班',
                flowHint: '日期 → 原班 → 目标班 → 审批',
                accent: color,
                steps: [
                  const GtgtStep(key: 'shift_date', label: '调班日期', placeholder: '2026-07-20'),
                  GtgtStep(
                    key: 'from_shift',
                    label: '原班次',
                    choices: [for (final s in _shifts) (value: s, label: s)],
                  ),
                  GtgtStep(
                    key: 'to_shift',
                    label: '目标班次',
                    choices: [for (final s in _shifts) (value: s, label: s)],
                  ),
                  const GtgtStep(key: 'reason', label: '事由（可空）', optional: true, placeholder: '家事 / 培训…'),
                ],
                values: _values,
                onChanged: (k, v) => setState(() => _values[k] = v),
                onComplete: _submit,
                busy: _busy,
                resetKey: _resetKey,
                submitLabel: '提交调班',
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '待审批${pending.isEmpty ? '' : ' · ${pending.length}'}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (_msg != null) ...[
                    const SizedBox(height: 8),
                    Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
                  ],
                  const SizedBox(height: 8),
                  if (_loading)
                    const Center(child: CircularProgressIndicator())
                  else if (pending.isEmpty)
                    Text('暂无待审批', style: TextStyle(color: Colors.grey.shade600))
                  else
                    ...pending.map((t) {
                      final id = '${t['id']}';
                      final name = '${t['nurse_name'] ?? t['reporter_name'] ?? '同事'}';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('$name · ${t['shift_date']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text('${t['from_shift']} → ${t['to_shift']}', style: const TextStyle(fontSize: 13)),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: color),
                                    onPressed: () => _advance(id, 'approve'),
                                    child: const Text('通过'),
                                  ),
                                  const SizedBox(width: 8),
                                  OutlinedButton(
                                    onPressed: () => _advance(id, 'reject'),
                                    child: const Text('驳回'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
