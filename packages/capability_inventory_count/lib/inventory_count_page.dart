import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class InventoryCountPage extends StatefulWidget {
  const InventoryCountPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<InventoryCountPage> createState() => _InventoryCountPageState();
}

class _InventoryCountPageState extends State<InventoryCountPage> {
  final _loc = TextEditingController();
  final _sku = TextEditingController();
  final _qty = TextEditingController(text: '0');
  List<dynamic> _items = [];
  bool _loading = true;

  String get _base => '${widget.branding.apiBaseUrl}/inventory-count';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _loc.dispose();
    _sku.dispose();
    _qty.dispose();
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
    final sku = _sku.text.trim();
    if (sku.isEmpty) return;
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records', data: {
      'location': _loc.text.trim(),
      'sku_code': sku,
      'qty': int.tryParse(_qty.text.trim()) ?? 0,
      'app_public_id': _appId,
    });
    _loc.clear();
    _sku.clear();
    _qty.text = '0';
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('库存盘点', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        TextField(controller: _loc, decoration: const InputDecoration(labelText: '货位', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _sku, decoration: const InputDecoration(labelText: 'SKU', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _qty, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '数量', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        FilledButton(onPressed: _submit, child: const Text('提交盘点')),
        const SizedBox(height: 16),
        if (_loading) const Center(child: CircularProgressIndicator())
        else ..._items.map((raw) {
          final t = Map<String, dynamic>.from(raw as Map);
          return Card(child: ListTile(
            title: Text('${t['record_no']} · ${t['sku_code']}'),
            subtitle: Text('${t['location']} · qty ${t['qty']} · ${t['status']}'),
          ));
        }),
      ],
    );
  }
}
