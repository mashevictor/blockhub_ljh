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
  int _resetKey = 0;
  final Map<String, String> _values = {'qty': '0'};

  String get _base => '${widget.branding.apiBaseUrl}/inventory-count';
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
    final sku = (_values['sku'] ?? '').trim();
    if (sku.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'location': (_values['location'] ?? '').trim(),
        'sku_code': sku,
        'qty': int.tryParse((_values['qty'] ?? '0').trim()) ?? 0,
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['qty'] = '0';
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '库存盘点',
          flowHint: '货位 → SKU → 数量',
          accent: color,
          steps: const [
            GtgtStep(key: 'location', label: '货位', placeholder: 'A区-3货架', optional: true),
            GtgtStep(key: 'sku', label: 'SKU', placeholder: 'SKU-10086'),
            GtgtStep(key: 'qty', label: '实盘数量', placeholder: '0', keyboardType: TextInputType.number),
            GtgtStep(key: 'note', label: '备注', optional: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交盘点',
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            return Card(
              child: ListTile(
                title: Text('${t['record_no']} · ${t['sku_code']}'),
                subtitle: Text('${t['location']} · qty ${t['qty']} · ${t['status']}'),
              ),
            );
          }),
      ],
    );
  }
}
