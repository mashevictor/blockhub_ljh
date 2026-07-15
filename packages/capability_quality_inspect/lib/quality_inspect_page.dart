import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

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
  int _resetKey = 0;
  final Map<String, String> _values = {'result': 'pass'};

  String get _base => '${widget.branding.apiBaseUrl}/quality-inspect';
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
    final code = (_values['product'] ?? '').trim();
    if (code.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'product_code': code,
        'process_name': (_values['process'] ?? '').trim(),
        'result': _values['result'] == 'fail' ? 'fail' : 'pass',
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['result'] = 'pass';
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
          title: '质检 SOP',
          flowHint: '产品 → 工序 → 结论 → 备注',
          accent: color,
          steps: const [
            GtgtStep(key: 'product', label: '产品/批次', placeholder: 'LOT-…'),
            GtgtStep(key: 'process', label: '工序', placeholder: '终检/焊接', optional: true),
            GtgtStep(
              key: 'result',
              label: '结论',
              choices: [
                (value: 'pass', label: '合格'),
                (value: 'fail', label: '不合格'),
              ],
            ),
            GtgtStep(key: 'note', label: '备注', optional: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交质检',
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            return Card(
              child: ListTile(
                title: Text('${t['record_no']} · ${t['product_code']}'),
                subtitle: Text('${t['process_name']} · ${t['result']} · ${t['status']}'),
              ),
            );
          }),
      ],
    );
  }
}
