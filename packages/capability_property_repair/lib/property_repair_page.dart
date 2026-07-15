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
  bool _showForm = true;
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
      if (_items.isNotEmpty) _showForm = false;
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
      _showForm = false;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _advance(String id, String action) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/$action');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final open = _items.where((e) => '${(e as Map)['status']}' == 'open').toList();
    final busy = _items.where((e) => '${(e as Map)['status']}' == 'dispatched').toList();
    final done = _items.where((e) => '${(e as Map)['status']}' == 'done').toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('流程：业主提单 → 派工 → 维修 → 完工', style: TextStyle(color: Colors.grey.shade700)),
        const SizedBox(height: 8),
        if (_showForm || _items.isEmpty)
          GtgtStepComposer(
            title: '业主报修',
            flowHint: '位置 → 对象 → 故障',
            accent: color,
            steps: const [
              GtgtStep(key: 'location', label: '楼栋 / 房号', placeholder: '3号楼·502'),
              GtgtStep(key: 'asset_name', label: '报修对象', placeholder: '电梯 / 门禁'),
              GtgtStep(key: 'fault', label: '故障现象', placeholder: '渗水、异响…'),
            ],
            values: _values,
            onChanged: (k, v) => setState(() => _values[k] = v),
            onComplete: _submit,
            busy: _busy,
            resetKey: _resetKey,
            submitLabel: '提交报修',
          )
        else
          TextButton(onPressed: () => setState(() => _showForm = true), child: const Text('+ 新建报修')),
        const SizedBox(height: 12),
        Text('待派工 · ${open.length}', style: Theme.of(context).textTheme.titleSmall),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ...open.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${t['asset_name']} · ${t['location']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('${t['fault']}'),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: color),
                      onPressed: () => _advance('${t['id']}', 'dispatch'),
                      child: const Text('派给师傅'),
                    ),
                  ],
                ),
              ),
            );
          }),
        if (busy.isNotEmpty) ...[
          Text('维修中 · ${busy.length}', style: Theme.of(context).textTheme.titleSmall),
          ...busy.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            return Card(
              child: ListTile(
                title: Text('${t['asset_name']}'),
                subtitle: Text('${t['fault']}'),
                trailing: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: color),
                  onPressed: () => _advance('${t['id']}', 'done'),
                  child: const Text('完工'),
                ),
              ),
            );
          }),
        ],
        if (done.isNotEmpty) Text('已完工 · ${done.length}'),
      ],
    );
  }
}
