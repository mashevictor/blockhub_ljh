import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _statusLabel = {
  'open': '待派送',
  'delivering': '配送中',
  'done': '已送达',
  'exception': '异常',
};

class DeliveryOrderPage extends StatefulWidget {
  const DeliveryOrderPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<DeliveryOrderPage> createState() => _DeliveryOrderPageState();
}

class _DeliveryOrderPageState extends State<DeliveryOrderPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  bool _showForm = true;
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/delivery-order';
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
    if ((_values['pickup'] ?? '').trim().isEmpty || (_values['dropoff'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': 'dispatch',
        'pickup': (_values['pickup'] ?? '').trim(),
        'dropoff': (_values['dropoff'] ?? '').trim(),
        'rider_name': (_values['rider_name'] ?? '').trim(),
        'note': '',
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

  Widget _track(String status, Color color) {
    const steps = ['open', 'delivering', 'done'];
    final idx = steps.indexOf(status);
    return Row(
      children: List.generate(steps.length, (i) {
        final active = idx >= 0 && i <= idx;
        return Expanded(
          child: Column(
            children: [
              Container(
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: active ? color : Colors.black12,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              Text(_statusLabel[steps[i]] ?? '', style: TextStyle(fontSize: 10, color: active ? color : Colors.grey)),
            ],
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final active = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' != 'done')
        .toList();
    final finished = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' == 'done')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_showForm || _items.isEmpty)
          GtgtStepComposer(
            title: '新建运单',
            flowHint: '取货点 → 送达地址 → 可选骑手',
            accent: color,
            steps: const [
              GtgtStep(key: 'pickup', label: '取餐 / 取货点', placeholder: '例如：陆家嘴店'),
              GtgtStep(key: 'dropoff', label: '送达地址', placeholder: '例如：浦东新区××路'),
              GtgtStep(key: 'rider_name', label: '骑手（可空）', optional: true),
            ],
            values: _values,
            onChanged: (k, v) => setState(() => _values[k] = v),
            onComplete: _submit,
            busy: _busy,
            resetKey: _resetKey,
            submitLabel: '创建运单',
          )
        else
          TextButton(onPressed: () => setState(() => _showForm = true), child: const Text('+ 新建运单')),
        const SizedBox(height: 12),
        Text('在途运单', style: Theme.of(context).textTheme.titleSmall),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (active.isEmpty)
          const Text('暂无在途订单')
        else
          ...active.map((t) {
            final id = '${t['id']}';
            final status = '${t['status']}';
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${t['record_no']} · ${_statusLabel[status] ?? status}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('${t['pickup']} → ${t['dropoff']}'),
                    if ('${t['rider_name'] ?? ''}'.isNotEmpty) Text('骑手 ${t['rider_name']}'),
                    const SizedBox(height: 8),
                    _track(status, color),
                    const SizedBox(height: 8),
                    if (status == 'open')
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: color),
                        onPressed: () => _advance(id, 'delivering'),
                        child: const Text('开始配送'),
                      ),
                    if (status == 'delivering')
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: color),
                        onPressed: () => _advance(id, 'done'),
                        child: const Text('送达完成'),
                      ),
                  ],
                ),
              ),
            );
          }),
        if (finished.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text('已送达 · ${finished.length}', style: Theme.of(context).textTheme.titleSmall),
          ...finished.take(8).map(
                (t) => Card(
                  child: ListTile(
                    title: Text('${t['pickup']} → ${t['dropoff']}'),
                    trailing: const Text('已送达'),
                  ),
                ),
              ),
        ],
      ],
    );
  }
}
