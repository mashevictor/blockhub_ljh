import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

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
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'travel'};

  String get _base => '${widget.branding.apiBaseUrl}/expense-claim';
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
    if ((_values['title'] ?? '').trim().isEmpty || (_values['amount'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': (_values['category'] ?? '').trim(),
        'title': (_values['title'] ?? '').trim(),
        'amount': (_values['amount'] ?? '').trim(),
        'invoice_no': (_values['invoice_no'] ?? '').trim(),
        'note': (_values['note'] ?? '').trim(),
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
          title: '报销记账',
          flowHint: '登记 → 状态闭环',
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
            GtgtStep(key: 'title', label: '报销标题', placeholder: '报销标题'),
            GtgtStep(key: 'amount', label: '金额', placeholder: '金额'),
            GtgtStep(key: 'invoice_no', label: '发票号', placeholder: '发票号', optional: true),
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
                title: Text('${t['record_no']} · ${t['title'] ?? t['category']}'),
                subtitle: Text('${t['category']} · ${t['status']}'),
                trailing: Wrap(
                  children: [
                    if (t['status'] != 'reviewing' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'reviewing'), child: const Text('审核中')),
                    if (t['status'] != 'paid' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'paid'), child: const Text('已付款')),
                    if (t['status'] != 'rejected' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')
                      TextButton(onPressed: () => _advance(id, 'rejected'), child: const Text('驳回')),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
