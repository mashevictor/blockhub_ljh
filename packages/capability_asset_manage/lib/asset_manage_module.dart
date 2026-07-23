import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class AssetManageModule implements CapabilityModule {
  const AssetManageModule();

  @override
  String get capabilityKey => 'asset_manage';

  @override
  Widget buildPage(AppBranding branding) => AssetManagePage(branding: branding);
}

class AssetManagePage extends StatefulWidget {
  const AssetManagePage({super.key, required this.branding});
  final AppBranding branding;

  @override
  State<AssetManagePage> createState() => _AssetManagePageState();
}

class _AssetManagePageState extends State<AssetManagePage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  String _msg = '';
  final Map<String, String> _values = {'category': 'borrow', 'quantity': '1'};

  String get _base => '${widget.branding.apiBaseUrl}/asset-manage';
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
      _msg = '';
    } catch (e) {
      _items = [];
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if ((_values['asset_name'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': (_values['category'] ?? 'borrow').trim(),
        'asset_name': (_values['asset_name'] ?? '').trim(),
        'asset_code': (_values['asset_code'] ?? '').trim(),
        'quantity': (_values['quantity'] ?? '1').trim(),
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..addAll({'category': 'borrow', 'quantity': '1'});
      _resetKey++;
      await _load();
    } catch (e) {
      _msg = '$e';
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
          title: '资产管理',
          flowHint: '>> 单字段推进 → 真库',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '类型',
              choices: [
                (value: 'borrow', label: '领用'),
                (value: 'return', label: '归还'),
                (value: 'inventory', label: '盘点'),
                (value: 'scrap', label: '报废'),
              ],
            ),
            GtgtStep(key: 'asset_name', label: '资产名称'),
            GtgtStep(key: 'asset_code', label: '资产编码', optional: true),
            GtgtStep(key: 'quantity', label: '数量', optional: true),
            GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交真库',
        ),
        if (_msg.isNotEmpty) Text(_msg, style: TextStyle(color: color)),
        const SizedBox(height: 12),
        if (_loading)
          const Text('加载中…')
        else if (_items.isEmpty)
          const Text('空库无资产单')
        else
          ..._items.map((raw) {
            final t = raw as Map;
            return Card(
              child: ListTile(
                title: Text('${t['asset_name'] ?? ''}'),
                subtitle: Text('${t['record_no'] ?? ''} · ${t['category'] ?? ''} · ${t['status'] ?? ''}'),
              ),
            );
          }),
      ],
    );
  }
}
