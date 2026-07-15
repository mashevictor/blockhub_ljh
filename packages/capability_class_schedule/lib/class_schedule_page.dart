import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _slots = ['08:00-09:40', '10:00-11:40', '14:00-15:40', '16:00-17:40', '19:00-20:40'];

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
  String? _msg;
  final _titleCtrl = TextEditingController();
  final _dateCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  String _slot = _slots.first;

  String get _base => '${widget.branding.apiBaseUrl}/class-schedule';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _dateCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
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
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      setState(() => _msg = '请填写课程名');
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'title': title,
        'schedule_date': _dateCtrl.text.trim(),
        'time_slot': _slot,
        'location': _locationCtrl.text.trim(),
        'category': 'course',
        'app_public_id': _appId,
      });
      _titleCtrl.clear();
      setState(() => _msg = '已排入课表');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
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
    final live = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' == 'published')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('排课', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(
          controller: _titleCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '课程 / 考试名称'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _dateCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '日期，如 2026-07-20'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _locationCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '教室（可空）'),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: _slots.map((s) {
            final selected = _slot == s;
            return ChoiceChip(
              label: Text(s, style: const TextStyle(fontSize: 11)),
              selected: selected,
              selectedColor: color.withOpacity(0.2),
              onSelected: (_) => setState(() => _slot = s),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: color),
          onPressed: _busy ? null : _submit,
          child: const Text('加入课表'),
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('本周课表', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (live.isEmpty)
          Text('暂无课表', style: TextStyle(color: Colors.grey.shade600))
        else
          ...live.map((t) {
            final id = '${t['id']}';
            final slot = '${t['time_slot'] ?? ''}';
            final meta = [t['schedule_date'], t['location']].where((e) => '$e'.isNotEmpty).join(' · ');
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('${t['title']}', style: const TextStyle(fontWeight: FontWeight.bold))),
                        Chip(
                          label: Text(slot.isEmpty ? '时段待定' : slot, style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    if (meta.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(meta, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () => _archive(id),
                      child: const Text('归档', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
