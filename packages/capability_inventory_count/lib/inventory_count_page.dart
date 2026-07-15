import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class InventoryCountPage extends StatefulWidget {
  const InventoryCountPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<InventoryCountPage> createState() => _InventoryCountPageState();
}

class _InventoryCountPageState extends State<InventoryCountPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  String? _msg;
  final _locationCtrl = TextEditingController();
  final _skuCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/inventory-count';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _locationCtrl.dispose();
    _skuCtrl.dispose();
    _qtyCtrl.dispose();
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
    final sku = _skuCtrl.text.trim();
    if (sku.isEmpty) {
      setState(() => _msg = '请填写 SKU');
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'location': _locationCtrl.text.trim().isEmpty ? '默认货位' : _locationCtrl.text.trim(),
        'sku_code': sku,
        'qty': _qtyCtrl.text.trim().isEmpty ? '0' : _qtyCtrl.text.trim(),
        'note': '',
        'app_public_id': _appId,
      });
      _skuCtrl.clear();
      _qtyCtrl.clear();
      setState(() => _msg = '已录入盘点行');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/confirm');
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
        Text('扫码盘点', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(
          controller: _locationCtrl,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: '货位（可空）',
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _skuCtrl,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'SKU / 条码',
          ),
          onSubmitted: (_) => _submit(),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _qtyCtrl,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: '实盘数量',
          ),
          onSubmitted: (_) => _submit(),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: color),
          onPressed: _busy ? null : _submit,
          child: const Text('录入本行'),
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('待确认入库${pending.isEmpty ? '' : ' · ${pending.length}'}', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (pending.isEmpty)
          Text('暂无待确认记录', style: TextStyle(color: Colors.grey.shade600))
        else
          ...pending.map((t) {
            final id = '${t['id']}';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text('${t['sku_code']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                        Chip(
                          label: Text('×${t['qty']}', style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    if ('${t['location'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['location']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: color),
                      onPressed: () => _confirm(id),
                      child: const Text('确认入库'),
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
