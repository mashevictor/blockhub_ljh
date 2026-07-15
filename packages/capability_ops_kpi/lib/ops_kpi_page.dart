import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class OpsKpiPage extends StatefulWidget {
  const OpsKpiPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<OpsKpiPage> createState() => _OpsKpiPageState();
}

class _OpsKpiPageState extends State<OpsKpiPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  bool _nlBusy = false;
  bool _showManual = false;
  int _resetKey = 0;
  String _question = '';
  Map<String, dynamic>? _nlResult;
  String _msg = '';
  final Map<String, String> _values = {};
  final _qCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/ops-kpi';
  String get _apiRoot {
    final u = widget.branding.apiBaseUrl;
    if (u.endsWith('/ops-kpi')) return u.replaceAll('/ops-kpi', '');
    // apiBaseUrl is typically .../api/v1
    return u;
  }

  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _qCtrl.dispose();
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

  Future<void> _runNl(String text) async {
    final q = text.trim();
    if (q.isEmpty) return;
    setState(() {
      _nlBusy = true;
      _question = q;
      _msg = '';
    });
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>(
        '$_apiRoot/reports/nl-query',
        data: {'question': q},
      );
      _nlResult = resp.data;
    } catch (e) {
      _msg = '查数失败：$e';
      _nlResult = null;
    } finally {
      if (mounted) setState(() => _nlBusy = false);
    }
  }

  Future<void> _saveAsKpi() async {
    final answer = '${_nlResult?['answer'] ?? ''}';
    if (answer.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': 'query',
        'title': (_question).length > 80 ? _question.substring(0, 80) : _question,
        'period': '即时',
        'value': answer.length > 120 ? answer.substring(0, 120) : answer,
        'note': '由自然语言查数存入',
        'app_public_id': _appId,
      });
      _msg = '已存为指标';
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitManual() async {
    if ((_values['title'] ?? '').trim().isEmpty || (_values['value'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': 'kpi',
        'title': (_values['title'] ?? '').trim(),
        'period': (_values['period'] ?? '').trim(),
        'value': (_values['value'] ?? '').trim(),
        'note': '',
        'app_public_id': _appId,
      });
      _values.clear();
      _resetKey++;
      _showManual = false;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final cards = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => {'open', 'published'}.contains('${t['status']}'))
        .take(4)
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('经营指标', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (cards.isEmpty)
          const Text('暂无指标，用下面查数或补录')
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: cards
                .map(
                  (c) => SizedBox(
                    width: 150,
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${c['period'] ?? '周期未填'}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            Text('${c['title']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            const SizedBox(height: 6),
                            Text('${c['value'] ?? '—'}',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        const SizedBox(height: 16),
        Text('一句查数', style: Theme.of(context).textTheme.titleSmall),
        Wrap(
          spacing: 6,
          children: [
            for (final s in ['本月审批通过率？', '本周新增报销多少？', '哪个模块用得最多？'])
              ActionChip(label: Text(s, style: const TextStyle(fontSize: 12)), onPressed: () => _runNl(s)),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _qCtrl,
                decoration: const InputDecoration(hintText: '例如：本月报销合计多少？', isDense: true),
                onSubmitted: _runNl,
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: color),
              onPressed: _nlBusy ? null : () => _runNl(_qCtrl.text),
              child: Text(_nlBusy ? '…' : '查询'),
            ),
          ],
        ),
        if (_nlResult != null && '${_nlResult!['answer'] ?? ''}'.isNotEmpty) ...[
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${_nlResult!['question'] ?? _question}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text('${_nlResult!['answer']}'),
                  TextButton(onPressed: _busy ? null : _saveAsKpi, child: const Text('存为指标')),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 8),
        if (!_showManual)
          TextButton(onPressed: () => setState(() => _showManual = true), child: const Text('+ 手工补录指标'))
        else
          GtgtStepComposer(
            title: '补录指标',
            flowHint: '指标名 → 数值 → 周期',
            accent: color,
            steps: const [
              GtgtStep(key: 'title', label: '指标名', placeholder: '如：月营收'),
              GtgtStep(key: 'value', label: '数值', placeholder: '128.5万'),
              GtgtStep(key: 'period', label: '周期（可空）', optional: true),
            ],
            values: _values,
            onChanged: (k, v) => setState(() => _values[k] = v),
            onComplete: _submitManual,
            busy: _busy,
            resetKey: _resetKey,
            submitLabel: '保存指标',
          ),
        if (_msg.isNotEmpty) Text(_msg),
      ],
    );
  }
}
