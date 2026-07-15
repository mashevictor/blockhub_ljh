import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _processes = ['来料检', '工序检', '成品检', '出货检'];

class QualityInspectPage extends StatefulWidget {
  const QualityInspectPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<QualityInspectPage> createState() => _QualityInspectPageState();
}

class _QualityInspectPageState extends State<QualityInspectPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  String? _msg;
  final _productCtrl = TextEditingController();
  String _processName = _processes.first;

  String get _base => '${widget.branding.apiBaseUrl}/quality-inspect';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _productCtrl.dispose();
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

  Future<void> _judge(String result) async {
    final product = _productCtrl.text.trim();
    if (product.isEmpty) {
      setState(() => _msg = '请填写产品批号/编码');
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'product_code': product,
        'process_name': _processName,
        'result': result,
        'note': result == 'fail' ? '不合格，待复检' : '',
        'app_public_id': _appId,
      });
      _productCtrl.clear();
      setState(() => _msg = result == 'pass' ? '已判定合格' : '已判定不合格');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _close(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/close');
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
        Text('质检判定', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(
          controller: _productCtrl,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: '产品编码 / 批次号',
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: _processes.map((p) {
            final selected = _processName == p;
            return ChoiceChip(
              label: Text(p, style: const TextStyle(fontSize: 12)),
              selected: selected,
              selectedColor: color.withOpacity(0.2),
              onSelected: (_) => setState(() => _processName = p),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: color),
              onPressed: _busy ? null : () => _judge('pass'),
              child: const Text('合格'),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: _busy ? null : () => _judge('fail'),
              child: const Text('不合格'),
            ),
          ],
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('待闭环', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (open.isEmpty)
          Text('暂无待闭环记录', style: TextStyle(color: Colors.grey.shade600))
        else
          ...open.map((t) {
            final id = '${t['id']}';
            final result = '${t['result']}';
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
                          child: Text(
                            '${t['product_code']} · ${t['process_name']}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        Chip(
                          label: Text(result == 'pass' ? '合格' : '不合格', style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: color),
                      onPressed: () => _close(id),
                      child: const Text('闭环归档'),
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
