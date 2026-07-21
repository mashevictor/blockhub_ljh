import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

/// 课本学习 · 今晚这一练（对标 ThinkAI：模板 → 过一眼 → 开练）
class StudyCoachPage extends StatefulWidget {
  const StudyCoachPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<StudyCoachPage> createState() => _StudyCoachPageState();
}

class _StudyCoachPageState extends State<StudyCoachPage> {
  List<dynamic> _courses = [];
  List<dynamic> _drills = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  int _genResetKey = 0;
  String _activeId = '';
  String _phase = 'ask'; // ask | confirm
  String _flow = 'book'; // book | tonight | preview | practice | done
  String _lastQuery = '';
  List<Map<String, dynamic>> _candidates = [];
  bool _showAsk = true;
  String _template = '';
  Map<String, dynamic>? _tonight;
  List<Map<String, dynamic>> _items = [];
  final Map<String, String> _values = {};
  final Map<String, String> _gen = {'level': '中'};

  static const _templates = [
    ('dictation', '本课听写单'),
    ('word_cards', '本课单词卡'),
    ('math_drill', '本课口算/巩固'),
    ('wrongbook', '错题巩固'),
    ('read_aloud', '本课朗读清单'),
  ];

  String get _base => '${widget.branding.apiBaseUrl}/study-coach';
  String get _appId => widget.branding.appPublicId.trim();

  Map<String, dynamic>? get _active {
    for (final raw in _courses) {
      final m = Map<String, dynamic>.from(raw as Map);
      if ('${m['id']}' == _activeId) return m;
    }
    if (_courses.isEmpty) return null;
    return Map<String, dynamic>.from(_courses.first as Map);
  }

  Map<String, dynamic>? get _currentUnit {
    final active = _active;
    if (active == null) return null;
    final plan = (active['plan'] as List?) ?? [];
    for (final raw in plan) {
      final u = Map<String, dynamic>.from(raw as Map);
      if ('${u['status']}' != 'mastered') return u;
    }
    if (plan.isEmpty) return null;
    return Map<String, dynamic>.from(plan.last as Map);
  }

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
      final cResp = await dio.get<Map<String, dynamic>>('$_base/courses$q');
      final dResp = await dio.get<Map<String, dynamic>>('$_base/drills$q');
      _courses = cResp.data?['items'] as List<dynamic>? ?? [];
      _drills = dResp.data?['items'] as List<dynamic>? ?? [];
      if (_activeId.isEmpty || !_courses.any((e) => '${(e as Map)['id']}' == _activeId)) {
        _activeId = _courses.isEmpty ? '' : '${(_courses.first as Map)['id']}';
      }
      if (_courses.isNotEmpty) {
        _showAsk = false;
        if (_flow == 'book') _flow = 'tonight';
      }
    } catch (_) {
      _courses = [];
      _drills = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _locate() async {
    final q = (_values['query'] ?? '').trim();
    if (q.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>('$_base/locate', data: {
        'query': q,
        'role': 'student',
      });
      final list = (resp.data?['candidates'] as List?)
              ?.whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList() ??
          [];
      setState(() {
        _lastQuery = '${resp.data?['query'] ?? q}';
        _candidates = list;
        _phase = list.isEmpty ? 'ask' : 'confirm';
        _flow = 'book';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm(Map<String, dynamic> catalog) async {
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>('$_base/courses', data: {
        'textbook_name': '${catalog['full_title'] ?? _lastQuery}',
        'query': _lastQuery,
        'subject': '${catalog['subject'] ?? ''}',
        'grade': '${catalog['grade'] ?? ''}',
        'role': 'student',
        'catalog': catalog,
        'app_public_id': _appId,
      });
      final course = resp.data?['course'];
      await _load();
      setState(() {
        _phase = 'ask';
        _candidates = [];
        _values.clear();
        _resetKey++;
        _showAsk = false;
        _flow = 'tonight';
        if (course is Map && '${course['id']}'.isNotEmpty) {
          _activeId = '${course['id']}';
        }
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _generate() async {
    final active = _active;
    final unit = _currentUnit;
    if (active == null || unit == null || _template.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>('$_base/tonight/generate', data: {
        'course_id': '${active['id']}',
        'unit_order': int.tryParse('${unit['order']}') ?? 1,
        'template': _template,
        'child_name': (_gen['child_name'] ?? '').trim(),
        'level': (_gen['level'] ?? '中').trim(),
        'note': (_gen['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      final t = resp.data?['tonight'];
      if (t is Map) {
        final payload = t['payload'] is Map ? Map<String, dynamic>.from(t['payload'] as Map) : <String, dynamic>{};
        final items = (payload['items'] as List?)
                ?.whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList() ??
            [];
        setState(() {
          _tonight = Map<String, dynamic>.from(t);
          _items = items;
          _flow = 'preview';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _start() async {
    final id = '${_tonight?['id'] ?? ''}';
    if (id.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>('$_base/tonight/$id/start', data: {});
      final t = resp.data?['tonight'];
      if (t is Map) {
        final payload = t['payload'] is Map ? Map<String, dynamic>.from(t['payload'] as Map) : <String, dynamic>{};
        final items = (payload['items'] as List?)
                ?.whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList() ??
            _items;
        setState(() {
          _tonight = Map<String, dynamic>.from(t);
          _items = items;
          _flow = 'practice';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _complete() async {
    final id = '${_tonight?['id'] ?? ''}';
    if (id.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/tonight/$id/complete', data: {
        'items': _items,
        'complete_first_step': true,
      });
      await _load();
      setState(() => _flow = 'done');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _toggle(String itemId, {bool? done, bool? correct}) {
    setState(() {
      _items = _items.map((it) {
        if ('${it['id']}' != itemId) return it;
        final m = Map<String, dynamic>.from(it);
        if (done != null) m['done'] = done;
        if (correct != null) {
          m['correct'] = correct;
          m['done'] = true;
        }
        return m;
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final active = _active;
    final unit = _currentUnit;
    final courseDrills = _drills.where((e) => '${(e as Map)['course_id']}' == '${active?['id']}').toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('今晚学习链路', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final e in [('book', '1.课本'), ('tonight', '2.今晚练什么'), ('preview', '3.过一眼'), ('practice', '4.开练')])
              ActionChip(
                label: Text(e.$2),
                backgroundColor: _flow == e.$1 || (_flow == 'done' && e.$1 == 'practice')
                    ? color.withValues(alpha: 0.2)
                    : null,
                onPressed: () => setState(() {
                  if (e.$1 == 'book' || active != null) _flow = e.$1;
                }),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (_loading) const LinearProgressIndicator(),
        if (_flow == 'book' || active == null) ...[
          if (_phase == 'ask' && (_showAsk || _courses.isEmpty))
            GtgtStepComposer(
              title: '课本学习',
              flowHint: '说课本 → 确认 → 今晚练什么',
              accent: color,
              steps: const [
                GtgtStep(key: 'query', label: '学哪一科、哪一本？', placeholder: '部编语文三上'),
              ],
              values: _values,
              resetKey: _resetKey,
              busy: _busy,
              submitLabel: '帮我定位这本课本',
              onChanged: (k, v) => setState(() => _values[k] = v),
              onComplete: _locate,
            ),
          if (_phase == 'confirm') ...[
            Text('确认册次「$_lastQuery」'),
            const SizedBox(height: 8),
            for (final c in _candidates)
              Card(
                child: ListTile(
                  title: Text('${c['full_title'] ?? ''}'),
                  subtitle: Text('${c['subject'] ?? ''} · ${c['grade'] ?? ''}'),
                  onTap: _busy ? null : () => _confirm(c),
                ),
              ),
          ],
          if (_courses.isNotEmpty)
            Wrap(
              spacing: 8,
              children: [
                for (final raw in _courses)
                  ActionChip(
                    label: Text('${(raw as Map)['subject'] ?? '课本'} · ${(raw)['progress_pct'] ?? 0}%'),
                    onPressed: () => setState(() {
                      _activeId = '${raw['id']}';
                      _flow = 'tonight';
                      _tonight = null;
                    }),
                  ),
              ],
            ),
        ],
        if (active != null && _flow != 'book') ...[
          Card(
            child: ListTile(
              title: Text('${active['textbook_name']}'),
              subtitle: Text(unit == null ? '' : '当前课：${unit['unit_name']}'),
            ),
          ),
        ],
        if (active != null && _flow == 'tonight') ...[
          Text('选模板', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final t in _templates)
                ChoiceChip(
                  label: Text(t.$2),
                  selected: _template == t.$1,
                  onSelected: (_) => setState(() => _template = t.$1),
                ),
            ],
          ),
          if (_template.isNotEmpty) ...[
            const SizedBox(height: 12),
            GtgtStepComposer(
              title: '生成今晚练习',
              flowHint: '可空可跳过',
              accent: color,
              steps: const [
                GtgtStep(key: 'child_name', label: '孩子称呼（可空）', optional: true),
                GtgtStep(key: 'level', label: '难度（易/中/难）', placeholder: '中'),
                GtgtStep(key: 'note', label: '备注（可空）', optional: true),
              ],
              values: _gen,
              resetKey: _genResetKey,
              busy: _busy,
              submitLabel: '生成今晚练习',
              onChanged: (k, v) => setState(() => _gen[k] = v),
              onComplete: _generate,
            ),
          ],
        ],
        if (_tonight != null && _flow == 'preview') ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${(_tonight!['payload'] as Map?)?['title'] ?? _tonight!['template_label']}',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text('${(_tonight!['payload'] as Map?)?['instructions'] ?? ''}'),
                  const SizedBox(height: 8),
                  Text('${(_tonight!['payload'] as Map?)?['disclaimer'] ?? '请家长过一眼'}',
                      style: TextStyle(color: Colors.orange.shade800, fontSize: 12)),
                  const SizedBox(height: 8),
                  for (final it in _items) Text('• ${it['prompt']}'),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: [
                      FilledButton(onPressed: _busy ? null : _start, child: const Text('交给孩子开练')),
                      OutlinedButton(
                        onPressed: () => setState(() {
                          _flow = 'tonight';
                          _genResetKey++;
                        }),
                        child: const Text('重做一份'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
        if (_flow == 'practice') ...[
          for (final it in _items)
            Card(
              color: it['done'] == true ? Colors.green.shade50 : null,
              child: ListTile(
                title: Text('${it['prompt']}'),
                subtitle: Text('${it['answer'] ?? ''}'),
                trailing: Wrap(
                  children: [
                    TextButton(onPressed: () => _toggle('${it['id']}', done: !(it['done'] == true)), child: Text(it['done'] == true ? '撤销' : '做完')),
                    TextButton(onPressed: () => _toggle('${it['id']}', correct: true), child: const Text('对')),
                    TextButton(onPressed: () => _toggle('${it['id']}', correct: false), child: const Text('错')),
                  ],
                ),
              ),
            ),
          FilledButton(onPressed: _busy ? null : _complete, child: const Text('结束并记入真库')),
        ],
        if (_flow == 'done') ...[
          Card(
            child: ListTile(
              title: const Text('今晚练完了'),
              subtitle: const Text('下次可用错题巩固'),
              trailing: FilledButton(
                onPressed: () => setState(() {
                  _template = 'wrongbook';
                  _tonight = null;
                  _flow = 'tonight';
                }),
                child: const Text('错题巩固'),
              ),
            ),
          ),
        ],
        if (courseDrills.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('最近记录', style: Theme.of(context).textTheme.titleSmall),
          for (final raw in courseDrills.take(8))
            ListTile(
              dense: true,
              title: Text('${(raw as Map)['unit_name']}'),
              subtitle: Text('${raw['kind']} · ${raw['score'] ?? raw['result'] ?? ''}'),
            ),
        ],
      ],
    );
  }
}
