import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _catLabel = {'travel': '差旅', 'meal': '餐饮', 'office': '办公'};
const _statusLabel = {
  'open': '待审核',
  'reviewing': '审核中',
  'paid': '已付款',
  'rejected': '已驳回',
};

class ExpenseClaimPage extends StatefulWidget {
  const ExpenseClaimPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<ExpenseClaimPage> createState() => _ExpenseClaimPageState();
}

class _ExpenseClaimPageState extends State<ExpenseClaimPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  bool _showDone = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'travel'};

  String get _base => '${widget.branding.apiBaseUrl}/expense-claim';
  String get _appId => widget.branding.appPublicId.trim();

  List<Map<String, dynamic>> get _pending => _items
      .map((e) => Map<String, dynamic>.from(e as Map))
      .where((t) => {'open', 'reviewing'}.contains('${t['status']}'))
      .toList();

  List<Map<String, dynamic>> get _done => _items
      .map((e) => Map<String, dynamic>.from(e as Map))
      .where((t) => {'paid', 'rejected'}.contains('${t['status']}'))
      .toList();

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
    if ((_values['title'] ?? '').trim().isEmpty || (_values['amount'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': _values['category'] ?? 'travel',
        'title': (_values['title'] ?? '').trim(),
        'amount': (_values['amount'] ?? '').trim(),
        'invoice_no': (_values['invoice_no'] ?? '').trim(),
        'note': '',
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['category'] = 'travel';
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
          title: '我要报销',
          flowHint: '类型 → 内容金额 → 交财务审',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '费用类型',
              choices: [
                (value: 'travel', label: '差旅'),
                (value: 'meal', label: '餐饮'),
                (value: 'office', label: '办公'),
              ],
            ),
            GtgtStep(key: 'title', label: '报销内容', placeholder: '如：上海出差高铁'),
            GtgtStep(key: 'amount', label: '金额（元）', placeholder: '328.00'),
            GtgtStep(key: 'invoice_no', label: '发票号（可空）', optional: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交报销',
        ),
        const SizedBox(height: 16),
        Text('待我审${_pending.isEmpty ? '' : ' · ${_pending.length}'}',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_pending.isEmpty)
          const Text('暂无待审报销')
        else
          ..._pending.map((t) {
            final id = '${t['id']}';
            final status = '${t['status']}';
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${t['title']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text(
                      '¥${t['amount']} · ${_catLabel['${t['category']}'] ?? t['category']} · ${_statusLabel[status] ?? status}',
                    ),
                    if ('${t['invoice_no'] ?? ''}'.isNotEmpty) Text('发票 ${t['invoice_no']}'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        if (status == 'open')
                          OutlinedButton(onPressed: () => _advance(id, 'reviewing'), child: const Text('收下审核')),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: color),
                          onPressed: () => _advance(id, 'paid'),
                          child: const Text('付款通过'),
                        ),
                        OutlinedButton(onPressed: () => _advance(id, 'rejected'), child: const Text('驳回')),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
        if (_done.isNotEmpty) ...[
          TextButton(
            onPressed: () => setState(() => _showDone = !_showDone),
            child: Text(_showDone ? '收起已处理' : '已处理 ${_done.length}'),
          ),
          if (_showDone)
            ..._done.map((t) => Card(
                  child: ListTile(
                    title: Text('${t['title']}'),
                    subtitle: Text('¥${t['amount']} · ${_statusLabel['${t['status']}'] ?? t['status']}'),
                  ),
                )),
        ],
      ],
    );
  }
}
