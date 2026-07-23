import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class MfgOpsPage extends StatefulWidget {
  const MfgOpsPage({super.key, required this.branding, required this.kind});
  final AppBranding branding;
  final String kind;

  @override
  State<MfgOpsPage> createState() => _MfgOpsPageState();
}

class _MfgOpsPageState extends State<MfgOpsPage> {
  int _reset = 0;
  List<Map<String, dynamic>> _items = [];

  Future<void> _load() async {
    final dio = getRuntimeAuthedDio(widget.branding);
    final appId = widget.branding.appPublicId;
    final res = await dio.get(
      '/api/v1/mfg-ops/${widget.kind}/records',
      queryParameters: {if (appId != null && appId.isNotEmpty) 'app_id': appId},
    );
    setState(() => _items = ((res.data['items'] as List?) ?? []).cast<Map<String, dynamic>>());
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _submit(Map<String, String> values) async {
    final dio = getRuntimeAuthedDio(widget.branding);
    await dio.post('/api/v1/mfg-ops/${widget.kind}/records', data: {
      'title': values['title'] ?? '未命名',
      'field_a': values['field_a'] ?? '',
      'field_b': values['field_b'] ?? '',
      'note': values['note'] ?? '',
      'app_public_id': widget.branding.appPublicId ?? '',
    });
    setState(() => _reset++);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(widget.kind, style: TextStyle(fontSize: 20, color: widget.branding.primaryColor)),
        const SizedBox(height: 12),
        GtgtStepComposer(
          key: ValueKey(_reset),
          steps: const [
            GtgtStep(key: 'title', label: '标题'),
            GtgtStep(key: 'field_a', label: '字段A', optional: true),
            GtgtStep(key: 'field_b', label: '字段B', optional: true),
            GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
          ],
          onComplete: _submit,
        ),
        ..._items.map(
          (it) => ListTile(
            title: Text('${it['record_no']} · ${it['title']}'),
            subtitle: Text('${it['status']}'),
          ),
        ),
        if (_items.isEmpty) const Text('暂无记录'),
      ],
    );
  }
}
