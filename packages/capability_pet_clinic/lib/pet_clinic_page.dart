import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class PetClinicPage extends StatefulWidget {
  const PetClinicPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<PetClinicPage> createState() => _PetClinicPageState();
}

class _PetClinicPageState extends State<PetClinicPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'consult'};

  String get _base => '${widget.branding.apiBaseUrl}/pet-clinic';
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
    if ((_values['pet_name'] ?? '').trim().isEmpty || (_values['symptom'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': (_values['category'] ?? '').trim(),
        'pet_name': (_values['pet_name'] ?? '').trim(),
        'symptom': (_values['symptom'] ?? '').trim(),
        'schedule_at': (_values['schedule_at'] ?? '').trim(),
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['category'] = 'consult';
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
          title: '宠物问诊',
          flowHint: '登记 → 状态闭环',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '类型',
              choices: [
                (value: 'consult', label: '问诊'),
                (value: 'visit', label: '就诊'),
                (value: 'vaccine', label: '疫苗'),
              ],
            ),
            GtgtStep(key: 'pet_name', label: '宠物名', placeholder: '宠物名'),
            GtgtStep(key: 'symptom', label: '症状/事项', placeholder: '症状/事项'),
            GtgtStep(key: 'schedule_at', label: '预约时间', placeholder: '预约时间', optional: true),
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
                title: Text('${t['record_no']} · ${t['symptom'] ?? t['category']}'),
                subtitle: Text('${t['category']} · ${t['status']}'),
                trailing: Wrap(
                  children: [
                    if (t['status'] != 'scheduled' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'scheduled'), child: const Text('已预约')),
                    if (t['status'] != 'done' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'done'), child: const Text('完成')),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
