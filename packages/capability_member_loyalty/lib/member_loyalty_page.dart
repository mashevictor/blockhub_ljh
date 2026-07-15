import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class MemberLoyaltyPage extends StatefulWidget {
  const MemberLoyaltyPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<MemberLoyaltyPage> createState() => _MemberLoyaltyPageState();
}

class _MemberLoyaltyPageState extends State<MemberLoyaltyPage> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _campaign = TextEditingController();
  final _points = TextEditingController(text: '100');
  final _note = TextEditingController();
  List<dynamic> _items = [];
  bool _loading = true;

  String get _base => '${widget.branding.apiBaseUrl}/member-loyalty';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _campaign.dispose();
    _points.dispose();
    _note.dispose();
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
    final name = _name.text.trim();
    if (name.isEmpty) return;
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records', data: {
      'member_name': name,
      'member_phone': _phone.text.trim(),
      'campaign_name': _campaign.text.trim(),
      'points': int.tryParse(_points.text.trim()) ?? 0,
      'note': _note.text.trim(),
      'app_public_id': _appId,
    });
    _name.clear();
    _phone.clear();
    _campaign.clear();
    _points.text = '100';
    _note.clear();
    await _load();
  }

  Future<void> _send(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/send');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('会员营销', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        TextField(controller: _name, decoration: const InputDecoration(labelText: '会员姓名', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _phone, decoration: const InputDecoration(labelText: '手机号', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _campaign, decoration: const InputDecoration(labelText: '活动/券码', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _points, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '积分', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _note, decoration: const InputDecoration(labelText: '备注', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        FilledButton(onPressed: _submit, child: const Text('提交登记')),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            final id = '${t['id']}';
            return Card(
              child: ListTile(
                title: Text('${t['record_no']} · ${t['member_name']}'),
                subtitle: Text('${t['campaign_name']} · ${t['points']}分 · ${t['status']}'),
                trailing: t['status'] == 'pending'
                    ? TextButton(onPressed: () => _send(id), child: const Text('确认触达'))
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
