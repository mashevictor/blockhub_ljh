import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class GameSupportPage extends StatefulWidget {
  const GameSupportPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<GameSupportPage> createState() => _GameSupportPageState();
}

class _GameSupportPageState extends State<GameSupportPage> {
  final _title = TextEditingController();
  final _content = TextEditingController();
  final _player = TextEditingController();
  List<dynamic> _items = [];
  String _category = 'ticket';
  bool _loading = true;

  String get _base => '${widget.branding.apiBaseUrl}/game-support';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    _player.dispose();
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
    if (_title.text.trim().isEmpty) return;
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records', data: {
      'category': _category,
      'title': _title.text.trim(),
      'content': _content.text.trim(),
      'player_name': _player.text.trim(),
      'app_public_id': _appId,
    });
    _title.clear();
    _content.clear();
    _player.clear();
    await _load();
  }

  Future<void> _close(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/close');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('玩家 FAQ / 工单', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Row(children: [
          ChoiceChip(label: const Text('FAQ'), selected: _category == 'faq', onSelected: (_) => setState(() => _category = 'faq')),
          const SizedBox(width: 8),
          ChoiceChip(label: const Text('工单'), selected: _category == 'ticket', onSelected: (_) => setState(() => _category = 'ticket')),
        ]),
        const SizedBox(height: 8),
        TextField(controller: _player, decoration: const InputDecoration(labelText: '玩家昵称', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _title, decoration: const InputDecoration(labelText: '标题', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _content, maxLines: 3, decoration: const InputDecoration(labelText: '内容', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        FilledButton(onPressed: _submit, child: const Text('提交')),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            final id = '${t['id']}';
            return Card(
              child: ListTile(
                title: Text('${t['record_no']} · ${t['title']}'),
                subtitle: Text('${t['category']} · ${t['player_name']} · ${t['status']}'),
                trailing: t['status'] == 'open'
                    ? TextButton(onPressed: () => _close(id), child: const Text('关闭'))
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
