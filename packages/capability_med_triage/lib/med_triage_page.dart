import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class MedTriagePage extends StatefulWidget {
  const MedTriagePage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<MedTriagePage> createState() => _MedTriagePageState();
}

class _MedTriagePageState extends State<MedTriagePage> {
  final _patient = TextEditingController();
  final _symptoms = TextEditingController();
  final _dept = TextEditingController();
  final _note = TextEditingController();
  List<dynamic> _items = [];
  String _urgency = 'normal';
  bool _loading = true;

  String get _base => '${widget.branding.apiBaseUrl}/med-triage';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _patient.dispose();
    _symptoms.dispose();
    _dept.dispose();
    _note.dispose();
    super.dispose();
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

  Future<void> _suggest() async {
    final s = _symptoms.text.trim();
    if (s.isEmpty) return;
    final dio = getRuntimeAuthedDio();
    final resp = await dio.post<Map<String, dynamic>>('$_base/suggest-dept', data: {'symptoms': s});
    final dept = resp.data?['suggested_dept'] as String? ?? '';
    if (mounted) setState(() => _dept.text = dept);
  }

  Future<void> _submit() async {
    final s = _symptoms.text.trim();
    if (s.isEmpty) return;
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records', data: {
      'patient_name': _patient.text.trim(),
      'symptoms': s,
      'suggested_dept': _dept.text.trim(),
      'urgency': _urgency,
      'note': _note.text.trim(),
      'app_public_id': _appId,
    });
    _patient.clear();
    _symptoms.clear();
    _dept.clear();
    _note.clear();
    _urgency = 'normal';
    await _load();
  }

  Future<void> _guided(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/guided');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('医疗导诊', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        TextField(controller: _patient, decoration: const InputDecoration(labelText: '患者姓名', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _symptoms, maxLines: 3, decoration: const InputDecoration(labelText: '症状', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        Row(children: [
          ChoiceChip(label: const Text('低'), selected: _urgency == 'low', onSelected: (_) => setState(() => _urgency = 'low')),
          const SizedBox(width: 8),
          ChoiceChip(label: const Text('普通'), selected: _urgency == 'normal', onSelected: (_) => setState(() => _urgency = 'normal')),
          const SizedBox(width: 8),
          ChoiceChip(label: const Text('紧急'), selected: _urgency == 'high', onSelected: (_) => setState(() => _urgency = 'high')),
        ]),
        const SizedBox(height: 8),
        TextField(controller: _dept, decoration: const InputDecoration(labelText: '建议科室', border: OutlineInputBorder())),
        TextButton(onPressed: _suggest, child: const Text('根据症状建议科室')),
        TextField(controller: _note, decoration: const InputDecoration(labelText: '备注', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        FilledButton(onPressed: _submit, child: const Text('提交导诊')),
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
