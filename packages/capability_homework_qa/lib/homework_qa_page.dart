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
  final Map<String, String> _values = {'category': 'homework'};

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
    } catch (_) {
      _items = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if ((_values['title'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': _values['category'] ?? 'homework',
        'student_name': (_values['student_name'] ?? '').trim(),
        'subject': (_values['subject'] ?? '').trim(),
        'title': (_values['title'] ?? '').trim(),
        'content': (_values['content'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['category'] = 'homework';
      _resetKey++;
      await _load();
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
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '作业答疑',
          flowHint: '类型 → 学生 → 科目 → 标题',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'category',
              label: '类型',
              choices: [
                (value: 'homework', label: '作业'),
                (value: 'qa', label: '答疑'),
                (value: 'wrongbook', label: '错题'),
              ],
            ),
            GtgtStep(key: 'student_name', label: '学生姓名', optional: true),
            GtgtStep(key: 'subject', label: '科目', placeholder: '语文 / 数学', optional: true),
            GtgtStep(key: 'title', label: '标题', placeholder: '第三单元练习'),
            GtgtStep(key: 'content', label: '内容/题目', optional: true, multiline: true),
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
                title: Text('${t['record_no']} · ${t['title']}'),
                subtitle: Text('${t['student_name']} · ${t['subject']} · ${t['status']}'),
                trailing: t['status'] == 'open'
                    ? TextButton(onPressed: () => _review(id), child: const Text('批改'))
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
