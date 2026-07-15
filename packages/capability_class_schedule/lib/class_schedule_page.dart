import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class ClassSchedulePage extends StatefulWidget {
  const ClassSchedulePage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<ClassSchedulePage> createState() => _ClassSchedulePageState();
}

class _ClassSchedulePageState extends State<ClassSchedulePage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'course'};

  String get _base => '${widget.branding.apiBaseUrl}/class-schedule';
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
      final cat = _values['category'];
      await dio.post('$_base/records', data: {
        'title': (_values['title'] ?? '').trim(),
        'schedule_date': (_values['schedule_date'] ?? '').trim(),
        'time_slot': (_values['time_slot'] ?? '').trim(),
        'location': (_values['location'] ?? '').trim(),
        'category': (cat == 'exam' || cat == 'classroom') ? cat : 'course',
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['category'] = 'course';
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _archive(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/archive');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '课表查询',
          flowHint: '类型 → 标题 → 日期 → 时段 → 地点',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '类型',
              choices: [
                (value: 'course', label: '课程'),
                (value: 'exam', label: '考试'),
                (value: 'classroom', label: '教室'),
              ],
            ),
            GtgtStep(key: 'title', label: '标题', placeholder: '高等数学…'),
            GtgtStep(key: 'schedule_date', label: '日期', placeholder: '2026-03-15'),
            GtgtStep(key: 'time_slot', label: '时段', optional: true),
            GtgtStep(key: 'location', label: '地点', optional: true),
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
                subtitle: Text('${t['schedule_date']} · ${t['category']} · ${t['status']}'),
                trailing: t['status'] == 'published'
                    ? TextButton(onPressed: () => _archive(id), child: const Text('归档'))
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
