import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _columns = [
  ('open', '新线索', null),
  ('following', '跟进中', 'following'),
  ('won', '成交', 'won'),
  ('lost', '丢单', 'lost'),
];

class SalesLeadPage extends StatefulWidget {
  const SalesLeadPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<SalesLeadPage> createState() => _SalesLeadPageState();
}

class _SalesLeadPageState extends State<SalesLeadPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  final _customerCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/sales-lead';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _customerCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
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
    final customer = _customerCtrl.text.trim();
    if (customer.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': 'lead',
        'customer': customer,
        'amount': _amountCtrl.text.trim(),
        'owner': '',
        'note': '',
        'app_public_id': _appId,
      });
      _customerCtrl.clear();
      _amountCtrl.clear();
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _move(String id, String action) async {
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
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _customerCtrl,
                    decoration: const InputDecoration(labelText: '客户名称', isDense: true),
                    onSubmitted: (_) => _submit(),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _amountCtrl,
                    decoration: const InputDecoration(labelText: '金额', isDense: true),
                    onSubmitted: (_) => _submit(),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: color),
                  onPressed: _busy ? null : _submit,
                  child: const Text('录入'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          SizedBox(
            height: 420,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _columns.map((col) {
                final (key, label, action) = col;
                final colItems = _items
                    .map((e) => Map<String, dynamic>.from(e as Map))
                    .where((t) => '${t['status']}' == key)
                    .toList();
                return SizedBox(
                  width: 200,
                  child: Card(
                    margin: const EdgeInsets.only(right: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          color: key == 'open' ? color : Colors.black12,
                          child: Text(
                            '$label · ${colItems.length}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: key == 'open' ? Colors.white : null,
                            ),
                          ),
                        ),
                        Expanded(
                          child: ListView(
                            padding: const EdgeInsets.all(8),
                            children: [
                              ...colItems.map((t) {
                                final id = '${t['id']}';
                                return Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(8),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${t['customer']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                        Text(
                                          '${'${t['amount']}'.isEmpty ? '金额待定' : '¥${t['amount']}'}'
                                          '${'${t['owner'] ?? ''}'.isEmpty ? '' : ' · ${t['owner']}'}',
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                        Wrap(
                                          children: _columns
                                              .where((c) => c.$3 != null && c.$1 != key)
                                              .map(
                                                (c) => TextButton(
                                                  onPressed: () => _move(id, c.$3!),
                                                  child: Text('→${c.$2}', style: const TextStyle(fontSize: 11)),
                                                ),
                                              )
                                              .toList(),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }),
                              if (colItems.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Text('空', style: TextStyle(color: Colors.grey)),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }
}
