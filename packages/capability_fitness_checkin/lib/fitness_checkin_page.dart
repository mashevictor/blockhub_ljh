import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _cats = [
  ('book', '预约课'),
  ('checkin', '到店打卡'),
  ('coach', '私教'),
];

class FitnessCheckinPage extends StatefulWidget {
  const FitnessCheckinPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<FitnessCheckinPage> createState() => _FitnessCheckinPageState();
}

class _FitnessCheckinPageState extends State<FitnessCheckinPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  String? _msg;
  String _category = 'checkin';
  final _classCtrl = TextEditingController();
  final _whenCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/fitness-checkin';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _classCtrl.dispose();
    _whenCtrl.dispose();
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
    final className = _classCtrl.text.trim();
    if (className.isEmpty) {
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
        'category': _category,
        'member_name': widget.branding.appName,
        'class_name': className,
        'schedule_at': _whenCtrl.text.trim(),
        'note': '',
        'app_public_id': _appId,
      });
      _classCtrl.clear();
      _whenCtrl.clear();
      setState(() => _msg = _category == 'checkin' ? '打卡成功' : '已预约');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _done(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/done');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final open = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' == 'open')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('健身预约 / 打卡', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: _cats.map((c) {
            final selected = _category == c.$1;
            return ChoiceChip(
              label: Text(c.$2),
              selected: selected,
              selectedColor: color.withOpacity(0.2),
              onSelected: (_) => setState(() => _category = c.$1),
            );
          }).toList(),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _classCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '课程名'),
        ),
        if (_category != 'checkin') ...[
          const SizedBox(height: 8),
          TextField(
            controller: _whenCtrl,
            decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '预约时间，如 2026-07-20 18:00'),
          ),
        ],
        const SizedBox(height: 12),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: color),
          onPressed: _busy ? null : _submit,
          child: Text(_category == 'checkin' ? '立即打卡' : '预约课程'),
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (open.isEmpty)
          Text('暂无记录', style: TextStyle(color: Colors.grey.shade600))
        else
          ...open.map((t) {
            final id = '${t['id']}';
            final member = '${t['member_name'] ?? ''}';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('${t['class_name']}', style: const TextStyle(fontWeight: FontWeight.bold))),
                        Chip(
                          label: Text(member.isEmpty ? '会员' : member, style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    if ('${t['schedule_at'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['schedule_at']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: color),
                      onPressed: () => _done(id),
                      child: const Text('完成'),
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
