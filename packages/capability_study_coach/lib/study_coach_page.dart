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
  String _hubTab = 'today'; // today | modules | calendar | follow
  int? _expandedUnit;
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

  String get _today {
    final n = DateTime.now();
    return '${n.year}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
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
      _hubTab = 'today';
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

  Future<void> _completeStep(int unitOrder, String stepId, {bool done = true}) async {
    final active = _active;
    if (active == null) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/courses/${active['id']}/steps/complete', data: {
        'unit_order': unitOrder,
        'step_id': stepId,
        'done': done,
      });
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _completeSchedule(Map<String, dynamic> item, {bool done = true}) async {
    final active = _active;
    if (active == null) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/courses/${active['id']}/schedule/done', data: {
        'date': '${item['date']}',
        'unit_order': int.tryParse('${item['unit_order']}') ?? 0,
        'step_id': '${item['step_id']}',
        'done': done,
      });
      await _load();
    } catch (_) {
      await _completeStep(
        int.tryParse('${item['unit_order']}') ?? 0,
        '${item['step_id']}',
        done: done,
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _rebuildSchedule() async {
    final active = _active;
    if (active == null) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/courses/${active['id']}/schedule/rebuild', data: {
        'start_offset_days': 0,
      });
      _hubTab = 'calendar';
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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

  List<Map<String, dynamic>> _todayItems(Map<String, dynamic> active) {
    final schedule = (active['schedule'] as List?) ?? [];
    final today = _today;
    final fromCal = schedule
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .where((e) => '${e['date']}' == today)
        .toList();
    if (fromCal.isNotEmpty) return fromCal;
    final plan = (active['plan'] as List?) ?? [];
    for (final raw in plan) {
      final u = Map<String, dynamic>.from(raw as Map);
      if ('${u['status']}' == 'mastered') continue;
      final steps = (u['steps'] as List?) ?? [];
      for (final sRaw in steps) {
        final s = Map<String, dynamic>.from(sRaw as Map);
        if ('${s['status']}' == 'done') continue;
        return [
          {
            'date': today,
            'unit_order': u['order'],
            'unit_name': u['unit_name'],
            'module_name': u['module_name'],
            'step_id': s['id'],
            'title': s['title'],
            'reminder': s['detail'] ?? u['focus'] ?? '',
            'kind': s['kind'] ?? 'review',
            'done': false,
          }
        ];
      }
    }
    return [];
  }

  List<Map<String, dynamic>> _modulesOf(Map<String, dynamic> active) {
    final raw = (active['modules'] as List?) ?? [];
    if (raw.isNotEmpty) {
      return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    final buckets = <int, Map<String, dynamic>>{};
    for (final p in (active['plan'] as List?) ?? []) {
      final u = Map<String, dynamic>.from(p as Map);
      final mo = int.tryParse('${u['module_order'] ?? 1}') ?? 1;
      final b = buckets.putIfAbsent(mo, () => {
            'order': mo,
            'name': '${u['module_name'] ?? '阶段 $mo'}',
            'goal': '',
            'unit_orders': <int>[],
          });
      (b['unit_orders'] as List).add(int.tryParse('${u['order']}') ?? 0);
      if ('${b['goal']}'.isEmpty && '${u['focus'] ?? ''}'.isNotEmpty) {
        b['goal'] = '${u['focus']}';
      }
    }
    final keys = buckets.keys.toList()..sort();
    return [for (final k in keys) buckets[k]!];
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
    final tips = active?['subject_tips'] is Map
        ? Map<String, dynamic>.from(active!['subject_tips'] as Map)
        : <String, dynamic>{};
    final todayItems = active == null ? <Map<String, dynamic>>[] : _todayItems(active);
    final modules = active == null ? <Map<String, dynamic>>[] : _modulesOf(active);
    final schedule = ((active?['schedule'] as List?) ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_phase == 'ask' && (_showAsk || _courses.isEmpty))
          GtgtStepComposer(
            title: '课本学习',
            flowHint: '科目课本 → 确认册次 → 大任务/小步骤/日历 → 每日跟进',
            accent: color,
            steps: const [
              GtgtStep(
                key: 'query',
                label: '学哪一科、哪一本？',
                placeholder: '例如：沪教英语二年级下 / 人教语文三上',
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
                  Text('点选后按科目生成大任务、小步骤与日历', style: TextStyle(color: Colors.grey.shade700)),
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
              final subj = '${c['subject'] ?? (c['catalog'] is Map ? (c['catalog'] as Map)['subject'] : '')}';
              return ChoiceChip(
                label: Text('${subj.isNotEmpty ? subj : c['textbook_name']} · ${c['progress_pct']}%'),
                selected: selected,
                onSelected: (_) => setState(() {
                  _activeId = id;
                  _hubTab = 'today';
                  _expandedUnit = null;
                }),
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
                    if ('${tips['rhythm'] ?? ''}'.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('科目节奏：${tips['rhythm']}', style: const TextStyle(fontSize: 13)),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final t in const [
                          ('today', '今日跟进'),
                          ('modules', '大任务'),
                          ('calendar', '日历'),
                          ('follow', '记一次'),
                        ])
                          ChoiceChip(
                            label: Text(t.$2),
                            selected: _hubTab == t.$1,
                            onSelected: (_) => setState(() => _hubTab = t.$1),
                          ),
                        TextButton(
                          onPressed: _busy ? null : _rebuildSchedule,
                          child: const Text('重排日历'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_hubTab == 'today')
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('今日跟进 · $_today', style: const TextStyle(fontWeight: FontWeight.bold)),
                      if (todayItems.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text('今天没有待办，可去大任务展开小步骤。'),
                        ),
                      ...todayItems.map((item) {
                        final done = item['done'] == true;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text('${item['title']}',
                              style: TextStyle(
                                decoration: done ? TextDecoration.lineThrough : null,
                              )),
                          subtitle: Text(
                            [
                              if ('${item['module_name'] ?? ''}'.isNotEmpty) '${item['module_name']}',
                              if ('${item['unit_name'] ?? ''}'.isNotEmpty) '${item['unit_name']}',
                              if ('${item['reminder'] ?? ''}'.isNotEmpty) '${item['reminder']}',
                            ].join(' · '),
                          ),
                          trailing: TextButton(
                            onPressed: _busy
                                ? null
                                : () => _completeSchedule(item, done: !done),
                            child: Text(done ? '撤销' : '完成'),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            if (_hubTab == 'modules')
              ...modules.map((mod) {
                final orders = ((mod['unit_orders'] as List?) ?? [])
                    .map((e) => int.tryParse('$e') ?? -1)
                    .toSet();
                final units = plan
                    .map((e) => Map<String, dynamic>.from(e as Map))
                    .where((u) {
                      final o = int.tryParse('${u['order']}') ?? 0;
                      final mo = int.tryParse('${u['module_order'] ?? ''}') ?? 0;
                      return orders.contains(o) ||
                          mo == (int.tryParse('${mod['order']}') ?? -1) ||
                          '${u['module_name']}' == '${mod['name']}';
                    })
                    .toList();
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('大任务 · ${mod['name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        if ('${mod['goal'] ?? ''}'.isNotEmpty)
                          Text('目标：${mod['goal']}', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
                        ...units.map((u) {
                          final order = int.tryParse('${u['order']}') ?? 0;
                          final open = _expandedUnit == order;
                          final steps = ((u['steps'] as List?) ?? [])
                              .whereType<Map>()
                              .map((e) => Map<String, dynamic>.from(e))
                              .toList();
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text('${u['unit_name']}'),
                                subtitle: Text('${u['status']} · ${u['focus'] ?? ''}'),
                                trailing: Icon(open ? Icons.expand_less : Icons.expand_more),
                                onTap: () => setState(() => _expandedUnit = open ? null : order),
                              ),
                              if (open) ...[
                                ...steps.map((s) {
                                  final done = '${s['status']}' == 'done';
                                  return ListTile(
                                    dense: true,
                                    contentPadding: const EdgeInsets.only(left: 8),
                                    title: Text('${s['title']}'),
                                    subtitle: Text('${s['detail'] ?? ''}'),
                                    trailing: TextButton(
                                      onPressed: _busy
                                          ? null
                                          : () => _completeStep(order, '${s['id']}', done: !done),
                                      child: Text(done ? '撤销' : '完成'),
                                    ),
                                  );
                                }),
                                Row(
                                  children: [
                                    TextButton(
                                      onPressed: () => _progress('${active['id']}', order, 'learning'),
                                      child: const Text('学习中'),
                                    ),
                                    TextButton(
                                      onPressed: () => _progress('${active['id']}', order, 'mastered'),
                                      child: const Text('整单元掌握'),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          );
                        }),
                      ],
                    ),
                  ),
                );
              }),
            if (_hubTab == 'calendar')
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('日历提醒（近两周）', style: TextStyle(fontWeight: FontWeight.bold)),
                      if (schedule.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text('暂无日程，可点「重排日历」'),
                        ),
                      ...schedule.take(20).map((item) {
                        final done = item['done'] == true;
                        return ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text('${item['date']} · ${item['title']}'),
                          subtitle: Text('${item['reminder'] ?? item['unit_name'] ?? ''}'),
                          trailing: TextButton(
                            onPressed: _busy ? null : () => _completeSchedule(item, done: !done),
                            child: Text(done ? '撤销' : '完成'),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            if (_hubTab == 'follow') ...[
              GtgtStepComposer(
                title: '复习 / 家默 / 考试',
                flowHint: tips['rhythm'] != null ? '本科目：${tips['rhythm']}' : '类型 → 单元 → 可选备注',
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
      ],
    );
  }
}
