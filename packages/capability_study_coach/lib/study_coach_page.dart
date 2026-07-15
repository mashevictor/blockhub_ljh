import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

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
  int _drillResetKey = 0;
  String _activeId = '';
  String _phase = 'ask'; // ask | confirm
  String _lastQuery = '';
  List<Map<String, dynamic>> _candidates = [];
  bool _showAsk = true;
  final Map<String, String> _values = {};
  final Map<String, String> _drillValues = {'kind': 'dictation'};

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
      if (_courses.isNotEmpty) _showAsk = false;
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
      final raw = resp.data?['candidates'] as List<dynamic>? ?? [];
      _candidates = raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      _lastQuery = '${resp.data?['query'] ?? q}';
      _phase = 'confirm';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm(Map<String, dynamic> catalog) async {
    final title = '${catalog['full_title'] ?? ''}'.trim();
    if (title.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>('$_base/courses', data: {
        'query': _lastQuery,
        'textbook_name': title,
        'catalog': catalog,
        'role': 'student',
        'student_name': '',
        'app_public_id': _appId,
      });
      final course = resp.data?['course'] as Map<String, dynamic>?;
      _values.clear();
      _candidates = [];
      _phase = 'ask';
      _showAsk = false;
      _resetKey++;
      if (course != null) _activeId = '${course['id']}';
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _resetAsk() {
    setState(() {
      _phase = 'ask';
      _candidates = [];
      _values.clear();
      _showAsk = true;
      _resetKey++;
    });
  }

  Future<void> _progress(String courseId, int order, String status) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/courses/$courseId/progress', data: {'order': order, 'status': status});
    await _load();
  }

  Future<void> _submitDrill() async {
    final active = _active;
    if (active == null) return;
    final plan = (active['plan'] as List?) ?? [];
    final firstUnit = plan.isEmpty ? '' : '${(plan.first as Map)['unit_name']}';
    final unit = (_drillValues['unit_name'] ?? firstUnit).trim();
    if (unit.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/drills', data: {
        'course_id': '${active['id']}',
        'unit_name': unit,
        'kind': _drillValues['kind'] ?? 'dictation',
        'score': '',
        'result': '',
        'notes': (_drillValues['notes'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _drillValues
        ..clear()
        ..['kind'] = 'dictation'
        ..['unit_name'] = unit;
      _drillResetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _catalogLine(Map<String, dynamic> c) {
    return [
      if ('${c['publisher'] ?? c['series'] ?? ''}'.isNotEmpty) '${c['publisher'] ?? c['series']}',
      if ('${c['school_system'] ?? ''}'.isNotEmpty) '${c['school_system']}',
      if ('${c['stage'] ?? ''}'.isNotEmpty) '${c['stage']}',
      if ('${c['grade'] ?? ''}'.isNotEmpty) '${c['grade']}',
      if ('${c['semester'] ?? ''}'.isNotEmpty) '${c['semester']}',
      if ('${c['subject'] ?? ''}'.isNotEmpty) '${c['subject']}',
    ].join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final active = _active;
    final plan = (active?['plan'] as List?) ?? [];
    final unitNames = plan.map((e) => '${(e as Map)['unit_name']}').where((e) => e.isNotEmpty).toList();
    final courseDrills = _drills
        .where((e) => '${(e as Map)['course_id']}' == '${active?['id']}')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_phase == 'ask' && (_showAsk || _courses.isEmpty))
          GtgtStepComposer(
            title: '课本学习',
            flowHint: '一句话书名 → 确认册次 → 生成规划',
            accent: color,
            steps: const [
              GtgtStep(
                key: 'query',
                label: '你在学哪本课本？',
                placeholder: '例如：沪教英语二年级下',
              ),
            ],
            values: _values,
            onChanged: (k, v) => setState(() => _values[k] = v),
            onComplete: _locate,
            busy: _busy,
            resetKey: _resetKey,
            submitLabel: '帮我定位这本课本',
          ),
        if (_phase == 'ask' && !_showAsk && _courses.isNotEmpty)
          TextButton(onPressed: () => setState(() => _showAsk = true), child: const Text('+ 再加一本课本')),
        if (_phase == 'confirm') ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('是这几本吗？', style: Theme.of(context).textTheme.titleMedium),
                  Text('根据「$_lastQuery」定位 · 点选后生成大纲', style: TextStyle(color: Colors.grey.shade700)),
                  const SizedBox(height: 8),
                  ..._candidates.asMap().entries.map((e) {
                    final c = e.value;
                    final selected = e.key == 0;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: selected ? color : null,
                          foregroundColor: selected ? Colors.white : null,
                          alignment: Alignment.centerLeft,
                          padding: const EdgeInsets.all(12),
                        ),
                        onPressed: _busy ? null : () => _confirm(c),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${c['full_title']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text(_catalogLine(c), style: const TextStyle(fontSize: 12)),
                            if ('${c['note'] ?? ''}'.isNotEmpty)
                              Text('${c['note']}', style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                    );
                  }),
                  TextButton(onPressed: _busy ? null : _resetAsk, child: const Text('不对，换个说法')),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _courses.map((raw) {
              final c = Map<String, dynamic>.from(raw as Map);
              final id = '${c['id']}';
              final selected = id == _activeId;
              return ChoiceChip(
                label: Text('${c['textbook_name']} · ${c['progress_pct']}%'),
                selected: selected,
                onSelected: (_) => setState(() => _activeId = id),
              );
            }).toList(),
          ),
          if (active != null) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${active['textbook_name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('进度 ${active['progress_pct']}% · ${active['plan_source']}'),
                    if (active['catalog'] is Map) ...[
                      const SizedBox(height: 4),
                      Text(
                        _catalogLine(Map<String, dynamic>.from(active['catalog'] as Map)),
                        style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                      ),
                    ],
                    const SizedBox(height: 8),
                    ...plan.map((raw) {
                      final u = Map<String, dynamic>.from(raw as Map);
                      final order = int.tryParse('${u['order']}') ?? 0;
                      final code = '${u['unit_code'] ?? ''}';
                      final focus = '${u['focus'] ?? ''}';
                      final hint = '${u['dictation_hint'] ?? ''}';
                      return ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text('${code.isNotEmpty ? '$code · ' : ''}${u['order']}. ${u['unit_name']}'),
                        subtitle: Text(
                          [
                            '${u['status']}',
                            if (focus.isNotEmpty) '重点:$focus',
                            if (hint.isNotEmpty) '家默:$hint',
                          ].join(' · '),
                        ),
                        trailing: Wrap(
                          spacing: 4,
                          children: [
                            TextButton(
                              onPressed: () => _progress('${active['id']}', order, 'learning'),
                              child: const Text('开始'),
                            ),
                            TextButton(
                              onPressed: () => _progress('${active['id']}', order, 'mastered'),
                              child: const Text('掌握'),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            GtgtStepComposer(
              title: '复习 / 家默 / 考试',
              flowHint: '类型 → 单元 → 可选备注',
              accent: color,
              steps: [
                const GtgtStep(
                  key: 'kind',
                  label: '记一次跟进',
                  choices: [
                    (value: 'dictation', label: '家默'),
                    (value: 'review', label: '复习'),
                    (value: 'exam', label: '考试'),
                  ],
                ),
                GtgtStep(
                  key: 'unit_name',
                  label: '对应单元',
                  placeholder: unitNames.isEmpty ? '第一单元' : unitNames.first,
                  choices: unitNames.isEmpty
                      ? null
                      : unitNames
                          .map((n) => (value: n, label: n.length > 18 ? '${n.substring(0, 18)}…' : n))
                          .toList(),
                ),
                const GtgtStep(key: 'notes', label: '结果备注（可空）', optional: true, multiline: true),
              ],
              values: {
                'kind': _drillValues['kind'] ?? 'dictation',
                'unit_name': _drillValues['unit_name'] ?? (unitNames.isEmpty ? '' : unitNames.first),
                'notes': _drillValues['notes'] ?? '',
              },
              onChanged: (k, v) => setState(() => _drillValues[k] = v),
              onComplete: _submitDrill,
              busy: _busy,
              resetKey: _drillResetKey,
              submitLabel: '记下这次跟进',
            ),
            const SizedBox(height: 12),
            ...courseDrills.map((raw) {
              final d = Map<String, dynamic>.from(raw as Map);
              return Card(
                child: ListTile(
                  title: Text('${d['kind']} · ${d['unit_name']}'),
                  subtitle: Text('${d['notes'] ?? d['result'] ?? d['score'] ?? '已记录'}'),
                ),
              );
            }),
          ],
        ],
      ],
    );
  }
}
