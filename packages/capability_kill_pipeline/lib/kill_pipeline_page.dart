import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class KillPipelinePage extends StatefulWidget {
  const KillPipelinePage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<KillPipelinePage> createState() => _KillPipelinePageState();
}

class _KillPipelinePageState extends State<KillPipelinePage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  String? _msg;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/kill-pipeline';
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
    } catch (e) {
      _items = [];
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final customer = (_values['customer'] ?? '').trim();
    if (customer.isEmpty) return;
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'customer': customer,
        'kill_reason': _values['kill_reason'] ?? 'other',
        'learning': (_values['learning'] ?? '').trim(),
        'amount_lost': (_values['amount_lost'] ?? '').trim(),
        'competitor': (_values['competitor'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values.clear();
      setState(() {
        _resetKey++;
        _msg = '已杀单并回写线索为丢单';
      });
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
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
          title: '杀单工作台',
          flowHint: '结构化丢单 · 清理假管线',
          accent: color,
          steps: const [
            GtgtStep(key: 'customer', label: '客户名称', placeholder: '要清理的商机客户'),
            GtgtStep(
              key: 'kill_reason',
              label: '杀单原因',
              choices: [
                (value: 'no_budget', label: '无预算'),
                (value: 'no_authority', label: '无决策权'),
                (value: 'competitor', label: '竞品'),
                (value: 'timing', label: '时机不对'),
                (value: 'product_fit', label: '产品不适配'),
                (value: 'fake_pipeline', label: '假管线'),
                (value: 'other', label: '其他'),
              ],
            ),
            GtgtStep(key: 'learning', label: '可复用教训', placeholder: '下次如何早发现？', multiline: true),
            GtgtStep(key: 'amount_lost', label: '损失金额（可空）', optional: true, placeholder: '预估管线金额'),
            GtgtStep(key: 'competitor', label: '竞对（可空）', optional: true, placeholder: '若因竞品丢失'),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '确认杀单',
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('杀单台账', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_items.isEmpty)
          Text('暂无杀单', style: TextStyle(color: Colors.grey.shade600))
        else
          ..._items.map((e) {
            final t = Map<String, dynamic>.from(e as Map);
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${t['customer']} · ${t['kill_reason']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    if ('${t['learning'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['learning']}', style: const TextStyle(fontSize: 13)),
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
