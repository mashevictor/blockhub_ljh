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
  final Map<String, String> _values = {'role': 'student'};
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
    } catch (_) {
      _courses = [];
      _drills = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitCourse() async {
    if ((_values['textbook_name'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>('$_base/courses', data: {
        'role': _values['role'] ?? 'student',
        'textbook_name': (_values['textbook_name'] ?? '').trim(),
        'subject': (_values['subject'] ?? '').trim(),
        'grade': (_values['grade'] ?? '').trim(),
        'student_name': (_values['student_name'] ?? '').trim(),
        'app_public_id': _appId,
      });
      final course = resp.data?['course'] as Map<String, dynamic>?;
      _values
        ..clear()
        ..['role'] = 'student';
      _resetKey++;
      if (course != null) _activeId = '${course['id']}';
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
        'score': (_drillValues['score'] ?? '').trim(),
        'result': (_drillValues['result'] ?? '').trim(),
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
        GtgtStepComposer(
          title: '课本学习',
          flowHint: '角色 → 课本定位(沪教版/五四制/年级下) → DeepSeek 目录',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'role',
              label: '角色',
              choices: [
                (value: 'student', label: '学生'),
                (value: 'parent', label: '家长'),
                (value: 'teacher', label: '老师'),
              ],
            ),
            GtgtStep(key: 'textbook_name', label: '课本定位', placeholder: '沪教版英语五四制·小学二年级下'),
            GtgtStep(key: 'subject', label: '科目（可空）', placeholder: '英语', optional: true),
            GtgtStep(key: 'grade', label: '年级册次（可空）', placeholder: '小学二年级下', optional: true),
            GtgtStep(key: 'student_name', label: '学生姓名', optional: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submitCourse,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '定位课本并生成规划',
        ),
        const SizedBox(height: 12),
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
                    Text('${active['record_no']} · ${active['textbook_name']}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('进度 ${active['progress_pct']}% · ${active['plan_source']}'),
                    if (active['catalog'] is Map) ...[
                      const SizedBox(height: 4),
                      Text(
                        [
                          if ((active['catalog'] as Map)['publisher'] != null)
                            '${(active['catalog'] as Map)['publisher']}',
                          if ((active['catalog'] as Map)['school_system'] != null)
                            '${(active['catalog'] as Map)['school_system']}',
                          if ((active['catalog'] as Map)['grade'] != null)
                            '${(active['catalog'] as Map)['grade']}',
                          if ((active['catalog'] as Map)['semester'] != null)
                            '${(active['catalog'] as Map)['semester']}',
                          if ((active['catalog'] as Map)['confidence'] != null)
                            '置信度 ${((active['catalog'] as Map)['confidence'] is num) ? (((active['catalog'] as Map)['confidence'] as num) * 100).round() : active['catalog']['confidence']}%',
                        ].where((e) => e.trim().isNotEmpty).join(' · '),
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
              flowHint: '类型 → 单元 → 结果',
              accent: color,
              steps: [
                const GtgtStep(
                  key: 'kind',
                  label: '跟进类型',
                  choices: [
                    (value: 'dictation', label: '家默'),
                    (value: 'review', label: '复习'),
                    (value: 'exam', label: '考试'),
                  ],
                ),
                GtgtStep(
                  key: 'unit_name',
                  label: '学习单元',
                  placeholder: unitNames.isEmpty ? '第一单元' : unitNames.first,
                  choices: unitNames.isEmpty
                      ? null
                      : unitNames
                          .map((n) => (value: n, label: n.length > 18 ? '${n.substring(0, 18)}…' : n))
                          .toList(),
                ),
                const GtgtStep(key: 'score', label: '得分/题量', optional: true),
                const GtgtStep(
                  key: 'result',
                  label: '结果',
                  optional: true,
                  choices: [
                    (value: 'pass', label: '通过'),
                    (value: 'partial', label: '部分'),
                    (value: 'fail', label: '需巩固'),
                  ],
                ),
                const GtgtStep(key: 'notes', label: '备注', optional: true, multiline: true),
              ],
              values: {
                'kind': _drillValues['kind'] ?? 'dictation',
                'unit_name': _drillValues['unit_name'] ?? (unitNames.isEmpty ? '' : unitNames.first),
                'score': _drillValues['score'] ?? '',
                'result': _drillValues['result'] ?? '',
                'notes': _drillValues['notes'] ?? '',
              },
              onChanged: (k, v) => setState(() => _drillValues[k] = v),
              onComplete: _submitDrill,
              busy: _busy,
              resetKey: _drillResetKey,
              submitLabel: '记录跟进',
            ),
            const SizedBox(height: 12),
            ...courseDrills.map((raw) {
              final d = Map<String, dynamic>.from(raw as Map);
              return Card(
                child: ListTile(
                  title: Text('${d['record_no']} · ${d['kind']}'),
                  subtitle: Text('${d['unit_name']} · ${d['result'] ?? d['score'] ?? ''}'),
                ),
              );
            }),
          ],
        ],
      ],
    );
  }
}
