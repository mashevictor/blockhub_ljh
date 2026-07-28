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
  bool _showDone = false;
  int _resetKey = 0;
  final Map<String, String> _values = {'category': 'travel'};

  String get _base => '${widget.branding.apiBaseUrl}/expense-claim';
  String get _appId => widget.branding.appPublicId.trim();

  String _cat(String raw) => bhTf('cap.expense_claim.cat.$raw', raw);
  String _status(String raw) => bhTf('cap.expense_claim.status.$raw', raw);

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
    BhL10n.instance.addListener(_onL10n);
    _load();
  }

  @override
  void dispose() {
    BhL10n.instance.removeListener(_onL10n);
    super.dispose();
  }

  void _onL10n() {
    if (mounted) setState(() {});
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
          title: bhTf('cap.expense_claim.title.default', '我要报销'),
          flowHint: bhTf('cap.expense_claim.flow.hint', '类型 → 内容金额 → 交财务审'),
          accent: color,
          steps: [
            GtgtStep(
              key: 'category',
              label: bhTf('cap.expense_claim.field.category', '费用类型'),
              choices: [
                (value: 'travel', label: bhTf('cap.expense_claim.cat.travel', '差旅')),
                (value: 'meal', label: bhTf('cap.expense_claim.cat.meal', '餐饮')),
                (value: 'office', label: bhTf('cap.expense_claim.cat.office', '办公')),
              ],
            ),
            GtgtStep(
              key: 'title',
              label: bhTf('cap.expense_claim.field.title', '报销内容'),
              placeholder: '如：上海出差高铁',
            ),
            GtgtStep(
              key: 'amount',
              label: bhTf('cap.expense_claim.field.amount', '金额（元）'),
              placeholder: '328.00',
            ),
            GtgtStep(
              key: 'invoice_no',
              label: bhTf('cap.expense_claim.field.invoice_no', '发票号（可空）'),
              optional: true,
            ),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: bhTf('cap.expense_claim.submit.default', '提交报销'),
        ),
        const SizedBox(height: 16),
        Text(
          _pending.isEmpty ? '待审核' : '待审核 · ${_pending.length}',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_pending.isEmpty)
          const Text('暂无待审报销')
        else
          ..._pending.map((t) {
            final id = '${t['id']}';
            return Card(
              child: ListTile(
                title: Text('${t['title']} · ${_cat('${t['category']}')}'),
                subtitle: Text('${t['amount']} · ${_status('${t['status']}')}'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton(onPressed: () => _advance(id, 'paid'), child: const Text('付款')),
                    TextButton(onPressed: () => _advance(id, 'rejected'), child: const Text('驳回')),
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
            ..._done.map((t) {
              return Card(
                child: ListTile(
                  title: Text('${t['title']}'),
                  subtitle: Text('${_status('${t['status']}')} · ${t['amount']}'),
                ),
              );
            }),
        ],
      ],
    );
  }
}
