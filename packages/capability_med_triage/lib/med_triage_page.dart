import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class MedTriagePage extends StatefulWidget {
  const MedTriagePage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<MedTriagePage> createState() => _MedTriagePageState();
}

class _MedTriagePageState extends State<MedTriagePage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'urgency': 'normal'};

  String get _base => '${widget.branding.apiBaseUrl}/med-triage';
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
    final s = (_values['symptoms'] ?? '').trim();
    if (s.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'patient_name': (_values['patient'] ?? '').trim(),
        'symptoms': s,
        'suggested_dept': (_values['dept'] ?? '').trim(),
        'urgency': _values['urgency'] ?? 'normal',
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['urgency'] = 'normal';
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _guided(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/guided');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '医疗导诊',
          flowHint: '录症状 → 定紧急度 → 建议科室',
          accent: color,
          steps: [
            const GtgtStep(key: 'patient', label: '患者姓名', placeholder: '可留空', optional: true),
            const GtgtStep(key: 'symptoms', label: '症状描述', placeholder: '咳嗽发烧两天…', multiline: true),
            const GtgtStep(
              key: 'urgency',
              label: '紧急程度',
              choices: [
                (value: 'low', label: '低'),
                (value: 'normal', label: '普通'),
                (value: 'high', label: '紧急'),
              ],
            ),
            const GtgtStep(key: 'dept', label: '建议科室', placeholder: '内科/急诊…', optional: true),
            const GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交导诊',
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
                title: Text('${t['record_no']} · ${t['patient_name']}'),
                subtitle: Text('${t['suggested_dept']} · ${t['symptoms']} · ${t['status']}'),
                trailing: t['status'] == 'open'
                    ? TextButton(onPressed: () => _guided(id), child: const Text('确认指引'))
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
