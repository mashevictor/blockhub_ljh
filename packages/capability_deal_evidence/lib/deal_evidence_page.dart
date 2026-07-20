import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class DealEvidencePage extends StatefulWidget {
  const DealEvidencePage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<DealEvidencePage> createState() => _DealEvidencePageState();
}

class _DealEvidencePageState extends State<DealEvidencePage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  String? _msg;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/deal-evidence';
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
      final et = _values['evidence_type'] ?? 'meeting_notes';
      await dio.post('$_base/records', data: {
        'customer': customer,
        'evidence_type': et,
        'title': et,
        'summary': (_values['summary'] ?? '').trim(),
        'target_stage': _values['target_stage'] ?? 'following',
        'app_public_id': _appId,
      });
      _values.clear();
      setState(() {
        _resetKey++;
        _msg = '证据已写入真库';
      });
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/verify');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '登记成交证据',
          flowHint: '无证据不晋级',
          accent: color,
          steps: const [
            GtgtStep(key: 'customer', label: '客户名称', placeholder: '与线索客户名一致'),
            GtgtStep(
              key: 'evidence_type',
              label: '证据类型',
              choices: [
                (value: 'meeting_notes', label: '会议纪要'),
                (value: 'buyer_reply', label: '买方回执'),
                (value: 'poc_result', label: 'POC结果'),
                (value: 'signed_intent', label: '签约意向'),
                (value: 'payment_proof', label: '回款证明'),
                (value: 'other', label: '其他'),
              ],
            ),
            GtgtStep(
              key: 'target_stage',
              label: '用于晋级',
              choices: [
                (value: 'following', label: '解锁跟进中'),
                (value: 'won', label: '解锁成交'),
              ],
            ),
            GtgtStep(key: 'summary', label: '证据摘要', placeholder: '会议结论 / 买方原话…', multiline: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '写入证据',
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('证据台账', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_items.isEmpty)
          Text('暂无证据', style: TextStyle(color: Colors.grey.shade600))
        else
          ..._items.map((e) {
            final t = Map<String, dynamic>.from(e as Map);
            final id = '${t['id']}';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${t['customer']} · ${t['evidence_type']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    if ('${t['summary'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['summary']}', style: const TextStyle(fontSize: 13)),
                      ),
                    if ('${t['status']}' == 'open') ...[
                      const SizedBox(height: 8),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: color),
                        onPressed: () => _verify(id),
                        child: const Text('标记已核验'),
                      ),
                    ],
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
