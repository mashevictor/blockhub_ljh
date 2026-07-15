import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _cats = [
  ('viewing', '约看'),
  ('intent', '意向'),
  ('sign', '签约'),
];

const _statusLabel = {
  'open': '待看房',
  'following': '跟进中',
  'done': '已完成',
};

class HouseViewingPage extends StatefulWidget {
  const HouseViewingPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<HouseViewingPage> createState() => _HouseViewingPageState();
}

class _HouseViewingPageState extends State<HouseViewingPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  String? _msg;
  String _category = 'viewing';
  final _clientCtrl = TextEditingController();
  final _addrCtrl = TextEditingController();
  final _whenCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/house-viewing';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _clientCtrl.dispose();
    _addrCtrl.dispose();
    _whenCtrl.dispose();
    super.dispose();
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
    final client = _clientCtrl.text.trim();
    final addr = _addrCtrl.text.trim();
    if (client.isEmpty || addr.isEmpty) {
      setState(() => _msg = '请填写客户与房源地址');
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': _category,
        'client_name': client,
        'property_addr': addr,
        'schedule_at': _whenCtrl.text.trim(),
        'note': '',
        'app_public_id': _appId,
      });
      _clientCtrl.clear();
      _addrCtrl.clear();
      _whenCtrl.clear();
      setState(() => _msg = '已预约');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
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
    final active = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' != 'done')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('预约看房', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: _cats.map((c) {
            final selected = _category == c.$1;
            return ChoiceChip(
              label: Text(c.$2),
              selected: selected,
              selectedColor: color.withOpacity(0.2),
              onSelected: (_) => setState(() => _category = c.$1),
            );
          }).toList(),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _clientCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '客户姓名'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _addrCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '房源地址'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _whenCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '预约时间，如 2026-07-20 14:00'),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: color),
          onPressed: _busy ? null : _submit,
          child: const Text('确认预约'),
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('日程', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (active.isEmpty)
          Text('暂无日程', style: TextStyle(color: Colors.grey.shade600))
        else
          ...active.map((t) {
            final id = '${t['id']}';
            final status = '${t['status']}';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${t['client_name']} · ${t['property_addr']}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        Chip(
                          label: Text(_statusLabel[status] ?? status, style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    if ('${t['schedule_at'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['schedule_at']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        if (status == 'open')
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: color),
                            onPressed: () => _advance(id, 'following'),
                            child: const Text('开始跟进'),
                          ),
                        if (status != 'done')
                          OutlinedButton(
                            onPressed: () => _advance(id, 'done'),
                            child: const Text('完成'),
                          ),
                      ],
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
