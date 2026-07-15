import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _audience = ['全体家长', '本班家长', '老师'];

class SchoolNoticePage extends StatefulWidget {
  const SchoolNoticePage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<SchoolNoticePage> createState() => _SchoolNoticePageState();
}

class _SchoolNoticePageState extends State<SchoolNoticePage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  String? _msg;
  String _audience = _audience.first;
  final _titleCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/school-notice';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _contentCtrl.dispose();
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

  Future<void> _publish() async {
    if (_titleCtrl.text.trim().isEmpty) {
      setState(() => _msg = '请填写通知标题');
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'title': _titleCtrl.text.trim(),
        'content': _contentCtrl.text.trim(),
        'audience': _audience,
        'category': 'notice',
        'app_public_id': _appId,
      });
      _titleCtrl.clear();
      _contentCtrl.clear();
      setState(() => _msg = '已发布');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _ack(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/ack');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final published = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' == 'published')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('发布家校通知', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(
          controller: _titleCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '通知标题'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _contentCtrl,
          maxLines: 3,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '通知内容'),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: _audience.map((a) {
            final selected = _audience == a;
            return ChoiceChip(
              label: Text(a, style: const TextStyle(fontSize: 12)),
              selected: selected,
              selectedColor: color.withOpacity(0.2),
              onSelected: (_) => setState(() => _audience = a),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: color),
          onPressed: _busy ? null : _publish,
          child: const Text('发布'),
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('待回执${published.isEmpty ? '' : ' · ${published.length}'}', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (published.isEmpty)
          Text('暂无待回执通知', style: TextStyle(color: Colors.grey.shade600))
        else
          ...published.map((t) {
            final id = '${t['id']}';
            final audience = '${t['audience'] ?? ''}';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('${t['title']}', style: const TextStyle(fontWeight: FontWeight.bold))),
                        Chip(
                          label: Text(audience.isEmpty ? '全员' : audience, style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    if ('${t['content'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['content']}', style: const TextStyle(fontSize: 13)),
                      ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: color),
                      onPressed: () => _ack(id),
                      child: const Text('我已知晓'),
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
