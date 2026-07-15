import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class DecoMaterialPage extends StatefulWidget {
  const DecoMaterialPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<DecoMaterialPage> createState() => _DecoMaterialPageState();
}

class _DecoMaterialPageState extends State<DecoMaterialPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'material'};

  String get _base => '${widget.branding.apiBaseUrl}/deco-material';
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
    if ((_values['material_name'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': (_values['category'] ?? '').trim(),
        'material_name': (_values['material_name'] ?? '').trim(),
        'location': (_values['location'] ?? '').trim(),
        'budget': (_values['budget'] ?? '').trim(),
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['category'] = 'material';
      _resetKey++;
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
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '装修选材',
          flowHint: '登记 → 状态闭环',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '环节',
              choices: [
                (value: 'material', label: '选材'),
                (value: 'progress', label: '进度'),
                (value: 'budget', label: '预算'),
              ],
            ),
            GtgtStep(key: 'material_name', label: '材料/部位', placeholder: '材料/部位'),
            GtgtStep(key: 'location', label: '施工位置', placeholder: '施工位置', optional: true),
            GtgtStep(key: 'budget', label: '预算', placeholder: '预算', optional: true),
            GtgtStep(key: 'note', label: '备注', placeholder: '备注', optional: true, multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交',
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            final id = '${t['id']}';
            return Card(
              child: ListTile(
                title: Text('${t['record_no']} · ${t['material_name'] ?? t['category']}'),
                subtitle: Text('${t['category']} · ${t['status']}'),
                trailing: Wrap(
                  children: [
                    if (t['status'] != 'accepted' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'accepted'), child: const Text('已验收')),
                    if (t['status'] != 'done' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'done'), child: const Text('完成')),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
