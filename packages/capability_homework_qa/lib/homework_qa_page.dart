import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class HomeworkQaPage extends StatefulWidget {
  const HomeworkQaPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<HomeworkQaPage> createState() => _HomeworkQaPageState();
}

class _HomeworkQaPageState extends State<HomeworkQaPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  String? _msg;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/homework-qa';
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
    if ((_values['title'] ?? '').trim().isEmpty) return;
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'title': (_values['title'] ?? '').trim(),
        'content': (_values['content'] ?? '').trim(),
        'student_name': widget.branding.appName,
        'subject': (_values['subject'] ?? '').trim(),
        'category': 'homework',
        'app_public_id': _appId,
      });
      _values.clear();
      _resetKey++;
      setState(() => _msg = '已提问，等待批改');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _review(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/review');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final open = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' == 'open')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '作业答疑',
          flowHint: '提出问题 → 待批改',
          accent: color,
          steps: const [
            GtgtStep(key: 'title', label: '作业 / 问题', placeholder: '例如：数学练习册 P12 第3题'),
            GtgtStep(key: 'content', label: '补充说明（可空）', optional: true, placeholder: '哪里不懂…', multiline: true),
            GtgtStep(key: 'subject', label: '科目（可空）', optional: true, placeholder: '数学'),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交问题',
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('待批改${open.isEmpty ? '' : ' · ${open.length}'}', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (open.isEmpty)
          Text('暂无待批改', style: TextStyle(color: Colors.grey.shade600))
        else
          ...open.map((t) {
            final id = '${t['id']}';
            final meta = [t['student_name'], t['subject']].where((e) => '$e'.isNotEmpty).join(' · ');
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${t['title']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    if ('${t['content'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['content']}', style: const TextStyle(fontSize: 13)),
                      ),
                    if (meta.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(meta, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                      ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: color),
                      onPressed: () => _review(id),
                      child: const Text('标记已批改'),
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
