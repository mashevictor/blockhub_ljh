import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class SitePatrolPage extends StatefulWidget {
  const SitePatrolPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<SitePatrolPage> createState() => _SitePatrolPageState();
}

class _SitePatrolPageState extends State<SitePatrolPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'result': 'ok'};

  String get _base => '${widget.branding.apiBaseUrl}/site-patrol';
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
    if ((_values['site_name'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'site_name': (_values['site_name'] ?? '').trim(),
        'checkpoint': (_values['checkpoint'] ?? '').trim(),
        'result': _values['result'] == 'issue' ? 'issue' : 'ok',
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['result'] = 'ok';
      _resetKey++;
      await _load();
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
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '巡检打卡',
          flowHint: '站点 → 打卡点 → 结论 → 备注',
          accent: color,
          steps: const [
            GtgtStep(key: 'site_name', label: '站点', placeholder: '配电房…'),
            GtgtStep(key: 'checkpoint', label: '打卡点', optional: true),
            GtgtStep(
              key: 'result',
              label: '巡检结果',
              choices: [
                (value: 'ok', label: '合格'),
                (value: 'issue', label: '隐患'),
              ],
            ),
            GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交巡检',
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
                title: Text('${t['record_no']} · ${t['site_name']}'),
                subtitle: Text('${t['result']} · ${t['status']}'),
                trailing: t['status'] == 'open'
                    ? TextButton(onPressed: () => _close(id), child: const Text('结案'))
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
