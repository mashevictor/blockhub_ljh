import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class NurseShiftPage extends StatefulWidget {
  const NurseShiftPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<NurseShiftPage> createState() => _NurseShiftPageState();
}

class _NurseShiftPageState extends State<NurseShiftPage> {
  final _name = TextEditingController();
  final _date = TextEditingController();
  final _from = TextEditingController(text: '白班');
  final _to = TextEditingController(text: '夜班');
  final _reason = TextEditingController();
  List<dynamic> _items = [];
  bool _loading = true;

  String get _base => '${widget.branding.apiBaseUrl}/nurse-shift';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _date.dispose();
    _from.dispose();
    _to.dispose();
    _reason.dispose();
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

  Future<void> _submit() async {
    if (_date.text.trim().isEmpty) return;
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records', data: {
      'nurse_name': _name.text.trim(),
      'shift_date': _date.text.trim(),
      'from_shift': _from.text.trim(),
      'to_shift': _to.text.trim(),
      'reason': _reason.text.trim(),
      'app_public_id': _appId,
    });
    _name.clear();
    _date.clear();
    _reason.clear();
    await _load();
  }

  Future<void> _decide(String id, bool approve) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/${approve ? 'approve' : 'reject'}');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('护士排班', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        TextField(controller: _name, decoration: const InputDecoration(labelText: '护士姓名', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _date, decoration: const InputDecoration(labelText: '值班日期 YYYY-MM-DD', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _from, decoration: const InputDecoration(labelText: '原班次', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _to, decoration: const InputDecoration(labelText: '目标班次', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _reason, decoration: const InputDecoration(labelText: '原因', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        FilledButton(onPressed: _submit, child: const Text('提交调班')),
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
