import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class QualityInspectPage extends StatefulWidget {
  const QualityInspectPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<QualityInspectPage> createState() => _QualityInspectPageState();
}

class _QualityInspectPageState extends State<QualityInspectPage> {
  final _product = TextEditingController();
  final _process = TextEditingController();
  final _note = TextEditingController();
  List<dynamic> _items = [];
  String _result = 'pass';
  bool _loading = true;

  String get _base => '${widget.branding.apiBaseUrl}/quality-inspect';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _product.dispose();
    _process.dispose();
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

  Future<void> _submit() async {
    final code = _product.text.trim();
    if (code.isEmpty) return;
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records', data: {
      'product_code': code,
      'process_name': _process.text.trim(),
      'result': _result,
      'note': _note.text.trim(),
      'app_public_id': _appId,
    });
    _product.clear();
    _process.clear();
    _note.clear();
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('质检 SOP', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        TextField(controller: _product, decoration: const InputDecoration(labelText: '产品/批次', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _process, decoration: const InputDecoration(labelText: '工序', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        Row(children: [
          ChoiceChip(label: const Text('合格'), selected: _result == 'pass', onSelected: (_) => setState(() => _result = 'pass')),
          const SizedBox(width: 8),
          ChoiceChip(label: const Text('不合格'), selected: _result == 'fail', onSelected: (_) => setState(() => _result = 'fail')),
        ]),
        const SizedBox(height: 8),
        TextField(controller: _note, decoration: const InputDecoration(labelText: '备注', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        FilledButton(onPressed: _submit, child: const Text('提交质检')),
        const SizedBox(height: 16),
        if (_loading) const Center(child: CircularProgressIndicator())
        else ..._items.map((raw) {
          final t = Map<String, dynamic>.from(raw as Map);
          return Card(child: ListTile(
            title: Text('${t['record_no']} · ${t['product_code']}'),
            subtitle: Text('${t['process_name']} · ${t['result']} · ${t['status']}'),
          ));
        }),
      ],
    );
  }
}
