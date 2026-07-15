import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class PropertyRepairPage extends StatefulWidget {
  const PropertyRepairPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<PropertyRepairPage> createState() => _PropertyRepairPageState();
}

class _PropertyRepairPageState extends State<PropertyRepairPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/property-repair';
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
    if ((_values['asset_name'] ?? '').trim().isEmpty || (_values['fault'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'location': (_values['location'] ?? '未填位置').trim(),
        'asset_name': (_values['asset_name'] ?? '').trim(),
        'fault': (_values['fault'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values.clear();
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _dispatch(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/dispatch');
    await _load();
  }

  Future<void> _done(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/done');
    await _load();
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'open':
        return '待派工';
      case 'dispatched':
        return '维修中';
      case 'done':
        return '已完成';
      default:
        return s;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '物业报修',
          flowHint: '位置 → 资产 → 故障',
          accent: color,
          steps: const [
            GtgtStep(key: 'location', label: '位置', placeholder: '楼栋/房号', optional: true),
            GtgtStep(key: 'asset_name', label: '资产名称', placeholder: '电梯/门禁…'),
            GtgtStep(key: 'fault', label: '故障描述', multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交报修',
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            final id = '${t['id']}';
            final status = '${t['status']}';
            return Card(
              child: ListTile(
                title: Text('${t['record_no']} · ${t['asset_name']}'),
                subtitle: Text('${t['location']} · ${_statusLabel(status)}'),
                trailing: status == 'open'
                    ? TextButton(onPressed: () => _dispatch(id), child: const Text('派工'))
                    : status == 'dispatched'
                        ? TextButton(onPressed: () => _done(id), child: const Text('完工'))
                        : null,
              ),
            );
          }),
      ],
    );
  }
}
